// Ids arrive from the renderer; titles serialize here, through the live registry — never earlier.

import { readFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  contextKey,
  isGovernedContextKey,
  normalizeContextValue,
  type ContextDef,
  type ContextsRegistry,
} from '@shared/contexts'
import { reconcileContextKeys } from '@shared/contextResolve'
import { contextDirRel, spaceDirRel } from '@shared/nexusPaths'
import { blockHostKey, NEW_TILE_H } from '@shared/blocks'
import { writeKey } from '../Database/localState'
import type { SpaceNode } from '@shared/types'
import { isColorKey } from '@shared/theme'
import { ok, fail, type Result } from '@shared/result'
import { mutateRegistryFile, readRegistryStrict } from '../contextsRegistry'
import { adoptedId, newId } from '../ids'
import { atomicWriteFile, pathExists, readJsonStrict, rmwJsonStrict } from '../IO/atomicWrite'
import { serializeOnFile } from '../IO/fileLock'
import { isMarkdownFile } from '../IO/walk'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { splitFrontmatter } from '../readNexus'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { createFolderEntity } from './folderEntity'
import { nowIso, invalidContextTitle } from './util'

type Raw = Record<string, unknown>

interface SpaceRef {
  id: string
  title: string
  contextId: string
  contextTitle: string
  /** Absolute folder path. */
  dir: string
}

/** Everything a context write resolves through: the live registry plus every Space's
 *  id/title/folder, scanned fresh per operation (a handful of small dirs). */
export interface ContextWorld {
  registry: ContextsRegistry
  spacesByContext: Map<string, SpaceNode[]>
  spaceById: Map<string, SpaceRef>
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
        // unreadable/corrupt sidecar (an evicted cloud placeholder) fails the whole load —
        // a world missing a real Space would make the reconcile silently strip that
        // Space's valid tags from every file it touches.
        const sc = await readJsonStrict(join(dir, e.name, SPACE_SIDECAR))
        if (!sc.ok) {
          if (sc.error.code === 'not-found') continue
          return fail('operation-failed', `Unreadable Space sidecar: ${e.name}`)
        }
        const rel = spaceDirRel(def.title, e.name)
        // Mirror the walk's id adoption so an id-less sidecar resolves identically here.
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
  return ok({ registry: reg.value, spacesByContext, spaceById })
}

function defById(world: ContextWorld, contextId: string): ContextDef | undefined {
  return world.registry.contexts.find((c) => c.id === contextId)
}

/** Resolve target Space ids → titles through the live registry. Unknown ids fail —
 *  a stale renderer id must never serialize as a guess. */
function targetTitles(world: ContextWorld, spaceIds: string[]): Result<string[]> {
  const titles: string[] = []
  for (const id of spaceIds) {
    const ref = world.spaceById.get(id)
    if (!ref) return fail('not-found', 'Unknown Space.')
    titles.push(ref.title)
  }
  return ok(titles)
}

/** The reconciled root with the target key applied over it (set on values, removed on
 *  empty — no empties ever). */
function applyTarget(
  world: ContextWorld,
  raw: Raw,
  contextId: string,
  titles: string[],
): Result<{ root: Raw; key: string }> {
  const def = defById(world, contextId)
  if (!def) return fail('not-found', 'Unknown Context.')
  const { root } = reconcileContextKeys(raw, world.registry, world.spacesByContext)
  const key = contextKey(def.title)
  if (titles.length) root[key] = titles
  else delete root[key]
  return ok({ root, key })
}

/** Every context-shaped key across the original + next roots — the governed-key set a
 *  page merge needs so repaired keys rewrite and dropped keys delete. */
function governedContextKeys(raw: Raw, next: Raw, targetKey: string): string[] {
  const keys = new Set<string>([targetKey])
  for (const source of [raw, next]) {
    for (const k of Object.keys(source)) {
      if (isGovernedContextKey(k)) keys.add(k)
    }
  }
  return [...keys]
}

/** setContext on a `.md` page — the parenthesized key merges through the governed rewrite
 *  (foreign frontmatter + body untouched), under the page's own file lock. */
export async function setPageContext(
  absFile: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  const titles = targetTitles(world, spaceIds)
  if (!titles.ok) return titles
  return serializeOnFile(absFile, async () => {
    let existing: string
    try {
      existing = await readFile(absFile, 'utf8')
    } catch {
      return fail('not-found', 'Page not found.')
    }
    const raw = splitFrontmatter(existing)
    const applied = applyTarget(world, raw, contextId, titles.value)
    if (!applied.ok) return applied
    const keys = governedContextKeys(raw, applied.value.root, applied.value.key)
    const modeled: Raw = { modified_at: nowIso() }
    for (const k of keys) if (k in applied.value.root) modeled[k] = applied.value.root[k]
    const content = mergeFrontmatter(
      existing,
      modeled,
      [...keys, 'modified_at'],
      splitEnvelope(existing).body,
    )
    await atomicWriteFile(absFile, content)
    return ok(null)
  })
}

/** setContext on a Space's own `_space.json` (cross-Context allowed) — strict RMW,
 *  never fallback-to-empty. */
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
  const written = await rmwJsonStrict(join(ref.dir, SPACE_SIDECAR), (raw) => {
    const applied = applyTarget(world, raw, contextId, titles.value)
    if (!applied.ok) throw new Error(applied.error.message)
    return { ...applied.value.root, modified_at: nowIso() }
  }).catch(() => fail('operation-failed', 'Context write failed.'))
  return written.ok ? ok(null) : written
}

export async function setContextOnPath(
  abs: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  if (isMarkdownFile(abs)) return setPageContext(abs, world, contextId, spaceIds)
  const owner = [...world.spaceById.values()].find((ref) => ref.dir === abs)
  if (owner) return setSpaceContext(world, owner.id, contextId, spaceIds)
  return fail('invalid-path', 'Not a context-taggable entity.')
}

/** Append a new Context to the registry (ULID id, no singular) + mkdir its folder. Title
 *  collisions disambiguate like every other create ("New Context 2"). */
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
    // No icon: a fresh group has made no choice, so it resolves to the kind's glyph and follows a
    // nexus default. Stamping one would outrank that override forever.
    return { contexts: [...cur.contexts, { id, title }] }
  })
  if (!written.ok) return written
  if (!written.value.contexts.some((c) => c.id === id))
    return fail('exists', `"${title}" already exists.`)
  await mkdir(join(contextsDir(root), title), { recursive: true })
  return ok({ id, path: contextDirRel(title) })
}

/** Create a Space: folder + `_space.json` (no icon, no color) seeded with the 2×2 block
 *  document — four empty markdown tiles in two half/half bands, files first so a crash
 *  leaks at worst an orphan file, never an entry without one. */
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
  writeKey('blockDoc', blockHostKey({ kind: 'space', id: created.value.id }), {
    blocks: tileIds.map((tid) => ({ id: tid, type: 'markdown' })),
    layout: { bands: [band(tileIds[0], tileIds[1]), band(tileIds[2], tileIds[3])] },
    locked: false,
  })
  return ok({
    id: created.value.id,
    path: spaceDirRel(def.title, name),
  })
}

/** Set/clear a Space's chip color on its `_space.json` — ramp cells and the legacy anchor names. */
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
    const next: Raw = { ...cur, modified_at: nowIso() }
    if (color === undefined) delete next.color
    else next.color = color
    return next
  })
  return written.ok ? ok(null) : written
}
