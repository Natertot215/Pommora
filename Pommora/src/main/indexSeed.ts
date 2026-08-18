// The open-time seed: bring the content index to agreement with the corpus, reading only files
// whose (mtime, size) moved since they were last indexed. The honest cost is one full-corpus
// read EVER per database; every later open is a stat sweep. Admission is the sweeps' own —
// a file they would skip gets no rows, only a stat entry so it isn't re-read forever.

import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isGovernedKey } from '@shared/governedKeys'
import { errText } from '@shared/result'
import { asStringArray } from './coerce'
import { extractMentions } from './connections/scan'
import { sweepAdmitsBody } from './crud/util'
import {
  readIndexedStats,
  reconcileIndex,
  upsertPageIndex,
  type PageIndexEntry,
} from './db/contentIndex'
import { readJsonObject } from './io/atomicWrite'
import { splitEnvelope } from './io/pageFile'
import { corpusFiles } from './io/walk'
import { nexusConfig, NEXUS_CONFIG_FILES } from './paths'
import { splitFrontmatter } from './readNexus'

/** A page's index rows, from its raw content. Null = the sweeps would skip it (Unknown
 *  admission), so the index holds nothing for it either. */
export function extractPageIndex(content: string): PageIndexEntry | null {
  if (!sweepAdmitsBody(content)) return null
  const values: Record<string, unknown> = {}
  const fm = splitFrontmatter(content) as Record<string, unknown>
  for (const [key, value] of Object.entries(fm)) {
    if (isGovernedKey(key, 'property')) values[key] = value
  }
  return { mentions: [...extractMentions(splitEnvelope(content).body)], values }
}

/** Seed/reconcile the open nexus's index. Stands down when there is no index to write (null Db,
 *  or tables that never landed); never throws — a failed seed costs queries, not the open. */
export async function seedContentIndex(root: string): Promise<void> {
  const indexed = readIndexedStats()
  if (!indexed) return
  try {
    const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
    const excluded = asStringArray(settings.excluded_folders) ?? []
    const rels = await corpusFiles(root, excluded)
    const seen = new Set(rels)
    for (const rel of rels) {
      let st: Awaited<ReturnType<typeof stat>>
      let content: string
      try {
        st = await stat(join(root, rel))
        const prior = indexed.get(rel)
        if (prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
        content = await readFile(join(root, rel), 'utf8')
      } catch {
        // Vanished mid-seed — let the reconcile prune its rows rather than trusting stale ones.
        seen.delete(rel)
        continue
      }
      const entry = extractPageIndex(content) ?? { mentions: [], values: {} }
      upsertPageIndex(rel, entry, { mtimeMs: st.mtimeMs, size: st.size })
    }
    reconcileIndex(seen)
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
  }
}
