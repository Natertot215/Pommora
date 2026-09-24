import { join } from '../Paths/posix'
import { normalizeTitle } from '../Connections/connections'
import { contextKey, parseContextKey, type ContextsRegistry } from './contexts'
import {
  listOf,
  NO_DEFS,
  preservedChanges,
  reconcileGovernedRoot,
  type GovernedWorld,
} from './contextResolve'
import { contextDirRel, spaceDirRel } from '../Paths/nexusPaths'
import { seedBoard } from '../Tiles/tiles'
import { writeTileDocAt } from '../Tiles/tileDoc'
import { getLiveTree } from '../Nexus/liveTree'
import { assignedDefs, collectionFolderOf } from '../Properties/assignment'
import { applyAdoptions } from '../Properties/optionOps'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { isColorKey } from '@pommora/uix/Theme/colors'
import { ok, fail, type Result } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { adoptedId, newId } from '../Nexus/ids'
import { createDisambiguated, nameError } from '../Paths/names'
import {
  atomicWriteFile,
  pathExists,
  readJsonStrict,
  rmwJsonStrict,
  setOrDrop,
} from '../Files/atomicWrite'
import { noteSidecarWrite } from '../Nexus/valuesChanged'
import { isMarkdownFile, listEntries } from '../Files/walk'
import { machine } from '../Platform/machine'
import { setGovernedRootKeys } from '../Properties/governedWrite'
import { contextsDir, SPACE_SIDECAR, tileFilePath } from '../Paths/paths'
import { createFolderEntity } from '../Nexus/folderEntity'
import { COLOR_KEY, ORDER_KEY } from './spaceSidecar'

type Raw = Record<string, unknown>

interface SpaceRef {
  id: string
  title: string
  contextId: string
  contextTitle: string
  dir: string
  raw: Raw
}

interface ContextWorld extends GovernedWorld {
  registry: ContextsRegistry
  spaceById: Map<string, SpaceRef>
}

export const NO_CONTEXT_WORLD: Omit<GovernedWorld, 'defs'> = {
  registry: null,
  spacesByContext: new Map(),
}

export async function loadContextWorld(root: string): Promise<Result<ContextWorld>> {
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const spacesByContext = new Map<string, SpaceNode[]>()
  const spaceById = new Map<string, SpaceRef>()
  for (const def of reg.value.contexts) {
    const dir = join(contextsDir(root), def.title)
    const spaces: SpaceNode[] = []
    if (await pathExists(dir)) {
      for (const e of await listEntries(dir)) {
        if (e.kind !== 'dir') continue
        // STRICT per sidecar: a folder without one simply isn't a Space, but an unreadable/corrupt one fails the whole load — a world missing a real Space would make the reconcile silently strip that Space's valid tags from every file it touches.
        const sc = await readJsonStrict(join(dir, e.name, SPACE_SIDECAR))
        if (!sc.ok) {
          if (sc.error.code === 'not-found') continue
          return fail('operation-failed', `Unreadable Space sidecar: ${e.name}`)
        }
        const rel = spaceDirRel(def.title, e.name)
        const id = typeof sc.value.id === 'string' ? sc.value.id : adoptedId(rel)
        spaces.push({ kind: 'space', id, title: e.name, path: rel, contextId: def.id })
        spaceById.set(id, {
          id,
          title: e.name,
          contextId: def.id,
          contextTitle: def.title,
          dir: join(dir, e.name),
          raw: sc.value,
        })
      }
    }
    spacesByContext.set(def.id, spaces)
  }
  return ok({ registry: reg.value, spacesByContext, spaceById, defs: NO_DEFS })
}

/** Unknown ids fail — a stale renderer id must never serialize as a guess. */
function targetTitles(world: ContextWorld, spaceIds: string[]): Result<string[]> {
  const titles: string[] = []
  for (const id of spaceIds) {
    const ref = world.spaceById.get(id)
    if (!ref) return fail('not-found', 'Unknown Space.')
    titles.push(ref.title)
  }
  return ok(titles)
}

function applyTarget(
  world: ContextWorld,
  contextId: string,
  titles: string[],
): Result<{ key: string; value: string[] | undefined }> {
  const def = world.registry.contexts.find((c) => c.id === contextId)
  if (!def) return fail('not-found', 'Unknown Context.')
  return ok({ key: contextKey(def.title), value: titles.length ? titles : undefined })
}

export async function setPageContext(
  absFile: string,
  root: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  const titles = targetTitles(world, spaceIds)
  if (!titles.ok) return titles
  const applied = applyTarget(world, contextId, titles.value)
  if (!applied.ok) return applied
  const { key, value } = applied.value
  const adoptions = await machine().lock(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    const defs = await assignedDefs(root, await collectionFolderOf(root, absFile))
    return ok(
      await setGovernedRootKeys(root, absFile, value ? { [key]: value } : {}, [key], {
        ...world,
        defs,
      }),
    )
  })
  if (!adoptions.ok) return adoptions
  await applyAdoptions(root, adoptions.value)
  return ok(null)
}

export function contextDriftPresent(raw: Raw, tree: NexusTree | null): boolean {
  if (!tree) return true
  const spaces = new Map(
    tree.contexts.map((g) => [g.def.title, new Set(g.spaces.map((s) => s.title))]),
  )
  for (const [key, value] of Object.entries(raw)) {
    const title = parseContextKey(key)
    if (title === null) continue
    const titles = spaces.get(title)
    if (!titles) continue
    if (!Array.isArray(value) || value.length === 0) return true
    if (!value.every((v) => typeof v === 'string' && titles.has(v))) return true
  }
  return false
}

export async function loadGovernedWorld(
  root: string,
  absFile: string,
  raw: Raw,
): Promise<GovernedWorld> {
  const defs = await assignedDefs(root, await collectionFolderOf(root, absFile))
  const skipped: GovernedWorld = { ...NO_CONTEXT_WORLD, defs }
  const held = getLiveTree()
  if (!contextDriftPresent(raw, held?.nexus.rootPath === root ? held : null)) return skipped
  const world = await loadContextWorld(root)
  return world.ok ? { ...world.value, defs } : skipped
}

export async function writeSpaceSidecar(
  absSpaceDir: string,
  mutate: (raw: Raw) => Raw | null,
): Promise<Result<null>> {
  const written = await rmwJsonStrict(join(absSpaceDir, SPACE_SIDECAR), mutate)
  if (!written.ok) return written
  noteSidecarWrite(absSpaceDir)
  return ok(null)
}

const names = (raw: unknown, title: string): boolean =>
  listOf(raw).some((v) => typeof v === 'string' && normalizeTitle(v) === normalizeTitle(title))

export async function setSpaceContext(
  world: ContextWorld,
  spaceId: string,
  contextId: string,
  targetSpaceIds: string[],
): Promise<Result<null>> {
  const a = world.spaceById.get(spaceId)
  if (!a) return fail('not-found', 'Unknown Space.')
  if (targetSpaceIds.includes(spaceId))
    return fail('operation-failed', 'A Space can’t link itself.')
  const titles = targetTitles(world, targetSpaceIds)
  if (!titles.ok) return titles
  const applied = applyTarget(world, contextId, titles.value)
  if (!applied.ok) return applied
  const { key, value } = applied.value
  const backKey = contextKey(a.contextTitle)
  const repaired = (raw: Raw): Raw => ({
    ...raw,
    ...preservedChanges(reconcileGovernedRoot(raw, world), raw),
  })

  for (const s of world.spacesByContext.get(contextId) ?? []) {
    const far = world.spaceById.get(s.id)
    const wants = targetSpaceIds.includes(s.id)
    if (!far || far.id === a.id || names(far.raw[backKey], a.title) === wants) continue
    const half = await writeSpaceSidecar(far.dir, (raw) => {
      const base = repaired(raw)
      const held = listOf(base[backKey]).filter((v): v is string => typeof v === 'string')
      const without = held.filter((t) => normalizeTitle(t) !== normalizeTitle(a.title))
      const next = wants ? [...without, a.title] : without
      return setOrDrop(base, backKey, next.length > 0 && next)
    })
    if (!half.ok) return half
  }
  return writeSpaceSidecar(a.dir, (raw) => setOrDrop(repaired(raw), key, value))
}

export async function setContextOnPath(
  root: string,
  abs: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  if (isMarkdownFile(abs)) return setPageContext(abs, root, world, contextId, spaceIds)
  const owner = [...world.spaceById.values()].find((ref) => ref.dir === abs)
  if (owner) return setSpaceContext(world, owner.id, contextId, spaceIds)
  return fail('invalid-path', 'Not a context-taggable entity.')
}

export async function createContextGroup(
  root: string,
  name: string,
): Promise<Result<{ id: string; path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  // Case-insensitive uniqueness: the filesystem is — a case-variant twin would silently share one folder with the existing group.
  const taken = new Set(reg.value.contexts.map((c) => normalizeTitle(c.title)))
  return createDisambiguated(name, async (title) => {
    if (taken.has(normalizeTitle(title))) return fail('exists', `"${title}" already exists.`)
    const id = newId()
    const written = await mutateRegistryFile(root, (cur) => {
      if (cur.contexts.some((c) => c.title === title)) return cur
      // No icon: a fresh group resolves to the kind's glyph and follows a nexus default; stamping one would outrank that override forever.
      return { contexts: [...cur.contexts, { id, title }] }
    })
    if (!written.ok) return written
    if (!written.value.contexts.some((c) => c.id === id))
      return fail('exists', `"${title}" already exists.`)
    await machine().mkdir(join(contextsDir(root), title))
    return ok({ id, path: contextDirRel(title) })
  })
}

export async function createSpace(
  root: string,
  contextId: string,
  name: string,
): Promise<Result<{ id: string; path: string }>> {
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const def = reg.value.contexts.find((c) => c.id === contextId)
  if (!def) return fail('not-found', 'Unknown Context.')
  const parent = join(contextsDir(root), def.title)
  await machine().mkdir(parent)
  const created = await createFolderEntity(parent, 'space', name)
  if (!created.ok) return created
  const tileIds = [newId(), newId(), newId(), newId()]
  for (const tid of tileIds) await atomicWriteFile(tileFilePath(created.value.path, tid), '')
  await writeTileDocAt(created.value.path, () => seedBoard(tileIds))
  return ok({
    id: created.value.id,
    path: spaceDirRel(def.title, name),
  })
}

export async function setSpaceColor(
  root: string,
  spaceId: string,
  color: string | undefined,
): Promise<Result<null>> {
  if (color !== undefined && !isColorKey(color))
    return fail('invalid-name', `"${color}" is not a chip color.`)
  const world = await loadContextWorld(root)
  if (!world.ok) return world
  const ref = world.value.spaceById.get(spaceId)
  if (!ref) return fail('not-found', 'Unknown Space.')
  return writeSpaceSidecar(ref.dir, (cur) => setOrDrop(cur, COLOR_KEY, color))
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
