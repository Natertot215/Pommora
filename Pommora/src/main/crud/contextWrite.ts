// The Contexts & Spaces write layer: create ops, the setContext family (one per entity
// kind — page frontmatter, agenda JSON, `_space.json`), color/singular setters, and the
// per-file reconcile every context write runs on the root it's already rewriting (repair
// near-misses, drop unknowns, migrate legacy tierN in place). Ids arrive from the
// renderer; titles serialize here, through the live registry — never earlier.

import { readFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  contextKey,
  invalidContextTitle,
  isGovernedContextKey,
  type ContextDef,
  type ContextsRegistry,
} from '@shared/contexts'
import { reconcileContextKeys } from '@shared/contextResolve'
import { NEW_TILE_H } from '@shared/blocks'
import { agendaKindOf } from '@shared/agenda'
import { CHIP_SOLID_COLORS, type SpaceNode } from '@shared/types'
import { ok, fail, type Result } from '@shared/result'
import { mutateRegistryFile, readRegistryStrict } from '../contextsRegistry'
import { adoptedId, newId } from '../ids'
import {
  atomicWriteFile,
  pathExists,
  readJsonObject,
  readJsonStrict,
  rmwJsonStrict,
  writeJson,
} from '../io/atomicWrite'
import { serializeOnFile } from '../io/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { splitFrontmatter } from '../readNexus'
import { contextsDir, SPACE_SIDECAR } from '../paths'
import { createFolderEntity } from './folderEntity'
import { nowIso } from './util'

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
          return fail('operation-failed', `Unreadable Space sidecar: ${e.name}`, 'contexts')
        }
        const rel = `.nexus/contexts/${def.title}/${e.name}`
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

/** Reconcile a root being rewritten anyway: migrate legacy `tierN` ULID arrays to
 *  bracketed title keys (unresolvable ids drop), then run the per-value repair pass. */
export function reconcileWriteRoot(world: ContextWorld, raw: Raw): { root: Raw; changed: boolean } {
  const out: Raw = { ...raw }
  let changed = false
  for (const level of [1, 2, 3]) {
    const field = `tier${level}`
    if (!(field in out)) continue
    const arr = out[field]
    const def = world.registry.contexts.find((c) => c.id === `_tier${level}`)
    if (def && Array.isArray(arr)) {
      const titles = arr
        .map((v) => (typeof v === 'string' ? world.spaceById.get(v) : undefined))
        .filter((ref): ref is SpaceRef => ref?.contextId === `_tier${level}`)
        .map((ref) => ref.title)
      if (titles.length) {
        const key = contextKey(def.title)
        const existing = Array.isArray(out[key]) ? (out[key] as unknown[]) : []
        out[key] = [...existing, ...titles.filter((t) => !existing.includes(t))]
      }
    }
    delete out[field]
    changed = true
  }
  const rec = reconcileContextKeys(out, world.registry, world.spacesByContext)
  return { root: rec.root, changed: changed || rec.changed }
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
    if (!ref) return fail('not-found', 'Unknown Space.', 'contexts')
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
  if (!def) return fail('not-found', 'Unknown Context.', 'contexts')
  const { root } = reconcileWriteRoot(world, raw)
  const key = contextKey(def.title)
  if (titles.length) root[key] = titles
  else delete root[key]
  return ok({ root, key })
}

/** Every context-shaped key across the original + next roots — the governed-key set a
 *  page merge needs so repaired keys rewrite and dropped keys (tierN included) delete. */
function governedContextKeys(raw: Raw, next: Raw, targetKey: string): string[] {
  const keys = new Set<string>([targetKey])
  for (const source of [raw, next]) {
    for (const k of Object.keys(source)) {
      if (isGovernedContextKey(k)) keys.add(k)
    }
  }
  return [...keys]
}

/** setContext on a `.md` page — the bracketed key merges through the governed rewrite
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
      return fail('not-found', 'Page not found.', 'page')
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

/** setContext on an agenda item's JSON root — whole-root rewrite under its lock. */
export async function setAgendaContext(
  absFile: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  const titles = targetTitles(world, spaceIds)
  if (!titles.ok) return titles
  return serializeOnFile(absFile, async () => {
    const raw = await readJsonObject(absFile)
    if (!raw) return fail('not-found', 'Agenda item not found.', 'agenda')
    const applied = applyTarget(world, raw, contextId, titles.value)
    if (!applied.ok) return applied
    await writeJson(absFile, { ...applied.value.root, modified_at: nowIso() })
    return ok(null)
  })
}

/** setContext on a Space's own `_space.json` (cross-Context allowed) — strict RMW,
 *  never fallback-to-empty. */
export async function setSpaceContext(
  root: string,
  world: ContextWorld,
  spaceId: string,
  contextId: string,
  targetSpaceIds: string[],
): Promise<Result<null>> {
  const ref = world.spaceById.get(spaceId)
  if (!ref) return fail('not-found', 'Unknown Space.', 'contexts')
  const titles = targetTitles(world, targetSpaceIds)
  if (!titles.ok) return titles
  const sidecar = join(ref.dir, SPACE_SIDECAR)
  return serializeOnFile(sidecar, async () => {
    const written = await rmwJsonStrict(sidecar, (raw) => {
      const applied = applyTarget(world, raw, contextId, titles.value)
      if (!applied.ok) throw new Error(applied.error.message)
      return { ...applied.value.root, modified_at: nowIso() }
    }).catch(() => fail('operation-failed', 'Context write failed.', 'contexts'))
    return written.ok ? ok(null) : written
  })
}

/** Dispatch setContext by what the path IS: a page file, an agenda file, or a Space
 *  folder (its `_space.json`). */
export async function setContextOnPath(
  root: string,
  abs: string,
  world: ContextWorld,
  contextId: string,
  spaceIds: string[],
): Promise<Result<null>> {
  if (abs.toLowerCase().endsWith('.md')) return setPageContext(abs, world, contextId, spaceIds)
  if (agendaKindOf(abs)) return setAgendaContext(abs, world, contextId, spaceIds)
  const owner = [...world.spaceById.values()].find((ref) => ref.dir === abs)
  if (owner) return setSpaceContext(root, world, owner.id, contextId, spaceIds)
  return fail('invalid-path', 'Not a context-taggable entity.', 'contexts')
}

/** Append a new Context to the registry (ULID id; singular defaults to the title until
 *  its Settings edits it) + mkdir its folder. Title collisions disambiguate like every
 *  other create ("New Context 2"). */
export async function createContextGroup(
  root: string,
  name: string,
): Promise<Result<{ id: string; path: string }>> {
  if (invalidContextTitle(name)) return fail('invalid-name', `"${name}" is not a valid name.`)
  const reg = await readRegistryStrict(root)
  if (!reg.ok) return reg
  const taken = new Set(reg.value.contexts.map((c) => c.title))
  let title = name
  for (let n = 2; taken.has(title) && n <= 50; n++) title = `${name} ${n}`
  if (taken.has(title)) return fail('exists', `"${name}" already exists.`)
  const id = newId()
  const written = await mutateRegistryFile(root, (cur) => {
    if (cur.contexts.some((c) => c.title === title)) return cur
    return { contexts: [...cur.contexts, { id, title, singular: title }] }
  })
  if (!written.ok) return written
  if (!written.value.contexts.some((c) => c.id === id))
    return fail('exists', `"${title}" already exists.`)
  await mkdir(join(contextsDir(root), title), { recursive: true })
  return ok({ id, path: `.nexus/contexts/${title}` })
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
  if (!def) return fail('not-found', 'Unknown Context.', 'contexts')
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
  const seeded = await rmwJsonStrict(join(created.value.path, SPACE_SIDECAR), (cur) => ({
    ...cur,
    blocks: tileIds.map((tid) => ({ id: tid, type: 'markdown' })),
    layout: { bands: [band(tileIds[0], tileIds[1]), band(tileIds[2], tileIds[3])] },
  }))
  if (!seeded.ok) return seeded
  return ok({
    id: created.value.id,
    path: `.nexus/contexts/${def.title}/${name}`,
  })
}

/** Set/clear a Space's chip color on its `_space.json` — chip solids only. */
export async function setSpaceColor(
  root: string,
  spaceId: string,
  color: string | undefined,
): Promise<Result<null>> {
  if (color !== undefined && !(CHIP_SOLID_COLORS as readonly string[]).includes(color))
    return fail('invalid-name', `"${color}" is not a chip solid.`, 'contexts')
  const world = await loadContextWorld(root)
  if (!world.ok) return world
  const ref = world.value.spaceById.get(spaceId)
  if (!ref) return fail('not-found', 'Unknown Space.', 'contexts')
  const sidecar = join(ref.dir, SPACE_SIDECAR)
  const written = await serializeOnFile(sidecar, () =>
    rmwJsonStrict(sidecar, (cur) => {
      const next: Raw = { ...cur, modified_at: nowIso() }
      if (color === undefined) delete next.color
      else next.color = color
      return next
    }),
  )
  return written.ok ? ok(null) : written
}

/** Set a Context's singular label in the registry. */
export async function setContextSingular(
  root: string,
  contextId: string,
  singular: string,
): Promise<Result<null>> {
  const trimmed = singular.trim()
  if (!trimmed) return fail('invalid-name', 'A singular label can’t be empty.', 'contexts')
  const written = await mutateRegistryFile(root, (cur) => ({
    contexts: cur.contexts.map((c) => (c.id === contextId ? { ...c, singular: trimmed } : c)),
  }))
  return written.ok ? ok(null) : written
}
