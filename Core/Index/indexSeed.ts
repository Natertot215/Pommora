import { isAbsolute, join, relative } from '../Locations/posix'
import { errText } from '../Contract/result'
import { extractMentions, frontmatterMentions } from '../Connections/scan'
import { sweepAdmitsBody } from '../Nexus/util'
import {
  markIndexReady,
  readIndexedStat,
  readIndexedStats,
  removePathIndex,
  removePathPrefixIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndex,
} from './contentIndex'
import {
  type ContentIndexStore,
  contentIndexStore,
  type IndexedStat,
  type PageIndexEntry,
} from '../Platform/stores'
import { machine } from '../Platform/machine'
import { readTextOrNull } from '../IO/atomicWrite'
import { splitEnvelope } from '../IO/pageFile'
import { corpusFiles, corpusFilesUnder, isMarkdownFile } from '../IO/walk'
import { NON_CORPUS_TOP } from '../Locations/nexusPaths'
import { splitFrontmatter } from '../Nexus/readNexus'
import { readWatchScope } from '../Settings/settings'

function extractPageIndex(content: string): PageIndexEntry | null {
  if (!sweepAdmitsBody(content)) return null
  const values = frontmatterValues(content)
  const mentions = extractMentions(splitEnvelope(content).body)
  for (const title of frontmatterMentions(values)) mentions.add(title)
  return { mentions: [...mentions], values }
}

export function frontmatterValues(content: string): Record<string, unknown> {
  return splitFrontmatter(content) as Record<string, unknown>
}

export async function nexusCorpus(root: string): Promise<string[]> {
  return corpusFiles(root, await readWatchScope(root))
}

export function corpusUnder(root: string, rels: string[], folders: string[]): string[] {
  return rels
    .map((rel) => join(root, rel))
    .filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
}

export async function folderCorpus(root: string, absFolder: string): Promise<string[]> {
  const rels = await corpusFilesUnder(root, absFolder, await readWatchScope(root))
  return rels.map((rel) => join(root, rel))
}

function relCorpusPath(root: string, abs: string): string | null {
  const rel = relative(root, abs)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  const segs = rel.split('/')
  if (NON_CORPUS_TOP.has(segs[0])) return null
  return segs.join('/')
}

let reread: { db: ContentIndexStore | null; rels: string[]; cold: boolean } = {
  db: null,
  rels: [],
  cold: true,
}

export const rereadSinceSeed = (): readonly string[] =>
  contentIndexStore() === reread.db && !reread.cold ? reread.rels : []

function recordPage(rel: string, content: string, stat: IndexedStat): void {
  upsertPageIndex(rel, extractPageIndex(content) ?? { mentions: [], values: {} }, stat)
}

export async function indexWrittenPage(root: string, abs: string): Promise<void> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return
  const st = await machine()
    .stat(abs)
    .catch(() => null)
  const content = st && (await readTextOrNull(abs))
  // Vanished between the write and this read — drop the rows; the reconcile confirms.
  if (st && content !== null) recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
  else removePathIndex(rel)
}

export function deindexPath(root: string, abs: string): void {
  const rel = relCorpusPath(root, abs)
  if (!rel) return
  if (isMarkdownFile(rel)) removePathIndex(rel)
  else removePathPrefixIndex(rel)
}

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

export async function seedContentIndex(root: string): Promise<void> {
  const indexed = readIndexedStats()
  if (!indexed) return
  // The handle this seed started against. Every await below is a window for a nexus switch to
  // swap it; a seed that kept writing would pour the OLD corpus's rows into the NEW database —
  // so it bails wherever the identity moved, and the new session's own seed covers its nexus.
  const db0 = contentIndexStore()
  reread = { db: db0, rels: [], cold: indexed.size === 0 }
  try {
    const rels = await nexusCorpus(root)
    const seen = new Set(rels)
    for (const rel of rels) {
      const abs = join(root, rel)
      const prior = indexed.get(rel)
      const st = await machine()
        .stat(abs)
        .catch(() => null)
      if (st && prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
      const content = st && (await readTextOrNull(abs))
      if (!st || content === null) {
        // Vanished mid-seed — the prune below drops its rows rather than trusting stale ones.
        seen.delete(rel)
        continue
      }
      if (contentIndexStore() !== db0) return
      // A maintaining writer that landed while this file's read was in flight left a fresher
      // row than the snapshot knew — keep theirs; this read predates their write.
      const row = readIndexedStat(rel)
      if (row && (row.mtimeMs !== prior?.mtimeMs || row.size !== prior?.size)) continue
      recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
      reread.rels.push(rel)
    }
    if (contentIndexStore() !== db0) return
    // Prune only what the pre-seed gate knew and the corpus no longer yields — a page born
    // while the seed ran is absent from the snapshot and must survive this pass.
    for (const rel of indexed.keys()) if (!seen.has(rel)) removePathIndex(rel)
    markIndexReady()
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
  }
}
