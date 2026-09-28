import { join, relative, isMarkdownFile, titleFromPath } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { errText } from '../Contract/result'
import { listOf } from '../Contract/validators'
import { frontmatterMentions, linksIn } from '../Connections/scan'
import { normalizeTitle } from '../Connections/connections'
import { headingOutlineOf } from '../MarkdownPM/Engine/headingScan'
import { inCodeAt, scanDoc } from '../MarkdownPM/Engine/docScan'
import { parseContextKey } from '../Contexts/contexts'
import { sweepAdmitsBody } from '../Files/pageFile'
import {
  markIndexReady,
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
  type RelationKind,
  type Relation,
  type PageIndexEntry,
} from '../Platform/stores'
import { machine } from '../Platform/machine'
import { readTextOrNull } from '../Files/atomicWrite'
import { splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { corpusFiles, corpusFilesUnder } from '../Files/walk'
import { outsideContent } from '../Paths/exclusion'

import { readWatchScope } from '../Settings/settings'

interface PageRead {
  entry: PageIndexEntry
  outline: string[]
}

const NO_ROWS: PageRead = { entry: { relations: [], headings: [], values: {} }, outline: [] }

function extractPageIndex(rel: string, content: string): PageRead {
  if (!sweepAdmitsBody(content)) return NO_ROWS
  const values = splitFrontmatter(content)
  const own = titleFromPath(rel)
  const { body } = splitEnvelope(content)
  const scan = scanDoc(body)
  const outline = headingOutlineOf(scan).map((h) => h.text)
  const tally = new Map<string, Relation>()
  // A NUL separator: no normalized title or Context key can hold one, so the three parts never blur.
  const add = (kind: RelationKind, target: string, qualifier: string): void => {
    const key = `${kind}\0${target}\0${qualifier}`
    const held = tally.get(key)
    if (held) held.count++
    else tally.set(key, { kind, target, qualifier, count: 1 })
  }
  for (const hit of linksIn(body, own, outline, (p) => inCodeAt(scan, p))) {
    add(hit.syntax === 'embed' ? 'embed' : 'body', hit.target, hit.qualifier)
    if (hit.at >= scan.lineStarts[scan.citations.firstLine])
      add('citation', hit.target, hit.qualifier)
  }
  for (const { target, qualifier } of frontmatterMentions(values))
    add('frontmatter', target, qualifier)
  for (const { target, qualifier } of spaceRelations(values)) add('space', target, qualifier)
  const headings = [...new Set(outline.map(normalizeTitle))].filter(Boolean)
  return { entry: { relations: [...tally.values()], headings, values }, outline }
}

// Every `<Title>` key counts, registered or not — the same latitude page_values gives an unregistered property name, so a Context created later finds its holders.
function* spaceRelations(
  values: Record<string, unknown>,
): Generator<{ target: string; qualifier: string }> {
  for (const [key, raw] of Object.entries(values)) {
    if (parseContextKey(key) === null || raw == null) continue
    const titles = new Set<string>()
    for (const value of listOf(raw)) {
      const title = normalizeTitle(value)
      if (title) titles.add(title)
    }
    for (const target of titles) yield { target, qualifier: key }
  }
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

async function relCorpusPath(root: string, abs: string): Promise<string | null> {
  const rel = relative(root, abs)
  if (!rel || escapes(rel)) return null
  return outsideContent(rel, await readWatchScope(root)) ? null : rel
}

function recordPage(rel: string, content: string, stat: IndexedStat): PageRead {
  const read = extractPageIndex(rel, content)
  upsertPageIndex(rel, read.entry, stat)
  return read
}

interface HeadingRenameSeen {
  title: string
  old: string
  next: string
}

// Re-indexes a written page and reports a heading rename it reads: one heading gone and one fresh heading at its ordinal, the outline otherwise unchanged. Anything murkier is left to the muted heading.
export async function indexWrittenPage(
  root: string,
  abs: string,
): Promise<HeadingRenameSeen | null> {
  const rel = await relCorpusPath(root, abs)
  if (!rel || !isMarkdownFile(rel)) return null
  const st = await machine()
    .stat(abs)
    .catch(() => null)
  if (!st) {
    removePathIndex(rel)
    return null
  }
  // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
  const content = await readTextOrNull(abs)
  if (content === null) return null
  const title = titleFromPath(rel)
  const before = readHeadings([rel])?.[rel] ?? []
  const { entry, outline } = recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
  const after = entry.headings
  if (after.length !== before.length) return null
  const gone = before.filter((k) => !after.includes(k))
  const fresh = after.filter((k) => !before.includes(k))
  if (
    gone.length !== 1 ||
    fresh.length !== 1 ||
    before.indexOf(gone[0]) !== after.indexOf(fresh[0])
  )
    return null
  const next = outline.find((text) => normalizeTitle(text) === fresh[0])
  return next ? { title, old: gone[0], next } : null
}

export async function deindexPath(root: string, abs: string): Promise<void> {
  const rel = await relCorpusPath(root, abs)
  if (!rel) return
  if (isMarkdownFile(rel)) removePathIndex(rel)
  else removePathPrefixIndex(rel)
}

export async function moveIndexPaths(root: string, oldAbs: string, newAbs: string): Promise<void> {
  const oldRel = await relCorpusPath(root, oldAbs)
  const newRel = await relCorpusPath(root, newAbs)
  if (!newRel) {
    if (oldRel) await deindexPath(root, oldAbs)
    return
  }
  if (!oldRel) {
    const landed = isMarkdownFile(newRel) ? [newAbs] : await folderCorpus(root, newAbs)
    for (const abs of landed) await indexWrittenPage(root, abs)
    return
  }
  if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
  else renamePathPrefixIndex(oldRel, newRel)
  await indexWrittenPage(root, newAbs)
}

/** The pages a seed re-read, bound to the database it read them into; none when it built a cold index, bailed, or failed. */
export interface SeedReread {
  db: ContentIndexStore | null
  rels: readonly string[]
}

const NONE_REREAD: SeedReread = { db: null, rels: [] }

export async function seedContentIndex(root: string): Promise<SeedReread> {
  const indexed = readIndexedStats()
  if (!indexed) return NONE_REREAD
  // The handle this seed started against. Every await below is a window for a nexus switch to swap it; a seed that kept writing would pour the OLD corpus's rows into the NEW database, so it bails wherever the identity moved.
  const db0 = contentIndexStore()
  const reread: string[] = []
  try {
    const rels = await nexusCorpus(root)
    const seen = new Set(rels)
    for (const rel of rels) {
      const abs = join(root, rel)
      const prior = indexed.get(rel)
      const st = await machine()
        .stat(abs)
        .catch(() => null)
      if (!st) {
        seen.delete(rel)
        continue
      }
      if (prior && prior.mtimeMs === st.mtimeMs && prior.size === st.size) continue
      const content = await readTextOrNull(abs)
      if (content === null) continue
      if (contentIndexStore() !== db0) return NONE_REREAD
      // A maintaining writer that landed while this file's read was in flight left a fresher row than the snapshot knew — keep theirs; this read predates their write.
      const row = readIndexedStat(rel)
      if (row && (row.mtimeMs !== prior?.mtimeMs || row.size !== prior?.size)) continue
      recordPage(rel, content, { mtimeMs: st.mtimeMs, size: st.size })
      reread.push(rel)
    }
    if (contentIndexStore() !== db0) return NONE_REREAD
    // Prune only what the pre-seed gate knew and the corpus no longer yields — a page born while the seed ran is absent from the snapshot and must survive this pass.
    for (const rel of indexed.keys()) if (!seen.has(rel)) removePathIndex(rel)
    markIndexReady()
    return indexed.size === 0 ? NONE_REREAD : { db: db0, rels: reread }
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
    return NONE_REREAD
  }
}
