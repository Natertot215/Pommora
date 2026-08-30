// The one place in the app that deliberately reads inside an excluded folder — every other
// enumerator prunes them. The Agenda layer stays out: a folder carrying a Task or Event config is
// skipped whole.

import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { parseGovernedKey } from '@shared/governedKeys'
import { KIND_ID_KEY } from '@shared/identity'
import { ok, type Result } from '@shared/result'
import type { ClearReport } from '@shared/types'
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

// Governance is by shape: a malformed, unclosed key is not `<…>`-shaped, so it is left untouched.
function clearRewrite(preserveProperties: boolean): RewriteText {
  return (content) => {
    const keys = Object.keys(readFrontmatterFields(content))
    const governed = keys.flatMap((k) => {
      const parsed = parseGovernedKey(k)
      return parsed ? [{ key: k, name: parsed.name }] : []
    })
    const identity = keys.filter((k) => IDENTITY_KEYS.includes(k))
    let text = content
    if (preserveProperties) {
      for (const { key, name } of governed) {
        const renamed = renameFrontmatterKey(text, key, name, 'prefer-new')
        if (renamed !== null) text = renamed
      }
    }
    const remove = preserveProperties ? identity : [...identity, ...governed.map((g) => g.key)]
    if (remove.length > 0) text = mergeFrontmatter(text, {}, remove, splitEnvelope(text).body)
    return text === content ? null : text
  }
}

export function clearConfirmCopy(
  folderCount: number,
  preserveProperties: boolean,
): { message: string; detail: string } {
  const folders = folderCount === 1 ? 'the excluded folder' : `${folderCount} excluded folders`
  return {
    message: `Clear Pommora’s data from ${folders}?`,
    detail: preserveProperties
      ? 'Pommora’s container files are removed and each page’s identity key is dropped; the property and Context values a page holds are kept as ordinary frontmatter. This cannot be undone.'
      : 'Pommora’s container files are removed and each page’s identity key and property values are deleted outright. This cannot be undone.',
  }
}

export async function clearExclusionData(
  root: string,
  excluded: string[],
  assetDir: string,
  preserveProperties: boolean,
): Promise<Result<ClearReport>> {
  const { pages, sidecars } = await excludedArtifacts(root, excluded, assetDir)
  // Best-effort: a sidecar that won't delete (locked, permission-denied, a sync placeholder) is
  // skipped so the page sweep still runs, rather than aborting the whole pass mid-way.
  let removed = 0
  for (const sidecar of sidecars) {
    const gone = await rm(sidecar, { force: true }).then(
      () => true,
      () => false,
    )
    if (gone) removed++
  }
  const swept = await sweepGovernedRoots(root, { kind: 'files', files: pages }, () => null, {
    rewriteText: clearRewrite(preserveProperties),
  })
  return ok({ pages: swept.touched.length, sidecars: removed, refused: swept.refused.length })
}
