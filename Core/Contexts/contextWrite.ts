import { basename, join, isMarkdownFile } from '../Paths/posix'
import { contextKey } from './contexts'
import { namesValue, stripList } from '../Files/rootValues'
import { contextWorldOf, type ContextWorld } from './contextResolve'
import {
  pageWorldOf,
  rewriteRaw,
  rewriteRootAt,
  spaceWorldOf,
  writeSpaceSidecar,
  writtenRoot,
} from '../Nexus/governedRoot'
import { contextDirRel, spaceDirRel } from '../Paths/nexusPaths'
import { seedBoard } from '../Tiles/tiles'
import { writeTileDocAt } from '../Tiles/tileDoc'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { reachReport } from '../Nexus/configReach'
import { spaceAt } from '../Nexus/treePatch'
import type { MutateContext } from '../Nexus/mutate'
import { type MutateReply, type MutateRequest, type PutBack, undoOf } from '../Nexus/mutateRequest'
import type { ContextGroup, NexusTree, SpaceNode } from '../Nexus/tree'
import { isColorKey } from '@pommora/uix/Theme/colors'
import { ok, fail, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, withContextAt } from './contextsRegistry'
import { newId } from '../Nexus/ids'
import { createDisambiguated, freeName, nameError } from '../Paths/names'
import { atomicWriteFile, pathExists, setOrDrop, withIds } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { contextsDir, tileFilePath } from '../Paths/paths'
import { createFolderEntity } from '../Nexus/folderEntity'
import { COLOR_KEY, ORDER_KEY } from './spaceSidecar'
import { listOf } from '../Contract/validators'

/** Unknown ids fail — a stale renderer id must never serialize as a guess. */
export function contextTarget(
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Result<{ key: string; value: string[] | undefined }> {
  const titles: string[] = []
  for (const id of spaceIds) {
    const space = world.spaceById.get(id)
    if (!space) return fail('not-found', 'Unknown Space.')
    titles.push(space.title)
  }
  const group = world.groupById.get(contextId)
  if (!group) return fail('not-found', 'Unknown Context.')
  return ok({ key: contextKey(group.def.title), value: titles.length ? titles : undefined })
}

/** Answers what the page held under the Context's key, as `PutBack.before` spells it. */
export async function setPageContext(
  absFile: string,
  root: string,
  contextId: string,
  spaceIds: string[],
): Promise<Result<unknown>> {
  return machine().lock(absFile, async () => {
    const governed = await pageWorldOf(root, absFile)
    const applied = contextTarget(governed.contexts, contextId, spaceIds)
    if (!applied.ok) return applied
    const { key, value } = applied.value
    let before: unknown
    const written = await rewriteRootAt(absFile, (page) => {
      before = page.pair(key)
      return rewriteRaw((raw) => writtenRoot(raw, key, value, governed))(page)
    })
    return written.ok ? ok(before) : written
  })
}

async function setSpaceContext(
  root: string,
  tree: NexusTree,
  a: SpaceNode,
  own: ContextGroup,
  contextId: string,
  targetSpaceIds: string[],
): Promise<Result<{ skipped: number; entries: PutBack[] }>> {
  const world = spaceWorldOf(tree)
  if (targetSpaceIds.includes(a.id)) return fault('A Space can’t link itself.')
  const applied = contextTarget(world.contexts, contextId, targetSpaceIds)
  if (!applied.ok) return applied
  const { key, value } = applied.value
  const backKey = contextKey(own.def.title)
  const entries: PutBack[] = []
  let skipped = 0
  const namesA = namesValue(a.title)
  for (const far of world.contexts.groupById.get(contextId)?.spaces ?? []) {
    if (far.id === a.id) continue
    const wants = targetSpaceIds.includes(far.id)
    // Decided on what the far file holds, inside its own read-modify-write, never on the tree's copy of it. The far list is edited rather than replaced, so its other members stay.
    const half = await writeSpaceSidecar(join(root, far.path), (raw) => {
      const held = listOf(raw[backKey] ?? [])
      if (held.some(namesA) === wants) return null
      entries.push({ file: far.path, fieldId: own.def.id, before: raw[backKey] })
      const without = stripList(held, namesA) ?? held
      const next = wants ? [...without, a.title] : without
      return writtenRoot(raw, backKey, next.length ? next : undefined, world)
    })
    if (!half.ok) skipped++
  }
  let before: unknown
  const written = await writeSpaceSidecar(join(root, a.path), (raw) => {
    before = raw[key]
    return writtenRoot(raw, key, value, world)
  })
  return written.ok
    ? ok({ skipped, entries: [...entries, { file: a.path, fieldId: contextId, before }] })
    : written
}

export async function setContextOp(
  { root }: MutateContext,
  { path, contextId, spaceIds }: Extract<MutateRequest, { op: 'setContext' }>,
): Promise<MutateReply> {
  const target = await mutableTarget(root, path, ['page', 'space'])
  if (!target.ok) return target
  const tree = await liveTreeOf(root)
  const world = contextWorldOf(tree.contexts)
  const group = world.groupById.get(contextId)
  const under = group && `${contextDirRel(group.def.title)}/`
  // A Space missing from its group has no id to pick, so a page's tag write would drop it from the list it replaces and a Space link would give it no far half; the other Space writes keep what they can't resolve as written.
  const unread =
    under && tree.unreadable?.find((u) => u.kind === 'space' && u.path.startsWith(under))
  if (unread) return fault(`Unreadable Space sidecar: ${basename(unread.path)}`)
  if (isMarkdownFile(path)) {
    const before = await setPageContext(target.value, root, contextId, spaceIds)
    return before.ok ? undoOf([{ file: path, fieldId: contextId, before: before.value }]) : before
  }
  const owner = spaceAt(tree, path)
  const own = owner && world.groupById.get(owner.contextId)
  if (!owner || !own) return fail('invalid-path', 'Not a context-taggable entity.')
  const linked = await setSpaceContext(root, tree, owner, own, contextId, spaceIds)
  if (!linked.ok) return linked
  const { skipped, entries } = linked.value
  return undoOf(entries, skipped ? { cascade: reachReport({ skipped, hosts: [] }) } : {})
}

export async function createContextGroup(
  root: string,
  name: string,
  id: string,
): Promise<Result<{ path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  let title = name
  const written = await mutateRegistryFile(root, (cur) => {
    title = freeName(
      name,
      cur.contexts.map((c) => c.title),
    )
    // No icon: a fresh group resolves to the kind's glyph and follows a nexus default; stamping one would outrank that override forever.
    return withContextAt({ id, title })(cur)
  })
  if (!written.ok) return written
  await machine().mkdir(join(contextsDir(root), title))
  return ok({ path: contextDirRel(title) })
}

export async function createSpace(
  root: string,
  contextId: string,
  name: string,
  id: string,
): Promise<Result<{ path: string }>> {
  const group = contextWorldOf((await liveTreeOf(root)).contexts).groupById.get(contextId)
  if (!group) return fail('not-found', 'Unknown Context.')
  const parent = join(contextsDir(root), group.def.title)
  await machine().mkdir(parent)
  const created = await createDisambiguated(
    name,
    (n) => createFolderEntity(parent, 'space', n, id),
    (n) => pathExists(join(parent, n)),
  )
  if (!created.ok) return created
  const tileIds = [newId(), newId(), newId(), newId()]
  for (const tid of tileIds) await atomicWriteFile(tileFilePath(created.value.path, tid), '')
  await writeTileDocAt(created.value.path, () => seedBoard(tileIds))
  return ok({ path: spaceDirRel(group.def.title, basename(created.value.path)) })
}

export async function setSpaceColor(
  root: string,
  spaceId: string,
  color: string | undefined,
): Promise<Result<null>> {
  if (color !== undefined && !isColorKey(color))
    return fail('invalid-name', `"${color}" is not a chip color.`)
  const space = contextWorldOf((await liveTreeOf(root)).contexts).spaceById.get(spaceId)
  if (!space) return fail('not-found', 'Unknown Space.')
  return writeSpaceSidecar(join(root, space.path), (cur) => setOrDrop(cur, COLOR_KEY, color))
}

export const setSpaceRowOrder = (absSpaceDir: string, ids: string[]): Promise<Result<null>> =>
  writeSpaceSidecar(absSpaceDir, (raw) => withIds(raw, ORDER_KEY, ids))
