import type { KeyValueStore } from '../Platform/machine'
import type {
  ContentIndexStore,
  IndexedStat,
  SnapshotRow,
  SnapshotSource,
  SnapshotStore,
  Stores,
} from '../Platform/stores'

interface MemoryIndex {
  mentions: Map<string, { path: string; title: string }>
  values: Map<string, { path: string; key: string; value: string }>
  memberships: Map<string, { path: string; key: string; title: string }>
  stats: Map<string, IndexedStat>
}

const k = (...parts: string[]): string => JSON.stringify(parts)

const keyValue = (): KeyValueStore => {
  const scopes = new Map<string, Map<string, string>>()
  return {
    get: (scope, key) => scopes.get(scope)?.get(key) ?? null,
    set: (scope, key, value) => {
      if (value === null) {
        scopes.get(scope)?.delete(key)
        return
      }
      const s = scopes.get(scope) ?? new Map<string, string>()
      s.set(key, value)
      scopes.set(scope, s)
    },
    entries: (scope) => Object.fromEntries(scopes.get(scope) ?? []),
  }
}

const underPrefix = (path: string, dir: string): boolean => path.startsWith(`${dir}/`)

const contentIndex = (index: MemoryIndex): ContentIndexStore => {
  const clearPath = (path: string): void => {
    for (const table of [index.mentions, index.values, index.memberships])
      for (const [key, row] of table) if (row.path === path) table.delete(key)
    index.stats.delete(path)
  }
  const sortedPaths = (paths: Iterable<string>): string[] => [...new Set(paths)].sort()
  return {
    upsertPageIndex(path, entry, stat) {
      clearPath(path)
      for (const title of entry.mentions) index.mentions.set(k(path, title), { path, title })
      for (const [key, value] of Object.entries(entry.values))
        index.values.set(k(path, key), { path, key, value: JSON.stringify(value) ?? 'null' })
      for (const { key, title } of entry.memberships)
        index.memberships.set(k(path, key, title), { path, key, title })
      index.stats.set(path, { mtimeMs: stat.mtimeMs, size: stat.size })
    },
    removePathIndex(path) {
      clearPath(path)
    },
    renamePathIndex(oldPath, newPath) {
      for (const row of [...index.mentions.values()].filter((r) => r.path === oldPath))
        index.mentions.set(k(newPath, row.title), { path: newPath, title: row.title })
      for (const row of [...index.values.values()].filter((r) => r.path === oldPath))
        index.values.set(k(newPath, row.key), { path: newPath, key: row.key, value: row.value })
      for (const row of [...index.memberships.values()].filter((r) => r.path === oldPath))
        index.memberships.set(k(newPath, row.key, row.title), {
          path: newPath,
          key: row.key,
          title: row.title,
        })
      const stat = index.stats.get(oldPath)
      if (stat) index.stats.set(newPath, stat)
      if (oldPath !== newPath) clearPath(oldPath)
    },
    removePathPrefixIndex(dir) {
      for (const table of [index.mentions, index.values, index.memberships])
        for (const [key, row] of table) if (underPrefix(row.path, dir)) table.delete(key)
      for (const path of [...index.stats.keys()])
        if (underPrefix(path, dir)) index.stats.delete(path)
    },
    renamePathPrefixIndex(oldDir, newDir) {
      const move = (path: string): string => newDir + path.slice(oldDir.length)
      for (const [key, row] of [...index.mentions]) {
        if (!underPrefix(row.path, oldDir)) continue
        index.mentions.delete(key)
        const path = move(row.path)
        index.mentions.set(k(path, row.title), { path, title: row.title })
      }
      for (const [key, row] of [...index.values]) {
        if (!underPrefix(row.path, oldDir)) continue
        index.values.delete(key)
        const path = move(row.path)
        index.values.set(k(path, row.key), { path, key: row.key, value: row.value })
      }
      for (const [key, row] of [...index.memberships]) {
        if (!underPrefix(row.path, oldDir)) continue
        index.memberships.delete(key)
        const path = move(row.path)
        index.memberships.set(k(path, row.key, row.title), { path, key: row.key, title: row.title })
      }
      for (const [path, stat] of [...index.stats]) {
        if (!underPrefix(path, oldDir)) continue
        index.stats.delete(path)
        index.stats.set(move(path), stat)
      }
    },
    queryMentions(normalizedTitle) {
      return sortedPaths(
        [...index.mentions.values()].filter((r) => r.title === normalizedTitle).map((r) => r.path),
      )
    },
    queryKeyHolders(key) {
      return sortedPaths([...index.values.values()].filter((r) => r.key === key).map((r) => r.path))
    },
    queryMembers(key, title) {
      return sortedPaths(
        [...index.memberships.values()]
          .filter((r) => r.key === key && r.title === title)
          .map((r) => r.path),
      )
    },
    readIndexedStat(path) {
      const s = index.stats.get(path)
      return s ? { ...s } : null
    },
    readIndexedStats() {
      return new Map([...index.stats].map(([path, s]) => [path, { ...s }]))
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

export function memoryStores(): { stores: Stores; index: MemoryIndex } {
  const index: MemoryIndex = {
    mentions: new Map(),
    values: new Map(),
    memberships: new Map(),
    stats: new Map(),
  }
  return {
    stores: { keyValue: keyValue(), contentIndex: contentIndex(index), snapshots: snapshots() },
    index,
  }
}
