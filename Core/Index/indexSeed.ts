import { join, relative, isMarkdownFile } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { errText } from '../Contract/result'
import { linksIn, valueLinks } from '../Connections/scan'
import { headingOutlineOf } from '../MarkdownPM/Engine/headingScan'
import { inCodeAt, scanDoc } from '../MarkdownPM/Engine/docScan'
import { contextTitles, parseContextKey } from '../Contexts/contexts'
import { normalizeTitle } from '../Paths/caseFold'
import { type ParsedPage, parsePage, splitEnvelope } from '../Files/pageFile'
import {
  markIndexReady,
  readHeadings,
  readIndexedStat,
  readIndexedStats,
  removePathIndex,
  removePathPrefixIndex,
  renamePathIndex,
  renamePathPrefixIndex,
  upsertPageIndexes,
} from './contentIndex'
import {
  type ContentIndexStore,
  contentIndexStore,
  type IndexedStat,
  type PageIndexRow,
  type RelationKind,
  type Relation,
  type PageIndexEntry,
} from '../Platform/stores'
import { type FileStat, statOrNull } from '../Platform/machine'
import { readTextOrNull } from '../Files/atomicWrite'
import { corpusFiles, corpusFilesUnder } from '../Files/walk'
import { outsideContent } from '../Paths/exclusion'
import { type ConnPage, connPage, headingKeys } from '../Connections/pageIndex'
import { asString } from '../Nexus/coerce'
import { ID_KEY } from '../Nexus/identityMark'
import { readWatchScope } from '../Settings/settings'

const NO_ROWS: PageIndexEntry = { relations: [], headings: [], values: {} }
export const SEED_BATCH = 200

export function extractPageIndex(content: string, page = parsePage(content)): PageIndexEntry {
  const { frontmatter: values, admission } = page
  if (admission.state === 'unknown') return NO_ROWS
  const { body } = splitEnvelope(content)
  const scan = scanDoc(body)
  const headings = headingOutlineOf(scan).filter((h) => normalizeTitle(h.text) !== '')
  const outline = headings.map((h) => h.text)
  const tally = new Map<string, Relation>()
  // A NUL separator: no key can hold one, so the four parts never blur.
  const add = (kind: RelationKind, target: string, qualifier: string, key = ''): void => {
    tally.set(`${kind}\0${target}\0${qualifier}\0${key}`, { kind, target, qualifier, key })
  }
  for (const hit of linksIn(body, outline, (p) => inCodeAt(scan, p))) {
    add(hit.embed ? 'embed' : 'body', hit.target, hit.qualifier)
    if (hit.full[0] >= scan.lineStarts[scan.citations.firstLine])
      add('citation', hit.target, hit.qualifier)
  }
  for (const hit of valueLinks(values, outline)) add('value', hit.target, hit.qualifier, hit.key)
  for (const { target, qualifier } of spaceRelations(values)) add('space', target, qualifier)
  return { relations: [...tally.values()], headings, values }
}

// Every `<Title>` key counts, registered or not — the same latitude page_values gives an unregistered property name, so a Context created later finds its holders.
function* spaceRelations(
  values: Record<string, unknown>,
): Generator<{ target: string; qualifier: string }> {
  for (const [key, raw] of Object.entries(values)) {
    if (parseContextKey(key) === null) continue
    for (const target of new Set(contextTitles(raw))) yield { target, qualifier: key }
  }
}

export async function nexusCorpus(root: string): Promise<string[]> {
  return corpusFiles(root, await readWatchScope(root))
}

async function relCorpusPath(root: string, abs: string): Promise<string | null> {
  const rel = relative(root, abs)
  if (!rel || escapes(rel)) return null
  return outsideContent(rel, await readWatchScope(root)) ? null : rel
}

export interface HeadingRenameSeen {
  path: string
  old: string
  next: string
}

/** What one index step saw: the heading renames the rows show, the pages whose rows it removed, and the ids the index first saw at a path, or saw change there. Watched events owe it, and the settle owes the ids its stamp answers; the app's own writes don't, their operation having spoken. */
export interface IndexSeen {
  renames: HeadingRenameSeen[]
  vanished: ConnPage[]
  landed: string[]
}

export const NOTHING_SEEN: IndexSeen = { renames: [], vanished: [], landed: [] }
const pageOf = (path: string, stat: IndexedStat | null): ConnPage[] =>
  stat?.id === undefined ? [] : [connPage(stat.id, path)]
const idOf = (entry: PageIndexEntry): string[] => {
  const id = asString(entry.values[ID_KEY])
  return id === undefined ? [] : [id]
}
const unindexed = (rel: string, stat = readIndexedStat(rel)): ConnPage[] => {
  removePathIndex(rel)
  commit([rel])
  return pageOf(rel, stat)
}

/** Whether the index's recorded `held` describes the file `st` was taken of, the same time and size: the seed's skip. The index keeps no birth time, so unlike `sameFile` it passes a replacement at the same time and size. */
const describes = (held: IndexedStat | undefined, st: FileStat): boolean =>
  !!held && held.mtimeMs === st.mtimeMs && held.size === st.size

// The index's commits, counted, and each path's last one, per store, so a switch's store starts with none.
let commits = 0
const lastCommits = new WeakMap<ContentIndexStore, Map<string, number>>()

/** Counts one commit of rows at `paths`, written, moved, or removed, and answers its sequence. */
function commit(paths: Iterable<string>): number {
  const db = contentIndexStore()
  const seq = ++commits
  if (!db) return seq
  const last = lastCommits.get(db) ?? new Map<string, number>()
  lastCommits.set(db, last)
  for (const path of paths) last.set(path, seq)
  return seq
}

/** Whether no commit landed at `path` after `since`, the sequence taken ahead of a page's read or the one its own commit answered: a writer that landed, moved, or removed the page since left the index a fresher answer, so the read gives way to theirs. Every read is taken where no index holds rows. */
export const unmoved = (path: string, since: number): boolean => {
  const db = contentIndexStore()
  return !db || (lastCommits.get(db)?.get(path) ?? 0) <= since
}

/** What the index read of a written page and the sequence of the commit that took it, for the tree's patch to take rather than read and parse it again. */
export type PageRead = { text: string; stat: FileStat; page: ParsedPage; seq: number }

// Re-indexes written pages as the seed commits its own, SEED_BATCH a transaction, a row another writer landed during a page's read kept and nothing written once a switch has moved the database; each from the text and stat its writer hands over or else from its file, a page listed twice as it last stood. Reports what it saw, and puts each committed page's one read and parse into `reads`.
export async function indexWrittenPages(
  root: string,
  written: readonly { absPath: string; text?: string; stat?: FileStat }[],
  reads?: Map<string, PageRead>,
): Promise<IndexSeen> {
  const seen: IndexSeen = { renames: [], vanished: [], landed: [] }
  const db0 = contentIndexStore()
  const queued: {
    row: PageIndexRow
    prior: IndexedStat | null
    since: number
    absPath: string
    read: Omit<PageRead, 'seq'>
  }[] = []
  const flush = (): void => {
    const rows = queued.splice(0).filter(({ row, since }) => unmoved(row.path, since))
    const { renames, seq } = reindex(rows.map(({ row }) => row))
    seen.renames.push(...renames)
    for (const { row, prior, absPath, read } of rows) {
      reads?.set(absPath, { ...read, seq })
      const [now] = idOf(row.entry)
      if (prior?.id === now) continue
      seen.vanished.push(...pageOf(row.path, prior))
      if (now !== undefined) seen.landed.push(now)
    }
  }
  for (const { absPath, text, stat } of new Map(written.map((w) => [w.absPath, w])).values()) {
    const rel = isMarkdownFile(absPath) && (await relCorpusPath(root, absPath))
    if (!rel) continue
    // Ahead of the read, so a writer that lands while it's in flight shows at the commit.
    const since = commits
    const prior = readIndexedStat(rel)
    const st = stat ?? (await statOrNull(absPath))
    const content = st && (text ?? (await readTextOrNull(absPath)))
    if (contentIndexStore() !== db0) return NOTHING_SEEN
    if (!st) {
      seen.vanished.push(...unindexed(rel))
      continue
    }
    // An unreadable page keeps its rows, so a sweep the index seeds still reaches the file and counts it.
    if (content === null) continue
    const page = parsePage(content)
    const entry = extractPageIndex(content, page)
    const row = { path: rel, entry, stat: { mtimeMs: st.mtimeMs, size: st.size } }
    queued.push({ row, prior, since, absPath, read: { text: content, stat: st, page } })
    if (queued.length === SEED_BATCH) flush()
  }
  if (contentIndexStore() !== db0) return NOTHING_SEEN
  flush()
  return seen
}

// Writes each page's rows as one commit, answering its sequence and the heading renames the rows show against the ones they replace: one heading gone and one fresh heading at its ordinal, the outline otherwise unchanged. Anything murkier is left to the muted heading.
function reindex(rows: readonly PageIndexRow[]): { renames: HeadingRenameSeen[]; seq: number } {
  if (!rows.length) return { renames: [], seq: commits }
  const held = readHeadings(rows.map(({ path }) => path)) ?? {}
  upsertPageIndexes(rows)
  const seq = commit(rows.map(({ path }) => path))
  const renames = rows.flatMap(({ path, entry }) => {
    const before = headingKeys(held[path] ?? [])
    const after = headingKeys(entry.headings)
    if (after.length !== before.length) return []
    const gone = before.filter((k) => !after.includes(k))
    const fresh = after.filter((k) => !before.includes(k))
    if (
      gone.length !== 1 ||
      fresh.length !== 1 ||
      before.indexOf(gone[0]) !== after.indexOf(fresh[0])
    )
      return []
    const next = entry.headings.find((h) => normalizeTitle(h.text) === fresh[0])
    return next ? [{ path, old: gone[0], next: next.text }] : []
  })
  return { renames, seq }
}

export async function deindexPath(root: string, abs: string): Promise<IndexSeen> {
  const rel = await relCorpusPath(root, abs)
  if (!rel) return NOTHING_SEEN
  if (isMarkdownFile(rel)) return { ...NOTHING_SEEN, vanished: unindexed(rel) }
  const rows = readIndexedStats(rel) ?? new Map<string, IndexedStat>()
  removePathPrefixIndex(rel)
  commit(rows.keys())
  return { ...NOTHING_SEEN, vanished: [...rows].flatMap(([path, stat]) => pageOf(path, stat)) }
}

export async function moveIndexPaths(root: string, oldAbs: string, newAbs: string): Promise<void> {
  const oldRel = await relCorpusPath(root, oldAbs)
  const newRel = await relCorpusPath(root, newAbs)
  if (!newRel) {
    if (oldRel) await deindexPath(root, oldAbs)
    return
  }
  if (!oldRel) {
    const landed = isMarkdownFile(newRel)
      ? [newRel]
      : await corpusFilesUnder(root, newAbs, await readWatchScope(root))
    const pages = landed.map((rel) => ({ absPath: join(root, rel) }))
    await indexWrittenPages(root, pages)
    return
  }
  if (isMarkdownFile(oldRel)) {
    renamePathIndex(oldRel, newRel)
    commit([oldRel, newRel])
  } else {
    const moved = [...(readIndexedStats(oldRel)?.keys() ?? [])]
    renamePathPrefixIndex(oldRel, newRel)
    commit(moved.flatMap((path) => [path, `${newRel}${path.slice(oldRel.length)}`]))
  }
  await indexWrittenPages(root, [{ absPath: newAbs }])
}

/** What a seed saw and the pages it re-read, bound to the database it read them into; none when it built a cold index, bailed, or failed. */
export interface SeedReread extends IndexSeen {
  db: ContentIndexStore | null
  rels: readonly string[]
}

const NO_REREAD: SeedReread = { ...NOTHING_SEEN, db: null, rels: [] }

export async function seedContentIndex(root: string): Promise<SeedReread> {
  const indexed = readIndexedStats()
  if (!indexed) return NO_REREAD
  // The handle this seed started against. Every await below is a window for a nexus switch to swap it; a seed that kept writing would pour the OLD corpus's rows into the NEW database, so it bails wherever the identity moved.
  const db0 = contentIndexStore()
  const since = commits
  const reread: string[] = []
  const renames: HeadingRenameSeen[] = []
  const queued: PageIndexRow[] = []
  const landed: string[] = []
  const flush = (): void => {
    const rows = queued.splice(0).filter(({ path }) => unmoved(path, since))
    renames.push(...reindex(rows).renames)
    for (const { path, entry } of rows) {
      reread.push(path)
      if (!indexed.has(path)) landed.push(...idOf(entry))
    }
  }
  try {
    const rels = await nexusCorpus(root)
    const seen = new Set(rels)
    for (const rel of rels) {
      const abs = join(root, rel)
      const prior = indexed.get(rel)
      const st = await statOrNull(abs)
      if (!st) {
        seen.delete(rel)
        continue
      }
      if (describes(prior, st)) continue
      const content = await readTextOrNull(abs)
      if (content === null) continue
      if (contentIndexStore() !== db0) return NO_REREAD
      queued.push({
        path: rel,
        entry: extractPageIndex(content),
        stat: { mtimeMs: st.mtimeMs, size: st.size },
      })
      if (queued.length === SEED_BATCH) flush()
    }
    if (contentIndexStore() !== db0) return NO_REREAD
    flush()
    // Prune only what the pre-seed gate knew and the corpus no longer yields — a page born while the seed ran is absent from the snapshot and must survive this pass.
    const vanished: ConnPage[] = []
    for (const [rel, stat] of indexed) if (!seen.has(rel)) vanished.push(...unindexed(rel, stat))
    markIndexReady()
    return indexed.size === 0 ? NO_REREAD : { db: db0, rels: reread, renames, vanished, landed }
  } catch (e) {
    console.error('content index: seed failed — queries fall back to scans:', errText(e))
    return NO_REREAD
  }
}
