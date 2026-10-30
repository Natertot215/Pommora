import { basename, join, isMarkdownFile, relDirname } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { parseContextKey } from '../Contexts/contexts'
import { ID_KEY } from '../Nexus/identityMark'
import { asString } from '../Nexus/coerce'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { fault, ok, type Result } from '../Contract/result'
import { type Rewrite, sweepGovernedRoots } from '../Nexus/governedSweep'
import { sweptReach } from '../Nexus/configReach'
import { reachReport, retries } from '../Nexus/owed'
import { stripKeys } from '../Files/rootValues'
import {
  excludedMatcher,
  outsideContent,
  reachingExcluded,
  rootSegs,
  type WatchScope,
} from '../Paths/exclusion'
import { listPathsUnder } from '../Files/walk'
import { hiddenFolder, SIDECAR_FILENAME } from '../Paths/nexusPaths'

export interface ClearReport {
  pages: number
  sidecars: number
}

const CONTAINER_SIDECARS: readonly string[] = [SIDECAR_FILENAME.collection, SIDECAR_FILENAME.set]
const AGENDA_CONFIGS: readonly string[] = [SIDECAR_FILENAME.tasks, SIDECAR_FILENAME.events]
const BOOKKEEPING_KEYS: readonly string[] = [ID_KEY]

export async function excludedArtifacts(
  root: string,
  scope: WatchScope,
): Promise<{ pages: string[]; sidecars: string[] }> {
  const { excluded } = scope
  const reach = reachingExcluded(scope)
  const covered = excludedMatcher(excluded)
  const pages: string[] = []
  const sidecars: string[] = []
  for (const folder of excluded) {
    const segs = rootSegs(folder)
    if (segs.some(hiddenFolder) || covered(segs.slice(0, -1))) continue
    const rels = await listPathsUnder(root, join(root, ...segs), (rel, kind, siblings) => {
      if (AGENDA_CONFIGS.some((name) => siblings.has(name))) return false
      if (kind === 'file' && CONTAINER_SIDECARS.includes(basename(rel)))
        return !outsideContent(relDirname(rel), reach)
      return !outsideContent(rel, reach) && (kind === 'dir' || isMarkdownFile(rel))
    })
    for (const rel of rels) (isMarkdownFile(rel) ? pages : sidecars).push(join(root, rel))
  }
  return { pages, sidecars }
}

const clearRewrite =
  (cleared: Map<string, string>): Rewrite =>
  (raw, file) => {
    const id = asString(raw[ID_KEY])
    const next = stripKeys(
      raw,
      Object.keys(raw).filter((k) => BOOKKEEPING_KEYS.includes(k) || parseContextKey(k) !== null),
    )
    if (next !== null && id) cleared.set(file, id)
    return next
  }

export async function clearExclusionData(
  root: string,
  scope: WatchScope,
): Promise<Result<ClearReport>> {
  const { pages, sidecars } = await excludedArtifacts(root, scope)
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
  const cleared = new Map<string, string>()
  const swept = await sweepGovernedRoots(pages, { raw: clearRewrite(cleared) })
  const ids = [...swept.touched.keys()].flatMap((file) => cleared.get(file) ?? [])
  await dropPageMetadata(root, ids)
  const reach = sweptReach(swept)
  if (retries(reach)) return fault(reachReport(reach).warning)
  return ok({ pages: swept.touched.size, sidecars: removed })
}
