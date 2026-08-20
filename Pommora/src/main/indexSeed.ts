// The open-time seed: bring the content index to agreement with the corpus, reading only files
// whose (mtime, size) moved since they were last indexed. The honest cost is one full-corpus
// read EVER per database; every later open is a stat sweep. Admission is the sweeps' own —
// a file they would skip gets no rows, only a stat entry so it isn't re-read forever.

import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { isGovernedKey } from '@shared/governedKeys'
import { errText } from '@shared/result'
import { extractMentions } from './connections/scan'
import { sweepAdmitsBody } from './crud/util'
import {
  markIndexReady,
  readIndexedStat,
  readIndexedStats,
  removePathIndex,
  removePathPrefixIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndex,
  type IndexedStat,
  type PageIndexEntry,
} from './db/contentIndex'
import { splitEnvelope } from './io/pageFile'
import { corpusFiles, corpusFilesUnder, isMarkdownFile } from './io/walk'
import { NON_CORPUS_TOP } from '@shared/nexusPaths'
import { splitFrontmatter } from './readNexus'
import { readExcludedFolders } from './settings'
import { sessionDb } from './sessionDb'

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

/** Every corpus file of the nexus at `root`, honoring the user's `excluded_folders` — the one
 *  enumeration behind the seed and behind every cascade's fallback scan. */
export async function nexusCorpus(root: string): Promise<string[]> {
  return corpusFiles(root, await readExcludedFolders(root))
}

/** Corpus rels as absolute paths, kept to those inside one of `folders` — the separator is part
 *  of the prefix so a folder never swallows a sibling whose name merely extends it. Shared by
 *  the per-folder enumeration below and the key-holder query's scope intersection. */
export function corpusUnder(root: string, rels: string[], folders: string[]): string[] {
  return rels
    .map((rel) => join(root, rel))
    .filter((abs) => folders.some((folder) => abs.startsWith(folder + sep)))
}

/** The corpus under one folder, as absolute paths — the subtree walked directly, never the
 *  whole nexus (this sits on the container-open hot path). The per-folder sweeps and readers
 *  enumerate through here so a folder nested inside a Collection but named by
 *  `excluded_folders` stays exactly as unreachable as the walk says. */
export async function folderCorpus(root: string, absFolder: string): Promise<string[]> {
  const rels = await corpusFilesUnder(root, absFolder, await readExcludedFolders(root))
  return rels.map((rel) => join(root, rel))
}

/** Nexus-relative POSIX path when `abs` sits inside the corpus's reach, else null — the app's
 *  pens never write into excluded folders, so the shape check alone suffices here. */
function relCorpusPath(root: string, abs: string): string | null {
  const rel = relative(root, abs)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  const segs = rel.split(/[/\\]/)
  if (NON_CORPUS_TOP.has(segs[0])) return null
  return segs.join('/')
}

function recordPage(rel: string, content: string, stat: IndexedStat): void {
  upsertPageIndex(rel, extractPageIndex(content) ?? { mentions: [], values: {} }, stat)
}

/** Re-index one just-written page file. Never throws — a missed row heals at the next open. */
export async function indexWrittenPage(root: string, abs: string): Promise<void> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return
  try {
    const st = await stat(abs)
    recordPage(rel, await readFile(abs, 'utf8'), { mtimeMs: st.mtimeMs, size: st.size })
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

/** Re-key the rows of a renamed or moved file or folder, then re-read the moved page itself (a
 *  folder has no rows of its own, so the re-read is a no-op for it). A move out of the corpus's
 *  reach is a deindex; a move in from outside leaves the seed's next pass to pick the rows up. */
export async function moveIndexPaths(root: string, oldAbs: string, newAbs: string): Promise<void> {
  const oldRel = relCorpusPath(root, oldAbs)
  const newRel = relCorpusPath(root, newAbs)
  if (!oldRel) return
  if (!newRel) {
    deindexPath(root, oldAbs)
    return
  }
  if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
  else renamePathPrefixIndex(oldRel, newRel)
  await indexWrittenPage(root, newAbs)
}

/** Seed/reconcile the open nexus's index. Stands down when there is no index to write (null Db,
 *  or tables that never landed); never throws — a failed seed costs queries, not the open. */
export async function seedContentIndex(root: string): Promise<void> {
  const indexed = readIndexedStats()
  if (!indexed) return
  // The handle this seed started against. Every await below is a window for a nexus switch to
  // swap it; a seed that kept writing would pour the OLD corpus's rows into the NEW database
  // and then prune everything the new nexus holds — so the seed bails wherever the identity
  // moved, and the new session's own adopt-time seed covers its nexus.
  const db0 = sessionDb()
  try {
    const rels = await nexusCorpus(root)
    const seen = new Set(rels)
    for (const rel of rels) {
      const abs = join(root, rel)
      const prior = indexed.get(rel)
      let st: Awaited<ReturnType<typeof stat>>
      let content: string
      try {
        st = await stat(abs)
        if (prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
        content = await readFile(abs, 'utf8')
      } catch {
        // Vanished mid-seed — the prune below drops its rows rather than trusting stale ones.
        seen.delete(rel)
        continue
      }
      if (sessionDb() !== db0) return
      // A maintaining writer that landed while this file's read was in flight left a fresher
      // row than the snapshot knew — keep theirs; this read predates their write.
      const row = readIndexedStat(rel)
      if (row && (row.mtimeMs !== prior?.mtimeMs || row.size !== prior?.size)) continue
      recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
    }
    if (sessionDb() !== db0) return
    // Prune only what the pre-seed gate knew and the corpus no longer yields — a page born
    // while the seed ran is absent from the snapshot and must survive this pass.
    for (const rel of indexed.keys()) if (!seen.has(rel)) removePathIndex(rel)
    markIndexReady()
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
  }
}
