import { foldKey } from '../Paths/caseFold'
import { ID_KEY } from '../Nexus/identityMark'
import type {
  BaseRecord,
  CaptureReason,
  CaptureStore,
  ContentIndexStore,
  IndexedStat,
  KeyValueStore,
  PageHeading,
  PageRelationRow,
  PageRelations,
  RelationRow,
  SnapshotRow,
  SnapshotSource,
  SnapshotStore,
  Stores,
  SyncStore,
} from '../Platform/stores'

interface MemoryIndex {
  relations: Map<string, RelationRow>
  headings: Map<string, { path: string; text: string; level: number; ordinal: number }>
  values: Map<string, { path: string; key: string; value: string }>
  stats: Map<string, IndexedStat>
}

const k = (...parts: string[]): string => JSON.stringify(parts)

const keyValue = (): KeyValueStore => {
  const scopes = new Map<string, Map<string, string>>()
  return {
    get: (scope, key) => scopes.get(scope)?.get(key) ?? null,
    write: (scope, rows) => {
      const s = scopes.get(scope) ?? new Map<string, string>()
      for (const [key, value] of Object.entries(rows))
        if (value === null) s.delete(key)
        else s.set(key, value)
      scopes.set(scope, s)
    },
    entries: (scope) => Object.fromEntries(scopes.get(scope) ?? []),
  }
}

const underPrefix = (path: string, dir: string): boolean => path.startsWith(`${dir}/`)

interface IndexTable {
  clear(holds: (path: string) => boolean): void
  rekey(holds: (path: string) => boolean, move: (path: string) => string): void
}

// One descriptor per map: the four path operations differ only in which fields key a row, so the difference lives here and each operation is one loop.
const tableOf = <R extends { path: string }>(
  map: Map<string, R>,
  keyOf: (row: R) => string[],
): IndexTable => ({
  clear(holds) {
    for (const [key, row] of map) if (holds(row.path)) map.delete(key)
  },
  rekey(holds, move) {
    for (const [key, row] of [...map]) {
      if (!holds(row.path)) continue
      map.delete(key)
      const next = { ...row, path: move(row.path) }
      map.set(k(next.path, ...keyOf(next)), next)
    }
  },
})

const contentIndex = (index: MemoryIndex): ContentIndexStore => {
  const tables: IndexTable[] = [
    tableOf(index.relations, (r) => [r.kind, r.target, r.qualifier, r.key]),
    tableOf(index.headings, (r) => [String(r.ordinal)]),
    tableOf(index.values, (r) => [r.key]),
  ]
  const clearPath = (path: string): void => {
    for (const t of tables) t.clear((p) => p === path)
    index.stats.delete(path)
  }
  const sortedPaths = (paths: Iterable<string>): string[] => [...new Set(paths)].sort()
  const statOf = (path: string, { mtimeMs, size }: IndexedStat): IndexedStat => {
    const row = index.values.get(k(path, ID_KEY))
    const value: unknown = row && JSON.parse(row.value)
    return typeof value === 'string' ? { mtimeMs, size, id: value } : { mtimeMs, size }
  }
  const relationRows = (): RelationRow[] => [...index.relations.values()]
  return {
    upsertPageIndexes(rows) {
      for (const { path, entry, stat } of rows) {
        clearPath(path)
        for (const relation of entry.relations)
          index.relations.set(
            k(path, relation.kind, relation.target, relation.qualifier, relation.key),
            {
              path,
              ...relation,
            },
          )
        entry.headings.forEach(({ text, level }, ordinal) => {
          index.headings.set(k(path, String(ordinal)), { path, text, level, ordinal })
        })
        for (const [key, value] of Object.entries(entry.values))
          index.values.set(k(path, key), { path, key, value: JSON.stringify(value) ?? 'null' })
        index.stats.set(path, { mtimeMs: stat.mtimeMs, size: stat.size })
      }
    },
    removePathIndex(path) {
      clearPath(path)
    },
    // `rekey` deletes each row before re-setting it, so no row still holds `oldPath` and the stats are all that remain to move.
    renamePathIndex(oldPath, newPath) {
      for (const t of tables)
        t.rekey(
          (p) => p === oldPath,
          () => newPath,
        )
      const stat = index.stats.get(oldPath)
      if (!stat) return
      index.stats.delete(oldPath)
      index.stats.set(newPath, stat)
    },
    removePathPrefixIndex(dir) {
      for (const t of tables) t.clear((p) => underPrefix(p, dir))
      for (const path of [...index.stats.keys()])
        if (underPrefix(path, dir)) index.stats.delete(path)
    },
    renamePathPrefixIndex(oldDir, newDir) {
      const move = (path: string): string => newDir + path.slice(oldDir.length)
      for (const t of tables) t.rekey((p) => underPrefix(p, oldDir), move)
      for (const [path, stat] of [...index.stats]) {
        if (!underPrefix(path, oldDir)) continue
        index.stats.delete(path)
        index.stats.set(move(path), stat)
      }
    },
    queryMentions(keys, qualifier) {
      return sortedPaths(
        relationRows()
          .filter(
            (r) =>
              keys.includes(r.target) &&
              (qualifier === undefined || r.qualifier === qualifier) &&
              r.kind !== 'space',
          )
          .map((r) => r.path),
      )
    },
    readHeadings(paths) {
      const out: Record<string, PageHeading[]> = {}
      for (const p of paths ?? index.stats.keys()) out[p] = []
      const rows = [...index.headings.values()].sort((a, b) => a.ordinal - b.ordinal)
      for (const { path, text, level } of rows) {
        if (paths && !paths.includes(path)) continue
        out[path] ??= []
        out[path].push({ text, level })
      }
      return out
    },
    readPageRelations(paths, key) {
      const held = (path: string): boolean => !paths || paths.includes(path)
      const relations = relationRows()
        .filter((r): r is PageRelationRow => r.kind !== 'space' && held(r.path))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      const pages: PageRelations['pages'] = {}
      for (const [path, stat] of index.stats)
        if (held(path)) pages[path] = { values: {}, mtimeMs: stat.mtimeMs }
      for (const row of index.values.values()) {
        const page = pages[row.path]
        if (page && (key === undefined || row.key === key))
          page.values[row.key] = JSON.parse(row.value)
      }
      return { relations, pages }
    },
    queryKeyHolders(key) {
      return sortedPaths([...index.values.values()].filter((r) => r.key === key).map((r) => r.path))
    },
    queryMembers(key, title) {
      return sortedPaths(
        relationRows()
          .filter((r) => r.kind === 'space' && r.qualifier === key && r.target === title)
          .map((r) => r.path),
      )
    },
    readIndexedStat(path) {
      const s = index.stats.get(path)
      return s ? statOf(path, s) : null
    },
    readIndexedStats(under) {
      return new Map(
        [...index.stats]
          .filter(([path]) => under === undefined || underPrefix(path, under))
          .map(([path, s]) => [path, statOf(path, s)]),
      )
    },
  }
}

const snapshots = (): SnapshotStore => {
  const pages = new Map<string, Map<number, { source: SnapshotSource; text: string }>>()
  const page = (id: string): Map<number, { source: SnapshotSource; text: string }> => {
    const p = pages.get(id) ?? new Map()
    pages.set(id, p)
    return p
  }
  const descTs = (id: string): number[] => [...(pages.get(id)?.keys() ?? [])].sort((a, b) => b - a)
  return {
    addSnapshot: (pageId, ts, source, text) => {
      page(pageId).set(ts, { source, text })
    },
    latestSnapshot: (pageId) => {
      const ts = descTs(pageId)[0]
      const row = ts === undefined ? undefined : pages.get(pageId)?.get(ts)
      return row ? { ts, text: row.text } : null
    },
    listSnapshots: (pageId): SnapshotRow[] =>
      descTs(pageId).map((ts) => ({ ts, source: page(pageId).get(ts)!.source })),
    readSnapshot: (pageId, ts) => pages.get(pageId)?.get(ts)?.text ?? null,
    deleteSnapshots: (pageId, ts) => {
      const p = pages.get(pageId)
      if (!p) return 0
      let n = 0
      for (const t of ts) if (p.delete(t)) n++
      return n
    },
    clearSnapshots: () => {
      let n = 0
      for (const p of pages.values()) n += p.size
      pages.clear()
      return n
    },
    sweepSnapshots: (cutoffMs) => {
      let n = 0
      for (const p of pages.values())
        for (const ts of [...p.keys()]) if (ts < cutoffMs && p.delete(ts)) n++
      return n
    },
  }
}

const sync = (): SyncStore => {
  const bases = new Map<string, BaseRecord>()
  const copy = (r: BaseRecord): BaseRecord => ({
    ...r,
    baseBytes: r.baseBytes === null ? null : new Uint8Array(r.baseBytes),
  })
  return {
    readBase: (path) => {
      const r = bases.get(foldKey(path))
      return r ? copy(r) : null
    },
    readAllBases: () => [...bases.values()].map(copy),
    readBasesUnder: (prefix) => {
      const fold = foldKey(prefix)
      return [...bases.values()].filter((r) => underPrefix(foldKey(r.path), fold)).map(copy)
    },
    upsertBase: (record) => {
      bases.set(foldKey(record.path), copy(record))
    },
    renameBase: (oldPath, newPath) => {
      const fold = foldKey(oldPath)
      const r = bases.get(fold)
      if (!r) return
      bases.delete(fold)
      bases.set(foldKey(newPath), { ...r, path: newPath })
    },
    deleteBase: (path) => {
      bases.delete(foldKey(path))
    },
  }
}

const captures = (): CaptureStore => {
  const paths = new Map<string, Map<number, { reason: CaptureReason; bytes: Uint8Array }>>()
  return {
    addCapture: (path, ts, reason, bytes) => {
      const p = paths.get(path) ?? new Map()
      p.set(ts, { reason, bytes: new Uint8Array(bytes) })
      paths.set(path, p)
    },
    sweepCaptures: (cutoffMs) => {
      let n = 0
      for (const p of paths.values())
        for (const ts of [...p.keys()])
          if (ts < cutoffMs) {
            p.delete(ts)
            n++
          }
      return n
    },
  }
}

export function memoryStores(): { stores: Stores; index: MemoryIndex } {
  const index: MemoryIndex = {
    relations: new Map(),
    headings: new Map(),
    values: new Map(),
    stats: new Map(),
  }
  return {
    stores: {
      keyValue: keyValue(),
      contentIndex: contentIndex(index),
      snapshots: snapshots(),
      sync: sync(),
      captures: captures(),
    },
    index,
  }
}
