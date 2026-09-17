import { join, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { errText } from '../Contract/result'
import { extractHeadingMentions, extractMentions, frontmatterMentions } from '../Connections/scan'
import { normalizeTitle, titleFromPath } from '../Connections/connections'
import { headingOutline } from '../MarkdownPM/Engine/headingScan'
import { parseContextKey } from '../Contexts/contexts'
import { sweepAdmitsBody } from '../Files/pageFile'
import {
  markIndexReady,
  queryHeadingMentions,
  readHeadings,
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
  type Membership,
  type PageIndexEntry,
} from '../Platform/stores'
import { machine } from '../Platform/machine'
import { readTextOrNull } from '../Files/atomicWrite'
import { splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { corpusFiles, corpusFilesUnder, isMarkdownFile } from '../Files/walk'
import { NON_CORPUS_TOP } from '../Paths/nexusPaths'

import { readWatchScope } from '../Settings/settings'

const NO_ROWS: PageIndexEntry = {
  mentions: [],
  headings: [],
  headingMentions: [],
  values: {},
  memberships: [],
}

function extractPageIndex(rel: string, content: string): PageIndexEntry {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = frontmatterValues(content)
  const own = titleFromPath(rel)
  const { body } = splitEnvelope(content)
  const outline = headingOutline(body).map((h) => h.text)
  const mentions = extractMentions(body, own)
  for (const title of frontmatterMentions(values)) mentions.add(title)
  return {
    mentions: [...mentions],
    headings: [...new Set(outline.map(normalizeTitle))].filter(Boolean),
    headingMentions: extractHeadingMentions(body, own, outline),
    values,
    memberships: extractMemberships(values),
  }
}

// Every `<Title>` key counts, registered or not — the same latitude page_values gives an unregistered property name, so a Context created later finds its holders.
function extractMemberships(values: Record<string, unknown>): Membership[] {
  const out: Membership[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (parseContextKey(key) === null || raw == null) continue
    const titles = new Set<string>()
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      const title = normalizeTitle(value)
      if (title) titles.add(title)
    }
    for (const title of titles) out.push({ key, title })
  }
  return out
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
  if (!rel || escapes(rel)) return null
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

function recordPage(rel: string, content: string, stat: IndexedStat): PageIndexEntry {
  const entry = extractPageIndex(rel, content)
  upsertPageIndex(rel, entry, stat)
  return entry
}

export interface HeadingRenameSeen {
  title: string
  old: string
  next: string
}

// Re-indexes a written page and reports a heading rename it reads: one linked heading gone and one fresh heading standing in its place, the outline otherwise unchanged. Anything murkier is left to the muted heading.
export async function indexWrittenPage(
  root: string,
  abs: string,
): Promise<HeadingRenameSeen | null> {
  const rel = relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return null
  const st = await machine()
    .stat(abs)
    .catch(() => null)
  const content = st && (await readTextOrNull(abs))
  // Vanished between the write and this read — drop the rows; the reconcile confirms.
  if (!st || content === null) {
    removePathIndex(rel)
    return null
  }
  const title = titleFromPath(rel)
  const titleKey = normalizeTitle(title)
  const before = readHeadings([rel])?.[rel] ?? []
  const entry = recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
  const after = entry.headings
  if (after.length !== before.length) return null
  const gone = before.filter(
    (k) => !after.includes(k) && (queryHeadingMentions(titleKey, k)?.length ?? 0) > 0,
  )
  const fresh = after.filter((k) => !before.includes(k))
  if (
    gone.length !== 1 ||
    fresh.length !== 1 ||
    before.indexOf(gone[0]) !== after.indexOf(fresh[0])
  )
    return null
  const next = headingOutline(splitEnvelope(content).body).find(
    (h) => normalizeTitle(h.text) === fresh[0],
  )
  return next ? { title, old: gone[0], next: next.text } : null
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
  // The handle this seed started against. Every await below is a window for a nexus switch to swap it; a seed that kept writing would pour the OLD corpus's rows into the NEW database, so it bails wherever the identity moved.
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
        seen.delete(rel)
        continue
      }
      if (contentIndexStore() !== db0) return
      // A maintaining writer that landed while this file's read was in flight left a fresher row than the snapshot knew — keep theirs; this read predates their write.
      const row = readIndexedStat(rel)
      if (row && (row.mtimeMs !== prior?.mtimeMs || row.size !== prior?.size)) continue
      recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
      reread.rels.push(rel)
    }
    if (contentIndexStore() !== db0) return
    // Prune only what the pre-seed gate knew and the corpus no longer yields — a page born while the seed ran is absent from the snapshot and must survive this pass.
    for (const rel of indexed.keys()) if (!seen.has(rel)) removePathIndex(rel)
    markIndexReady()
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
  }
}
