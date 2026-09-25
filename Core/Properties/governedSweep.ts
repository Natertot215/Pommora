import {
  parseJsonObject,
  readTextOrNull,
  rewritePreservingTimes,
  writeJson,
} from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { noteSidecarWrite, noteValueWrite } from '../Nexus/valuesChanged'
import { dirname } from '../Paths/posix'
import { indexWrittenPage } from '../Index/indexSeed'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { listFilesRecursive } from '../Files/walk'
import { contextsDir } from '../Paths/paths'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { sweepAdmits } from '../Files/pageFile'

export type Raw = Record<string, unknown>

export interface SweepResult {
  /** Each file the sweep wrote, with the text it held before the write. */
  touched: Map<string, string>
  skipped: string[]
  refused: string[]
}

export type Rewrite = (raw: Raw, file: string) => Raw | null

export type RewriteText = (content: string, file: string) => string | null

type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }

export const unsweptLine = (count: number, what = ''): string =>
  `Couldn’t update ${what}${count} ${count === 1 ? 'file' : 'files'}.`

const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

function rewriteRaw(rewrite: Rewrite, content: string, file: string): string | null {
  const raw = splitFrontmatter(content)
  const next = rewrite(raw, file)
  if (next === null) return null
  const keys = changedKeys(raw, next)
  if (!keys.length) return null
  const modeled: Raw = {}
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
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
    })
  }

  const sidecars = plan.sidecars
  if (sidecars)
    for (const file of await listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])) {
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
        noteSidecarWrite(dirname(file))
      })
    }
  return out
}
