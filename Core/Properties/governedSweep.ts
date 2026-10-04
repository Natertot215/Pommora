import {
  atomicWriteFile,
  jsonText,
  parseJsonObject,
  readTextOrNull,
  rewritePreservingTimes,
} from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { isMarkdownFile, join } from '../Paths/posix'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import type { EntityRecord } from '../Nexus/record'
import { splitFrontmatter, sweepParse, type SweptPage } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { spaceSidecars } from '../Contexts/spaceSidecar'
import { heldKeys } from '../Files/heldKeys'

export interface SweepResult {
  /** Each file the sweep wrote, with the text it held before the write and the text the write left. */
  touched: Map<string, { before: string; after: string }>
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

/** Removes every spelling of `name` a root holds; a root holding none is left as it is. */
export const stripHeld =
  (name: string): Rewrite =>
  (raw, file) =>
    stripKeys(...heldKeys(raw, name))(raw, file)

export const unsweptLine = (count: number, what = ''): string =>
  `Couldn’t update ${what}${count} ${count === 1 ? 'file' : 'files'}.`

/** The root a governed file holds: a page's frontmatter, or a Space sidecar's object. */
export const governedRoot = (file: string, text: string): Json =>
  isMarkdownFile(file) ? splitFrontmatter(text) : (parseJsonObject(text) ?? {})

// A file whose lock or write throws costs only itself, so the files after it are still reached.
const guarded = (file: string, missed: string[], body: () => Promise<void>): Promise<void> =>
  machine()
    .lock(file, body)
    .catch(() => void missed.push(file))

export const changedKeys = (raw: Json, next: Json): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

function rewriteRaw(rewrite: Rewrite, page: SweptPage, file: string): string | null {
  const next = rewrite(page.raw, file)
  if (next === null) return null
  const keys = changedKeys(page.raw, next)
  if (!keys.length) return null
  const modeled: Json = {}
  for (const k of keys) if (k in next) modeled[k] = next[k]
  return page.merge(modeled, keys)
}

/** Files are absolute; a sidecar rewrite in the plan reaches every Space sidecar, which no index names. */
export async function sweepGovernedRoots(
  root: string,
  files: string[],
  plan: SweepPlan,
): Promise<SweepResult> {
  const out: SweepResult = { touched: new Map(), skipped: [], refused: [] }

  for (const file of files) {
    await guarded(file, out.skipped, async () => {
      const content = await readTextOrNull(file)
      if (content === null) {
        out.skipped.push(file)
        return
      }
      // An Unknown file, or one whose frontmatter cannot round-trip, is left byte-identical.
      const page = sweepParse(content)
      if (!page) {
        out.refused.push(file)
        return
      }
      const next = 'text' in plan ? plan.text(content, file) : rewriteRaw(plan.raw, page, file)
      if (next === null) return
      await rewritePreservingTimes(file, next)
      out.touched.set(file, { before: content, after: next })
    })
  }

  const sidecars = plan.sidecars
  if (sidecars)
    for (const file of await spaceSidecars(root)) {
      await guarded(file, out.skipped, async () => {
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
        const after = jsonText(next)
        await atomicWriteFile(file, after)
        out.touched.set(file, { before: text, after })
      })
    }
  return out
}

/** Returns the keys a sweep changed to what they held, each file whole while it still holds the sweep's write, so a write since to any other key or to the body is kept; answers the files it couldn't put back. */
export async function undoSweep(touched: SweepResult['touched']): Promise<string[]> {
  const missed: string[] = []
  for (const [file, { before, after }] of touched)
    await guarded(file, missed, async () => {
      const now = await readTextOrNull(file)
      if (now === null) return
      const back = now === after ? before : keysPutBack(file, now, before, after)
      if (back !== null) await rewritePreservingTimes(file, back)
    })
  return missed
}

function keysPutBack(file: string, now: string, before: string, after: string): string | null {
  const was = governedRoot(file, before)
  const keys = changedKeys(was, governedRoot(file, after))
  const putBack: Rewrite = (raw) => {
    const next = { ...raw }
    for (const k of keys) {
      if (k in was) next[k] = was[k]
      else delete next[k]
    }
    return next
  }
  if (isMarkdownFile(file)) {
    const page = sweepParse(now)
    if (!page) throw new Error('The page no longer admits a sweep.')
    return rewriteRaw(putBack, page, file)
  }
  const raw = parseJsonObject(now)
  if (!raw) throw new Error('The sidecar no longer parses.')
  return jsonText(putBack(raw, file))
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
