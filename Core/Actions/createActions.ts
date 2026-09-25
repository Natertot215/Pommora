import {
  DEFAULT_NEW_NAME,
  type MutateRequest,
  type RenameHost,
  spaceCreator,
} from '../Nexus/mutateRequest'
import { relDirname } from '../Paths/posix'
import { orderWithSlot, placeNew } from '../Views/creationOrder'
import { findContainerWhere } from '../Nexus/treePatch'
import { useSession } from '../Session/store'

export async function newPageAdjacent(
  path: string,
  where: 'above' | 'below',
  host?: RenameHost,
): Promise<void> {
  const { tree, mutate, beginRename } = useSession.getState()
  if (!tree) return
  const parentPath = relDirname(path)
  const container = findContainerWhere(tree, (n) => n.path === parentPath)
  if (!container) return
  const anchor = container.pages.find((p) => p.path === path)
  if (!anchor) return
  const order = orderWithSlot(
    container.pages.map((p) => p.id),
    anchor.id,
    where,
  )
  await mutate({ op: 'createPage', parentPath, name: DEFAULT_NEW_NAME, order }, (created) =>
    beginRename(created.path, true, host),
  )
}

export async function newSpaceAdjacent(
  id: string,
  where: 'above' | 'below',
  host?: RenameHost,
): Promise<void> {
  const { tree, mutate, beginRename } = useSession.getState()
  const group = tree?.contexts.find((g) => g.spaces.some((s) => s.id === id))
  if (!group) return
  const order = orderWithSlot(
    group.spaces.map((s) => s.id),
    id,
    where,
  )
  await mutate({ ...spaceCreator(group.def).req, order }, (created) =>
    beginRename(created.path, true, host),
  )
}

/** An unanchored create, placed by its kind's placement setting and named in place. */
export async function createNamed(req: MutateRequest, host?: RenameHost): Promise<void> {
  const { tree, personalization, mutate, beginRename } = useSession.getState()
  await mutate(tree ? placeNew(tree, req, personalization) : req, (created) =>
    beginRename(created.path, true, host),
  )
}

export async function newPage(): Promise<void> {
  const { tree, selection, personalization, mutate, select } = useSession.getState()
  if (!tree) return
  let parentPath: string | null = null
  if (selection.kind === 'collection' || selection.kind === 'set')
    parentPath = findContainerWhere(tree, (n) => n.id === selection.id)?.path ?? null
  else if (selection.kind === 'page') parentPath = relDirname(selection.path)
  if (parentPath === null) parentPath = tree.collections[0]?.path ?? null
  if (parentPath === null) return
  await mutate(
    placeNew(tree, { op: 'createPage', parentPath, name: DEFAULT_NEW_NAME }, personalization),
    (created) => select({ kind: 'page', id: created.id, path: created.path }, { newTab: false }),
  )
}
