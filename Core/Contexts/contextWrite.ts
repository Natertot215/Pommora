import { basename, join, isMarkdownFile, relative } from '../Paths/posix'
import { contextKey } from './contexts'
import { normalizeTitle } from '../Connections/connections'
import { heldValue, namesValue, stripList } from '../Properties/pageValue'
import {
  contextWorldOf,
  governedWorld,
  spaceWorldOf,
  type ContextWorld,
  type GovernedWorld,
} from './contextResolve'
import { contextDirRel, spaceDirRel, SPACE_SIDECAR } from '../Paths/nexusPaths'
import { seedBoard } from '../Tiles/tiles'
import { writeTileDocAt } from '../Tiles/tileDoc'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { reachReport } from '../Nexus/configReach'
import { owningCollection, spaceAt } from '../Nexus/treePatch'
import type { MutateContext } from '../Nexus/mutate'
import { done, type MutateReply, type MutateRequest } from '../Nexus/mutateRequest'
import { assignedDefs } from '../Properties/assignment'
import { applyAdoptions } from '../Properties/optionOps'
import type { ContextGroup, NexusTree, SpaceNode } from '../Nexus/tree'
import type { Adoption } from '../Properties/propertyValue'
import { isColorKey } from '@pommora/uix/Theme/colors'
import { ok, fail, type Result, fault } from '../Contract/result'
import { mutateRegistryFile, withContextAt } from './contextsRegistry'
import { newId } from '../Nexus/ids'
import { createDisambiguated, freeName, nameError } from '../Paths/names'
import { atomicWriteFile, pathExists, rmwJsonStrict, setOrDrop } from '../Files/atomicWrite'
import { machine } from '../Platform/machine'
import { setGovernedRootKey, writtenRoot } from '../Properties/governedWrite'
import { contextsDir, tileFilePath } from '../Paths/paths'
import { createFolderEntity } from '../Nexus/folderEntity'
import { COLOR_KEY, ORDER_KEY } from './spaceSidecar'
import type { Json } from '../Files/stableJson'
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

export async function setPageContext(
  absFile: string,
  root: string,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  const adoptions = await machine().lock(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    const governed = await governedWorldOf(root, absFile)
    const applied = contextTarget(governed.contexts, contextId, spaceIds)
    if (!applied.ok) return applied
    const { key, value } = applied.value
    return ok(await setGovernedRootKey(absFile, key, value, governed))
  })
  if (!adoptions.ok) return adoptions
  await applyAdoptions(root, adoptions.value)
  return ok(null)
}

export async function governedWorldOf(root: string, absFile: string): Promise<GovernedWorld> {
  const tree = await liveTreeOf(root)
  const owner = owningCollection(tree, relative(root, absFile))
  return governedWorld(tree, await assignedDefs(root, owner ? join(root, owner.path) : null))
}

export async function writeSpaceSidecar(
  absSpaceDir: string,
  mutate: (raw: Json) => Json | null,
): Promise<Result<null>> {
  const written = await rmwJsonStrict(join(absSpaceDir, SPACE_SIDECAR), mutate)
  return written.ok ? ok(null) : written
}

async function setSpaceContext(
  root: string,
  tree: NexusTree,
  a: SpaceNode,
  own: ContextGroup,
  contextId: string,
  targetSpaceIds: string[],
): Promise<Result<number>> {
  const world = spaceWorldOf(tree)
  if (targetSpaceIds.includes(a.id)) return fault('A Space can’t link itself.')
  const applied = contextTarget(world.contexts, contextId, targetSpaceIds)
  if (!applied.ok) return applied
  const { key, value } = applied.value
  const backKey = contextKey(own.def.title)
  const adoptions: Adoption[] = []
  let skipped = 0
  const namesA = namesValue(a.title)
  const titled = world.contexts.spacesByTitle.get(own.def.id)
  for (const far of world.contexts.groupById.get(contextId)?.spaces ?? []) {
    if (far.id === a.id) continue
    const wants = targetSpaceIds.includes(far.id)
    // Decided on what the far file holds, inside its own read-modify-write, never on the tree's copy of it. The far list is edited rather than replaced, so with casing resolved every spelling's members stay.
    const half = await writeSpaceSidecar(join(root, far.path), (raw) => {
      if (listOf(heldValue(raw, backKey, false) ?? []).some(namesA) === wants) return null
      const held = listOf(heldValue(raw, backKey, world.resolveCase) ?? [])
      const kept = stripList(held, namesA) ?? held
      const without = world.resolveCase
        ? kept.map((v) => titled?.get(normalizeTitle(v))?.title ?? v)
        : kept
      const next = wants ? [...without, a.title] : without
      return writtenRoot(raw, backKey, next.length ? next : undefined, world, adoptions)
    })
    if (!half.ok) skipped++
  }
  const written = await writeSpaceSidecar(join(root, a.path), (raw) =>
    writtenRoot(raw, key, value, world, adoptions),
  )
  await applyAdoptions(root, adoptions)
  return written.ok ? ok(skipped) : written
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
  if (isMarkdownFile(path))
    return done(await setPageContext(target.value, root, contextId, spaceIds))
  const owner = spaceAt(tree, path)
  const own = owner && world.groupById.get(owner.contextId)
  if (!owner || !own) return fail('invalid-path', 'Not a context-taggable entity.')
  const linked = await setSpaceContext(root, tree, owner, own, contextId, spaceIds)
  if (!linked.ok) return linked
  return ok(linked.value ? { cascade: reachReport({ skipped: linked.value, hosts: [] }) } : {})
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

export const setSpaceRowOrder = (
  absSpaceDir: string,
  contexts: string[],
  properties: string[],
): Promise<Result<null>> =>
  writeSpaceSidecar(absSpaceDir, (raw) =>
    setOrDrop(
      raw,
      ORDER_KEY,
      (contexts.length > 0 || properties.length > 0) && { contexts, properties },
    ),
  )
