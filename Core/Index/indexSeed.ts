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
const SEED_BATCH = 200

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
  return pageOf(rel, stat)
}

/** Whether the index's recorded `held` describes `st`, the same time and size: the one test by which the index vouches for a page, against its file's stat or against what it held before a read. The index keeps no birth time, so unlike `sameFile` it passes a replacement at the same time and size. */
const describes = (
  held: IndexedStat | null | undefined,
  st: Pick<IndexedStat, 'mtimeMs' | 'size'> | null | undefined,
): boolean => !!held && !!st && held.mtimeMs === st.mtimeMs && held.size === st.size

/** Whether `path`'s row is still the one `prior` describes, the row taken ahead of a page's read or the stat its batch committed: a writer that landed since left a fresher row, and one that moved or removed the page took its row away, so the read gives way to theirs. A page with no row then or now takes the read, and so does every read where no index holds rows. */
export const unmoved = (
  path: string,
  prior: Pick<IndexedStat, 'mtimeMs' | 'size'> | null | undefined,
): boolean => {
  const now = readIndexedStat(path)
  return now ? describes(now, prior) : !prior || contentIndexStore() === null
}

/** The files among `files` a cascade still reads: each `passOver` doesn't name as one the index answers for, handed its root-relative path, and each whose row no longer describes its file. That row describing the file is the one condition on which the index may pass over a page it lists, since an outside edit the index hasn't taken yet may still sit in the watcher's debounce. */
export async function unlessVouched(
  root: string,
  files: readonly string[],
  passOver: (rel: string, file: string) => boolean,
): Promise<string[]> {
  const kept = await Promise.all(
    files.map(async (file) => {
      const rel = relative(root, file)
      return !passOver(rel, file) || !describes(readIndexedStat(rel), await statOrNull(file))
    }),
  )
  return files.filter((_, i) => kept[i])
}

/** What the index read of a written page, for the tree's patch to take rather than read and parse it again. */
export type PageRead = { text: string; stat: FileStat; page: ParsedPage }

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
    absPath: string
    read: PageRead
  }[] = []
  const flush = (): void => {
    const rows = queued.splice(0).filter(({ row, prior }) => unmoved(row.path, prior))
    seen.renames.push(...reindex(rows.map(({ row }) => row)))
    for (const { row, prior, absPath, read } of rows) {
      reads?.set(absPath, read)
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
    queued.push({ row, prior, absPath, read: { text: content, stat: st, page } })
    if (queued.length === SEED_BATCH) flush()
  }
  if (contentIndexStore() !== db0) return NOTHING_SEEN
  flush()
  return seen
}

// Writes each page's rows and reports the heading renames they show against the rows they replace: one heading gone and one fresh heading at its ordinal, the outline otherwise unchanged. Anything murkier is left to the muted heading.
function reindex(rows: readonly PageIndexRow[]): HeadingRenameSeen[] {
  if (!rows.length) return []
  const held = readHeadings(rows.map(({ path }) => path)) ?? {}
  upsertPageIndexes(rows)
  return rows.flatMap(({ path, entry }) => {
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
}

export async function deindexPath(root: string, abs: string): Promise<IndexSeen> {
  const rel = await relCorpusPath(root, abs)
  if (!rel) return NOTHING_SEEN
  if (isMarkdownFile(rel)) return { ...NOTHING_SEEN, vanished: unindexed(rel) }
  const vanished = [...(readIndexedStats(rel) ?? [])].flatMap(([path, stat]) => pageOf(path, stat))
  removePathPrefixIndex(rel)
  return { ...NOTHING_SEEN, vanished }
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
  if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
  else renamePathPrefixIndex(oldRel, newRel)
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
  const reread: string[] = []
  const renames: HeadingRenameSeen[] = []
  const queued: PageIndexRow[] = []
  const landed: string[] = []
  const flush = (): void => {
    const rows = queued.splice(0).filter(({ path }) => unmoved(path, indexed.get(path)))
    renames.push(...reindex(rows))
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
