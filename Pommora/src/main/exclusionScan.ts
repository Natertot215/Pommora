// The one place in the app that deliberately reads inside an excluded folder. Every other
// enumerator prunes exclusions; Clear reaches past them to scrub what Pommora wrote, so that
// exception lives here alone. The Agenda layer is out of scope: a folder carrying a Task or Event
// config is skipped whole, configs and pages alike.

import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { parseGovernedKey } from '@shared/governedKeys'
import { KIND_ID_KEY } from '@shared/identity'
import { ok, type Result } from '@shared/result'
import { sweepGovernedRoots, type RewriteText } from './CRUD/governedSweep'
import { assetMatcher, rootSegs } from './exclusion'
import { isMarkdownFile, listEntries } from './IO/walk'
import {
  mergeFrontmatter,
  readFrontmatterFields,
  renameFrontmatterKey,
  splitEnvelope,
} from './IO/pageFile'
import { SIDECAR_FILENAME } from './paths'

const CONTAINER_SIDECARS: readonly string[] = [SIDECAR_FILENAME.collection, SIDECAR_FILENAME.set]
const AGENDA_CONFIGS: readonly string[] = [
  SIDECAR_FILENAME.taskConfig,
  SIDECAR_FILENAME.eventConfig,
]
const IDENTITY_KEYS: readonly string[] = Object.values(KIND_ID_KEY)

/** Every page and container sidecar under the excluded folders — the reach Clear rewrites. Steps
 *  around the asset root even when it is itself excluded, skips `.`-dirs and `node_modules`, and
 *  skips an Agenda-config folder whole so no Task or Event file ever enters the list. */
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
    if (entries.some((e) => e.isFile() && AGENDA_CONFIGS.includes(e.name))) return
    for (const e of entries) {
      const next = [...segs, e.name]
      if (isAsset(next)) continue
      if (e.isDirectory()) {
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

/** A page decision as text: unwrap `<>`/`()` keys to bare frontmatter (or drop them), and always
 *  drop the identity key. Governance is by shape — a malformed, unclosed key is not `<…>`-shaped,
 *  so `parseGovernedKey` returns null and it is left exactly as it was. */
function clearRewrite(preserveProperties: boolean): RewriteText {
  return (content) => {
    const keys = Object.keys(readFrontmatterFields(content))
    const governed = keys.filter((k) => parseGovernedKey(k) !== null)
    const identity = keys.filter((k) => IDENTITY_KEYS.includes(k))
    let text = content
    if (preserveProperties) {
      for (const k of governed) {
        const parsed = parseGovernedKey(k)
        if (!parsed) continue
        const renamed = renameFrontmatterKey(text, k, parsed.name, 'prefer-new')
        if (renamed !== null) text = renamed
      }
    }
    const remove = preserveProperties ? identity : [...identity, ...governed]
    if (remove.length > 0) text = mergeFrontmatter(text, {}, remove, splitEnvelope(text).body)
    return text === content ? null : text
  }
}

/** Remove Pommora's bookkeeping from every excluded folder: delete the container sidecars, and
 *  strip each page's identity key and — unless Preserve Properties is on — its property and
 *  Context values, unwrapping them to plain frontmatter otherwise. A page the sweep cannot admit
 *  is left byte-identical and counted as refused rather than scrubbed. */
export async function clearExclusionData(
  root: string,
  excluded: string[],
  assetDir: string,
  preserveProperties: boolean,
): Promise<Result<{ pages: number; sidecars: number; refused: number }>> {
  const { pages, sidecars } = await excludedArtifacts(root, excluded, assetDir)
  for (const sidecar of sidecars) await rm(sidecar, { force: true })
  const swept = await sweepGovernedRoots(root, { kind: 'files', files: pages }, () => null, {
    rewriteText: clearRewrite(preserveProperties),
  })
  return ok({
    pages: swept.touched.length,
    sidecars: sidecars.length,
    refused: swept.refused.length,
  })
}
