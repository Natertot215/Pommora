import {
  parseJsonText,
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
import { isPlainObject } from './propertyValue'

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
      if ('text' in plan) {
        const next = plan.text(content, file)
        if (next === null) return
        await rewritePreservingTimes(file, next)
        out.touched.set(file, content)
        noteValueWrite(root, file)
        await indexWrittenPage(root, file)
        return
      }
      const raw = splitFrontmatter(content)
      const next = plan.raw(raw, file)
      if (next === null) return
      const keys = changedKeys(raw, next)
      if (!keys.length) return
      const modeled: Raw = {}
      for (const k of keys) if (k in next) modeled[k] = next[k]
      await rewritePreservingTimes(
        file,
        mergeFrontmatter(content, modeled, keys, splitEnvelope(content).body),
      )
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
        const raw = text === null ? null : parseJsonText(text)
        if (text === null || !isPlainObject(raw)) {
          out.skipped.push(file)
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
