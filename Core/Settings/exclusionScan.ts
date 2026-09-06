// The one place in the app that deliberately reads inside an excluded folder — every other enumerator prunes them.

import { join } from '../Locations/posix'
import { machine } from '../Platform/machine'
import { parseContextKey } from '../Properties/contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { ok, type Result } from '../Contract/result'
import type { ClearReport } from '../Trash/trashRow'
import { sweepGovernedRoots, type RewriteText } from '../Properties/governedSweep'
import { assetMatcher, rootSegs } from '../Locations/exclusion'
import { isMarkdownFile, listEntries } from '../IO/walk'
import { mergeFrontmatter, readFrontmatterFields, splitEnvelope } from '../IO/pageFile'
import { SIDECAR_FILENAME } from '../Locations/paths'

const CONTAINER_SIDECARS: readonly string[] = [SIDECAR_FILENAME.collection, SIDECAR_FILENAME.set]
const AGENDA_CONFIGS: readonly string[] = [
  SIDECAR_FILENAME.taskConfig,
  SIDECAR_FILENAME.eventConfig,
]
const BOOKKEEPING_KEYS: readonly string[] = [ID_KEY]

export async function excludedArtifacts(
  root: string,
  excluded: string[],
  assetDir: string,
): Promise<{ pages: string[]; sidecars: string[] }> {
  const isAsset = assetMatcher(assetDir)
  const pages: string[] = []
  const sidecars: string[] = []

  const walk = async (absDir: string, segs: string[]): Promise<void> => {
    const entries = await listEntries(absDir)
    if (entries.some((e) => e.kind === 'file' && AGENDA_CONFIGS.includes(e.name))) return
    for (const e of entries) {
      const next = [...segs, e.name]
      if (isAsset(next)) continue
      if (e.kind === 'dir') {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        await walk(join(absDir, e.name), next)
      } else if (isMarkdownFile(e.name)) {
        pages.push(join(absDir, e.name))
      } else if (CONTAINER_SIDECARS.includes(e.name)) {
        sidecars.push(join(absDir, e.name))
      }
    }
  }

  const seen = new Set<string>()
  for (const folder of excluded) {
    const segs = rootSegs(folder)
    const abs = join(root, ...segs)
    if (seen.has(abs)) continue
    seen.add(abs)
    await walk(abs, segs)
  }
  return { pages, sidecars }
}

const clearRewrite: RewriteText = (content) => {
  const keys = Object.keys(readFrontmatterFields(content))
  const remove = keys.filter((k) => BOOKKEEPING_KEYS.includes(k) || parseContextKey(k) !== null)
  if (remove.length === 0) return null
  return mergeFrontmatter(content, {}, remove, splitEnvelope(content).body)
}

export async function clearExclusionData(
  root: string,
  excluded: string[],
  assetDir: string,
): Promise<Result<ClearReport>> {
  const { pages, sidecars } = await excludedArtifacts(root, excluded, assetDir)
  // Best-effort: a sidecar that won't delete is skipped so the page sweep still runs, rather than aborting the whole pass mid-way.
  let removed = 0
  for (const sidecar of sidecars) {
    const gone = await machine()
      .remove(sidecar)
      .then(
        () => true,
        () => false,
      )
    if (gone) removed++
  }
  const scope = { kind: 'files', files: pages } as const
  const swept = await sweepGovernedRoots(root, scope, { text: clearRewrite })
  return ok({ pages: swept.touched.length, sidecars: removed, refused: swept.refused.length })
}
