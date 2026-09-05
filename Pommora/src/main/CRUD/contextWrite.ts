// Ids arrive from the renderer; titles serialize here, through the live registry — never earlier.

import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  contextKey,
  normalizeContextValue,
  parseContextKey,
  type ContextsRegistry,
} from '@shared/contexts'
import { NO_DEFS, reconcileGovernedRoot, type GovernedWorld } from '@shared/contextResolve'
import { contextDirRel, spaceDirRel } from '@shared/nexusPaths'
import { mintSeed, NEW_TILE_H } from '@shared/tiles'
import { writeTileDocAt } from '../tileDoc'
import type { PropertyDefinition } from '@shared/properties'
import { pageCollectionSidecar } from '@shared/schemas'
import { getLiveTree } from '../liveTree'
import { collectionFolderOf } from './assignment'
import { applyAdoptions } from './optionOps'
import { readRegistry } from '../IO/propertiesRegistry'
import { readSidecar } from '../sidecarIO'
import type { NexusTree, SpaceNode } from '@shared/types'
import { isColorKey } from '@shared/theme'
import { ok, fail, type Result } from '@shared/result'
import { mutateRegistryFile, readRegistryStrict } from '../contextsRegistry'
import { adoptedId, newId } from '../ids'
import { atomicWriteFile, pathExists, readJsonStrict, rmwJsonStrict } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { isMarkdownFile } from '../IO/walk'
import { setGovernedRootKeys } from './governedWrite'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { createFolderEntity } from './folderEntity'
import { invalidContextTitle } from './util'

type Raw = Record<string, unknown>

interface SpaceRef {
  id: string
  title: string
  contextId: string
  contextTitle: string
  /** Absolute folder path. */
  dir: string
}

/** The live registry plus every Space's id/title/folder, scanned fresh per operation. */
export interface ContextWorld extends GovernedWorld {
  registry: ContextsRegistry
  spaceById: Map<string, SpaceRef>
}

export async function assignedDefs(
  root: string,
  collectionFolder: string | null,
): Promise<ReadonlyMap<string, PropertyDefinition>> {
  if (collectionFolder === null) return NO_DEFS
  const held = getLiveTree()
  if (held?.nexus.rootPath === root) {
    const node = held.collections.find((c) => join(root, c.path) === collectionFolder)
    if (node) return new Map((node.properties ?? []).map((d) => [d.name, d]))
  }
  const registry = (await readRegistry(root)).defs
  const sidecar = await readSidecar(collectionFolder, 'collection', pageCollectionSidecar)
  const assigned = (sidecar?.properties as string[] | undefined) ?? []
  return new Map(
    assigned.flatMap((id) => (registry[id] ? [[registry[id].name, registry[id]] as const] : [])),
  )
}

/** A strict registry read that failed leaves property repair alone. */
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
      for (const e of await readdir(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue
        // STRICT per sidecar: a folder without one simply isn't a Space, but an
        // unreadable/corrupt sidecar fails the whole load — a world missing a real Space
        // would make the reconcile silently strip that Space's valid tags from every file it touches.
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
  const adoptions = await serializeOnFile(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    const defs = await assignedDefs(root, await collectionFolderOf(root, absFile))
    return ok(
      await setGovernedRootKeys(absFile, value ? { [key]: value } : {}, [key], { ...world, defs }),
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

// A failed strict Contexts load skips the context arm, never the edit.
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

/** Strict RMW, never fallback-to-empty. */
export async function setSpaceContext(
  world: ContextWorld,
  spaceId: string,
  contextId: string,
  targetSpaceIds: string[],
): Promise<Result<null>> {
  const ref = world.spaceById.get(spaceId)
  if (!ref) return fail('not-found', 'Unknown Space.')
  const titles = targetTitles(world, targetSpaceIds)
  if (!titles.ok) return titles
  const applied = applyTarget(world, contextId, titles.value)
  if (!applied.ok) return applied
  const { key, value } = applied.value
  const written = await rmwJsonStrict(join(ref.dir, SPACE_SIDECAR), (raw) => {
    const { root } = reconcileGovernedRoot(raw, world)
    if (value) root[key] = value
    else delete root[key]
    return root
  }).catch(() => fail('operation-failed', 'Context write failed.'))
  return written.ok ? ok(null) : written
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

/** Title collisions disambiguate like every other create ("New Context 2"). */
export async function createContextGroup(
  root: string,
  name: string,
): Promise<Result<{ id: string; path: string }>> {
  if (invalidContextTitle(name)) return fail('invalid-name', `"${name}" is not a valid name.`)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  // Case-insensitive uniqueness: the filesystem is — a case-variant twin would silently
  // share one folder with the existing group.
  const taken = new Set(reg.value.contexts.map((c) => normalizeContextValue(c.title)))
  let title = name
  for (let n = 2; taken.has(normalizeContextValue(title)) && n <= 50; n++) title = `${name} ${n}`
  if (taken.has(normalizeContextValue(title))) return fail('exists', `"${name}" already exists.`)
  const id = newId()
  const written = await mutateRegistryFile(root, (cur) => {
    if (cur.contexts.some((c) => c.title === title)) return cur
    // No icon: a fresh group resolves to the kind's glyph and follows a nexus default.
    // Stamping one would outrank that override forever.
    return { contexts: [...cur.contexts, { id, title }] }
  })
  if (!written.ok) return written
  if (!written.value.contexts.some((c) => c.id === id))
    return fail('exists', `"${title}" already exists.`)
  await mkdir(join(contextsDir(root), title), { recursive: true })
  return ok({ id, path: contextDirRel(title) })
}

/** Seeded with the 2×2 tile document — four empty markdown tiles in two half/half bands.
 *  Files first, so a crash leaks at worst an orphan file, never an entry without one. */
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
  await mkdir(parent, { recursive: true })
  const created = await createFolderEntity(parent, 'space', name)
  if (!created.ok) return created
  const tileIds = [newId(), newId(), newId(), newId()]
  for (const tid of tileIds) await atomicWriteFile(join(created.value.path, `${tid}.md`), '')
  const tile = (tid: string): Raw => ({ kind: 'tile', id: tid, h: NEW_TILE_H })
  const band = (a: string, b: string): Raw => ({
    node: { kind: 'row', ratios: [0.5, 0.5], children: [tile(a), tile(b)] },
  })
  await writeTileDocAt(created.value.path, () => ({
    layout: { bands: [band(tileIds[0], tileIds[1]), band(tileIds[2], tileIds[3])] },
    tiles: tileIds.map((tid) => mintSeed('markdown', tid)),
    locked: false,
  }))
  return ok({
    id: created.value.id,
    path: spaceDirRel(def.title, name),
  })
}

/** Accepts ramp cells and the legacy anchor names. */
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
  const written = await rmwJsonStrict(join(ref.dir, SPACE_SIDECAR), (cur) => {
    const next: Raw = { ...cur }
    if (color === undefined) delete next.color
    else next.color = color
    return next
  })
  return written.ok ? ok(null) : written
}
