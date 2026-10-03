// The tree's entities as one list, which the host's lookups project from.

import { contextDirRel } from '../Paths/nexusPaths'
import type { HeldKind } from './entities'
import { entityMemo, type SetNode } from './tree'

export interface EntityRecord {
  id: string
  kind: HeldKind
  title: string
  path: string
}

/** Contexts and their Spaces, then each Collection ahead of what it holds; two files claiming one id are both listed. */
export const recordsOf = entityMemo([(t) => t.contexts], (tree): readonly EntityRecord[] => {
  const records: EntityRecord[] = []
  const add = ({ id, kind, title, path }: EntityRecord): void => {
    records.push({ id, kind, title, path })
  }
  const addSets = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      add(s)
      s.pages.forEach(add)
      addSets(s.sets)
    }
  }
  for (const g of tree.contexts) {
    add({ id: g.def.id, kind: 'context', title: g.def.title, path: contextDirRel(g.def.title) })
    g.spaces.forEach(add)
  }
  for (const c of tree.collections) {
    add(c)
    c.pages.forEach(add)
    addSets(c.sets)
  }
  return records
})

/** The first record listed under each id. */
export const recordById = entityMemo(
  [(t) => t.contexts],
  (tree): Readonly<Record<string, EntityRecord>> => {
    const byId: Record<string, EntityRecord> = {}
    for (const r of recordsOf(tree)) byId[r.id] ??= r
    return byId
  },
)
