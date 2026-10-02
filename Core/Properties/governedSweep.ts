import {
  parseJsonObject,
  readTextOrNull,
  rewritePreservingTimes,
  writeJson,
} from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { join } from '../Paths/posix'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import type { EntityRecord } from '../Nexus/record'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter, sweepAdmits } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { spaceSidecars } from '../Contexts/spaceSidecar'

export interface SweepResult {
  /** Each file the sweep wrote, with the text it held before the write. */
  touched: Map<string, string>
  skipped: string[]
  refused: string[]
}

export type Rewrite = (raw: Json, file: string) => Json | null

export type RewriteText = (content: string, file: string) => string | null

type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }

/** Removes `keys` from a root holding any of them; a root holding none is left as it is. */
export const stripKeys =
  (...keys: string[]): Rewrite =>
  (raw) =>
    keys.some((k) => k in raw)
      ? Object.fromEntries(Object.entries(raw).filter(([k]) => !keys.includes(k)))
      : null

export const unsweptLine = (count: number, what = ''): string =>
  `Couldn’t update ${what}${count} ${count === 1 ? 'file' : 'files'}.`

const changedKeys = (raw: Json, next: Json): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

function rewriteRaw(rewrite: Rewrite, content: string, file: string): string | null {
  const raw = splitFrontmatter(content)
  const next = rewrite(raw, file)
  if (next === null) return null
  const keys = changedKeys(raw, next)
  if (!keys.length) return null
  const modeled: Json = {}
  for (const k of keys) if (k in next) modeled[k] = next[k]
  return mergeFrontmatter(content, modeled, keys, splitEnvelope(content).body)
}

/** Files are absolute; a sidecar rewrite in the plan reaches every Space sidecar, which no index names. */
export async function sweepGovernedRoots(
  root: string,
  files: string[],
  plan: SweepPlan,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }
  const guarded = (file: string, body: () => Promise<void>): Promise<void> =>
    machine()
      .lock(file, body)
      .catch(() => {
        if (!out.touched.has(file)) out.skipped.push(file)
      })

  for (const file of files) {
    await guarded(file, async () => {
      const content = await readTextOrNull(file)
      if (content === null) {
        out.skipped.push(file)
        return
      }
      // An Unknown file, or one whose frontmatter cannot round-trip, is left byte-identical.
      if (!sweepAdmits(content)) {
        out.refused.push(file)
        return
      }
      const next = 'text' in plan ? plan.text(content, file) : rewriteRaw(plan.raw, content, file)
      if (next === null) return
      await rewritePreservingTimes(file, next)
      out.touched.set(file, content)
    })
  }

  const sidecars = plan.sidecars
  if (sidecars)
    for (const file of await spaceSidecars(root)) {
      await guarded(file, async () => {
        const text = await readTextOrNull(file)
        if (text === null) {
          out.skipped.push(file)
          return
        }
        // A sidecar nobody can parse won't read any better on a retry, so it's left byte-identical the way an unparseable page is.
        const raw = parseJsonObject(text)
        if (!raw) {
          out.refused.push(file)
          return
        }
        const next = sidecars(raw, file)
        if (next === null) return
        await writeJson(file, next)
        out.touched.set(file, text)
      })
    }
  return out
}

/** Rewrites each page or Space whose ID is in `values` — found where `roots` places it, matched by the ID it carries — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
export async function sweepRootsById<T>(
  root: string,
  roots: Record<string, EntityRecord>,
  values: Record<string, T>,
  rewrite: (raw: Json, value: T) => Json | null,
): Promise<Set<string>> {
  const asked = new Map<string, string>()
  const byId =
    (idKey: string): Rewrite =>
    (raw, file) => {
      const id = asString(raw[idKey])
      if (id === undefined || !Object.hasOwn(values, id)) return null
      const next = rewrite(raw, values[id])
      if (next !== null) asked.set(file, id)
      return next
    }
  const ids = Object.keys(values)
  const pages = ids.flatMap((id) => (roots[id]?.kind === 'page' ? join(root, roots[id].path) : []))
  const { skipped } = await sweepGovernedRoots(root, pages, {
    raw: byId(ID_KEY),
    ...(ids.some((id) => roots[id]?.kind === 'space') ? { sidecars: byId('id') } : {}),
  })
  for (const file of skipped) asked.delete(file)
  return new Set(asked.values())
}
