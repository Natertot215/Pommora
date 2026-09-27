import {
  DEFAULT_NEW_NAME,
  type MutateRequest,
  type RenameHost,
  spaceCreator,
} from '../Nexus/mutateRequest'
import { relDirname } from '../Paths/posix'
import { placeAt, placeNew } from '../Views/creationOrder'
import { containerAt, findContainerWhere } from '../Nexus/treePatch'
import { useSession, windowTargetOf } from '../Session/store'

export async function newPageAdjacent(
  path: string,
  where: 'above' | 'below',
  host?: RenameHost,
): Promise<void> {
  const { tree, mutate, beginRename } = useSession.getState()
  if (!tree) return
  const parentPath = relDirname(path)
  const container = containerAt(tree, parentPath)
  if (!container) return
  const anchor = container.pages.find((p) => p.path === path)
  if (!anchor) return
  const req = placeAt(
    { op: 'createPage', parentPath, name: DEFAULT_NEW_NAME },
    container.pages.map((p) => p.id),
    anchor.id,
    where,
  )
  await mutate(req, (created) => beginRename(created.path, true, host))
}

export async function newSpaceAdjacent(
  id: string,
  where: 'above' | 'below',
  host?: RenameHost,
): Promise<void> {
  const { tree, mutate, beginRename } = useSession.getState()
  const group = tree?.contexts.find((g) => g.spaces.some((s) => s.id === id))
  if (!group) return
  const req = placeAt(
    spaceCreator(group.def).req,
    group.spaces.map((s) => s.id),
    id,
    where,
  )
  await mutate(req, (created) => beginRename(created.path, true, host))
}

/** An unanchored create, placed by its kind's placement setting and named in place. */
export async function createNamed(req: MutateRequest, host?: RenameHost): Promise<void> {
  const { tree, personalization, mutate, beginRename } = useSession.getState()
  await mutate(tree ? placeNew(tree, req, personalization) : req, (created) =>
    beginRename(created.path, true, host),
  )
}

export async function newPage(inWindow: boolean): Promise<void> {
  const s = useSession.getState()
  const { tree, personalization, mutate } = s
  if (!tree) return
  const from = inWindow ? windowTargetOf(s) : s.selection
  let parentPath: string | null = null
  if (from?.kind === 'collection' || from?.kind === 'set')
    parentPath = findContainerWhere(tree, (n) => n.id === from.id)?.path ?? null
  else if (from?.kind === 'page') parentPath = relDirname(from.path)
  if (parentPath === null) parentPath = tree.collections[0]?.path ?? null
  if (parentPath === null) return
  await mutate(
    placeNew(tree, { op: 'createPage', parentPath, name: DEFAULT_NEW_NAME }, personalization),
    (created) => {
      const page = { kind: 'page', id: created.id, path: created.path } as const
      return inWindow ? s.openWindowTab(page) : s.select(page, { newTab: false })
    },
  )
}
