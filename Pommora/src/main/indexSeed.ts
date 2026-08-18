// The open-time seed: bring the content index to agreement with the corpus, reading only files
// whose (mtime, size) moved since they were last indexed. The honest cost is one full-corpus
// read EVER per database; every later open is a stat sweep. Admission is the sweeps' own —
// a file they would skip gets no rows, only a stat entry so it isn't re-read forever.

import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { isGovernedKey } from '@shared/governedKeys'
import { errText } from '@shared/result'
import { asStringArray } from './coerce'
import { extractMentions } from './connections/scan'
import { sweepAdmitsBody } from './crud/util'
import {
  readIndexedStats,
  reconcileIndex,
  removePathIndex,
  removePathPrefixIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndex,
  type PageIndexEntry,
} from './db/contentIndex'
import { readJsonObject } from './io/atomicWrite'
import { splitEnvelope } from './io/pageFile'
import { corpusFiles, isMarkdownFile } from './io/walk'
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

/** Nexus-relative POSIX path when `abs` sits inside the corpus's reach, else null — the app's
 *  pens never write into excluded folders, so the shape check alone suffices here. */
function relCorpusPath(root: string, abs: string): string | null {
  const rel = relative(root, abs)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  const segs = rel.split(/[/\\]/)
  if (segs[0] === '.nexus' || segs[0] === '.trash') return null
  return segs.join('/')
}

/** Re-index one just-written page file. Never throws — a missed row heals at the next open. */
export async function indexWrittenPage(root: string, abs: string): Promise<void> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return
  try {
    const st = await stat(abs)
    const content = await readFile(abs, 'utf8')
    const entry = extractPageIndex(content) ?? { mentions: [], values: {} }
    upsertPageIndex(rel, entry, { mtimeMs: st.mtimeMs, size: st.size })
  } catch {
    // Vanished between the write and this read — drop the rows; the reconcile confirms.
    removePathIndex(rel)
  }
}

/** Drop rows for a deleted file or folder. */
export function deindexPath(root: string, abs: string): void {
  const rel = relCorpusPath(root, abs)
  if (!rel) return
  if (isMarkdownFile(rel)) removePathIndex(rel)
  else removePathPrefixIndex(rel)
}

/** Move rows for a renamed or moved file or folder. A move out of the corpus's reach is a
 *  deindex; a move in from outside leaves the seed's next pass to pick the rows up. */
export function moveIndexPaths(root: string, oldAbs: string, newAbs: string): void {
  const oldRel = relCorpusPath(root, oldAbs)
  const newRel = relCorpusPath(root, newAbs)
  if (!oldRel) return
  if (!newRel) {
    deindexPath(root, oldAbs)
    return
  }
  if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
  else renamePathPrefixIndex(oldRel, newRel)
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
