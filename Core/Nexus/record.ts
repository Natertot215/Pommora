// The tree's entities as one list, and the lookups both processes project from it.

import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
import { contextDirRel } from '../Paths/nexusPaths'
import type { HeldKind } from './entities'
import { entityMemo, type NexusTree, type SetNode } from './tree'

export interface EntityRecord {
  id: string
  kind: HeldKind
  title: string
  path: string
  /** The entity's own icon field; a page's lives in its page metadata instead. */
  icon?: string
}

/** Contexts and their Spaces, then each Collection ahead of what it holds; two files claiming one id are both listed. */
export const recordsOf = entityMemo([(t) => t.contexts], (tree): readonly EntityRecord[] => {
  const records: EntityRecord[] = []
  const add = ({ id, kind, title, path, icon }: EntityRecord): void => {
    records.push({ id, kind, title, path, icon })
  }
  const addSets = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      add(s)
      s.pages.forEach(add)
      addSets(s.sets)
    }
  }
  for (const g of tree.contexts) {
    add({
      id: g.def.id,
      kind: 'context',
      title: g.def.title,
      path: contextDirRel(g.def.title),
      icon: g.def.icon,
    })
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
  [recordsOf],
  (tree): Readonly<Record<string, EntityRecord>> => {
    const byId: Record<string, EntityRecord> = {}
    for (const r of recordsOf(tree)) byId[r.id] ??= r
    return byId
  },
)

export const pagesOf = entityMemo([], (tree): readonly ConnPage[] =>
  recordsOf(tree)
    .filter((r) => r.kind === 'page')
    .map(({ id, title, path }) => ({ id, title, path })),
)

/** Last-wins where two files claim one id: the window shows the page; the host's writers refuse it (`heldPages.ts`'s `indicesOf`). */
export const pagesByIdOf = entityMemo(
  [],
  (tree): ReadonlyMap<string, ConnPage> => new Map(pagesOf(tree).map((p) => [p.id, p])),
)

export const livePagePath = (
  tree: NexusTree | null,
  target: { id: string; path: string },
): string => (tree && pagesByIdOf(tree).get(target.id)?.path) ?? target.path

export const pageIndexOf = entityMemo([], (tree): PageIndex => buildPageIndex(pagesOf(tree)))
