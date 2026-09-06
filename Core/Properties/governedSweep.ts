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
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../IO/pageFile'
import { listFilesRecursive } from '../IO/walk'
import { contextsDir, SPACE_SIDECAR } from '../Locations/paths'

import { sweepAdmits } from '../Nexus/util'

export type Raw = Record<string, unknown>

type SweepScope = { kind: 'nexus' } | { kind: 'files'; files: string[] }

export interface SweepResult {
  touched: string[]
  skipped: string[]
  refused: string[]
}

export type Rewrite = (raw: Raw, file: string) => Raw | null

export type RewriteText = (content: string, file: string) => string | null

type SweepPlan = { raw: Rewrite } | { text: RewriteText; sidecars?: Rewrite }

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

export async function sweepGovernedRoots(
  root: string,
  scope: SweepScope,
  plan: SweepPlan,
): Promise<SweepResult> {
  const out: SweepResult = { touched: [], skipped: [], refused: [] }

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
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
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
        const next = sidecars(raw, file)
        if (next === null) return
        await writeJson(file, next)
        out.touched.push(file)
      })
    }
  return out
}
