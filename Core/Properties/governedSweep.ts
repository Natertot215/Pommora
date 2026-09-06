import { join } from '../Locations/posix'
import {
  readJsonObject,
  readTextOrNull,
  rewritePreservingTimes,
  writeJson,
} from '../IO/atomicWrite'
import { machine } from '../Platform/machine'
import { noteValueWrite } from '../Nexus/valuesChanged'
import { indexWrittenPage, nexusCorpus } from '../Index/indexSeed'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { listFilesRecursive } from '../IO/walk'
import { contextsDir, SPACE_SIDECAR } from '../Locations/paths'
import { splitFrontmatter } from '../Nexus/readNexus'
import { sweepAdmits } from '../Nexus/util'

export type Raw = Record<string, unknown>

export type SweepScope = { kind: 'nexus' } | { kind: 'files'; files: string[] }

export interface SweepResult<C> {
  touched: string[]
  skipped: string[]
  refused: string[]
  captured: C[]
}

export type Rewrite<C> = (raw: Raw, file: string) => { next: Raw; capture?: C } | null

export type RewriteText = (content: string, file: string) => string | null

/** Pages are swept as raw frontmatter or as whole text, never both; only the text arm hands the
 *  sidecars a rewriter of their own, since a raw sweep already serves them. */
export type SweepPlan<C> = { raw: Rewrite<C> } | { text: RewriteText; sidecars?: Rewrite<C> }

const changedKeys = (raw: Raw, next: Raw): string[] =>
  [...new Set([...Object.keys(raw), ...Object.keys(next)])].filter(
    (k) => JSON.stringify(raw[k]) !== JSON.stringify(next[k]),
  )

async function pageRoots(root: string, scope: SweepScope): Promise<string[]> {
  switch (scope.kind) {
    case 'nexus':
      return (await nexusCorpus(root)).map((rel) => join(root, rel))
    case 'files':
      return scope.files
    default: {
      const _exhaustive: never = scope
      return _exhaustive
    }
  }
}

// Only a nexus-wide sweep reaches sidecars — no schema governs a Space.
const sidecarRoots = (root: string, scope: SweepScope): Promise<string[]> =>
  scope.kind === 'nexus'
    ? listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])
    : Promise.resolve([])

export async function sweepGovernedRoots<C>(
  root: string,
  scope: SweepScope,
  plan: SweepPlan<C>,
): Promise<SweepResult<C>> {
  const out: SweepResult<C> = { touched: [], skipped: [], refused: [], captured: [] }

  for (const file of await pageRoots(root, scope)) {
    await machine().lock(file, async () => {
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
        noteValueWrite(root, file)
        await indexWrittenPage(root, file)
        out.touched.push(file)
        return
      }
      const raw = splitFrontmatter(content)
      const decided = plan.raw(raw, file)
      if (decided === null) return
      const keys = changedKeys(raw, decided.next)
      if (!keys.length) return
      const modeled: Raw = {}
      for (const k of keys) if (k in decided.next) modeled[k] = decided.next[k]
      await rewritePreservingTimes(
        file,
        mergeFrontmatter(content, modeled, keys, splitEnvelope(content).body),
      )
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
      if (decided.capture !== undefined) out.captured.push(decided.capture)
      out.touched.push(file)
    })
  }

  const sidecars = 'raw' in plan ? plan.raw : plan.sidecars
  if (sidecars)
    for (const file of await sidecarRoots(root, scope)) {
      await machine().lock(file, async () => {
        const raw = await readJsonObject(file)
        if (!raw) {
          out.skipped.push(file)
          return
        }
        const decided = sidecars(raw, file)
        if (decided === null) return
        await writeJson(file, decided.next)
        if (decided.capture !== undefined) out.captured.push(decided.capture)
        out.touched.push(file)
      })
    }
  return out
}
