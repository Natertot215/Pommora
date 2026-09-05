// The whole read engine: one recursive, read-only walk of a nexus root.
// No file is ever opened for writing.

import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parseDocument } from 'yaml'
import { admitContentFile } from './identityMark'
import { agendaContext, resolveFolderKind, type FolderKindContext } from './folderKind'
import type { CollectionNode, ContextGroup, NexusTree, PageNode, SetNode, SpaceNode } from './tree'
import {
  contextsRegistry as contextsRegistrySchema,
  parseContextKey,
  type ContextsRegistry,
} from '../Properties/contexts'
import { resolveContextKeys } from '../Properties/contextResolve'
import { savedView, type SavedView } from '../Views/views'
import { type Crop, coerceOpenIn, coerceViewButton, cropsFile } from './schemas'
import type { PropertyDefinition } from '../Properties/properties'
import { makeCollectionNode, makePageNode, makeSetNode, makeSpaceNode } from './treePatch'
import { adoptedId } from '../Locations/ids'
import { readSettingsLeaves, scopeOf } from '../Settings/codec'
import { pathExists, readJsonObject, readJsonStrict } from '../IO/atomicWrite'
import { isContentFile, listEntries } from '../IO/walk'
import { orderedDefs, readRegistry, type PropertyRegistry } from '../Properties/propertiesRegistry'
import { asString, asStringArray, basenameNoMd } from '../Locations/coerce'
import { shouldSkipDir, type WatchScope } from '../Locations/exclusion'
import { resolveOrder } from '../Locations/order'
import { beginWalk, cachedParse, endWalk } from '../IO/walkCache'
import {
  contextsDir,
  contextsRegistryFile,
  NEXUS_CONFIG_FILES,
  nexusConfig,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
} from '../Locations/paths'
import { CONTEXTS_REGISTRY_REL, spaceDirRel } from '../Locations/nexusPaths'

type Json = Record<string, unknown>

/** The tree leaves `homepage.json` feeds — same decoding for the walk and the watcher's
 *  homepage patch, so they cannot disagree. */
export function readHomepageLeaves(config: Json): NexusTree['homepage'] {
  return {
    banner: asString(config.banner),
    headingIconHidden: config.heading_icon_hidden === true,
  }
}

/** The `crops.json` leaf — same decoding for the walk and the watcher's crops patch. A malformed
 *  entry drops (the codec's `.catch`); the file is never taken down by one bad key. */
export function readCropLeaves(config: Json): NexusTree['crops'] {
  const byImage = cropsFile.parse(config).byImage ?? {}
  return Object.fromEntries(Object.entries(byImage).filter((e): e is [string, Crop] => !!e[1]))
}

/** `state.json`'s per-Context Space-order blob — one decode for the walk and the order patch,
 *  so the two cannot derive different trees from the same bytes. */
export function readSpaceOrders(state: Json): Json {
  return state.space_orders != null && typeof state.space_orders === 'object'
    ? (state.space_orders as Json)
    : {}
}

/** Resolve an entity root's parenthesized keys against the live Context groups — the walk's
 *  assembly pass shaped for one node, for callers patching outside a walk. Undefined = no
 *  registered links (the key stays absent; no empties). */
export function resolveEntityContexts(
  raw: Json,
  groups: ContextGroup[],
): Record<string, string[]> | undefined {
  if (!groups.length) return undefined
  const registry: ContextsRegistry = { contexts: groups.map((g) => g.def) }
  const spacesByContext = new Map(groups.map((g) => [g.def.id, g.spaces]))
  const links = resolveContextKeys(raw, registry, spacesByContext)
  return links.size ? Object.fromEntries(links) : undefined
}

/** Lenient frontmatter split — the same recovering parser the page writer reads with
 *  (`parseDocument`), so the walk and the write side can never disagree about which keys a
 *  page holds (a duplicate key recovers here exactly as it does there). */
export function splitFrontmatter(content: string): Json {
  if (!content.startsWith('---')) return {}
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {} // opening fence with no close -> treat whole file as body
  try {
    const parsed: unknown = parseDocument(m[1]).toJSON()
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Json)
      : {}
  } catch {
    return {} // unrecoverable YAML -> still a valid page, empty frontmatter
  }
}

/** Per-folder sidecar JSON, served through the walk cache — parsed once per (mtime, size). */
const readSidecar = (absPath: string): Promise<Json | null> =>
  cachedParse(absPath, () => readJsonObject(absPath))

/** The lenient sidecar read keeps the distinction its null destroys: absent stays silent (an
 *  un-adopted folder), present-but-unparseable records the owner's path. Recorded HERE at the
 *  call site — a side effect inside the parse closure would go silent on every warm walk, since
 *  the cache serves non-null results without re-running it. */
async function readSidecarNaming(
  absSidecar: string,
  relOwner: string,
  unreadable: string[],
): Promise<Json | null> {
  const meta = await readSidecar(absSidecar)
  if (meta === null && (await pathExists(absSidecar))) unreadable.push(relOwner)
  return meta
}

/** A Collection's or Set's own sidecar as a record — raw mode has none to read, and an
 *  unparseable one reads empty so the container still walks, its folder named on the list. */
const readContainerMeta = (
  absDir: string,
  relDir: string,
  sidecar: string,
  unreadable: string[],
): Promise<Json> =>
  readSidecarNaming(join(absDir, sidecar), relDir, unreadable).then((m) => m ?? {})

/** A `.nexus` config file as a record — absent and unreadable both read as empty, because the
 *  walk has no field of its own to lose. The one exception (nexus.json) reads strict below. */
const readConfig = (absPath: string): Promise<Record<string, unknown>> =>
  readJsonObject(absPath).then((v) => v ?? {})

/** Raw context keys retained off the parse each entity read already does, keyed by the cached
 *  node object. Registry-INDEPENDENT data, so the parse cache never needs busting for registry
 *  changes — resolution runs at tree assembly each walk. */
const rawContextByNode = new WeakMap<object, Json>()

function retainContextKeys(node: object, raw: Json): void {
  let kept: Json | null = null
  for (const [k, v] of Object.entries(raw)) {
    if (parseContextKey(k) !== null) {
      kept ??= {}
      kept[k] = v
    }
  }
  if (kept) rawContextByNode.set(node, kept)
}

export interface PageRecord {
  node: PageNode
  fm: Json
  mtimeMs: number | null
}

/** THE per-page read: one stat-gated parse serves the walk (the node) and the view pipeline's
 *  value batch (the frontmatter) — the same bytes are never read twice.
 *
 *  Null for a file the folder's kind won't admit — not an error, skipped like an unreadable file
 *  or a stray `.png`. A file with NO key is admitted and wears a synthetic id until adoption
 *  stamps it. */
export async function readPageRecord(absFile: string, relFile: string): Promise<PageRecord | null> {
  return cachedParse(absFile, async (stat) => {
    const fm = splitFrontmatter(await readFile(absFile, 'utf8'))
    const admission = admitContentFile(fm, 'page')
    if (admission.state === 'unknown') return null
    const node = makePageNode({
      id: admission.state === 'member' ? admission.id : adoptedId(relFile),
      title: basenameNoMd(basename(absFile)),
      icon: asString(fm.icon),
      path: relFile,
    })
    retainContextKeys(node, fm)
    return { node, fm, mtimeMs: stat?.mtimeMs ?? null }
  })
}

async function readPage(absFile: string, relFile: string): Promise<PageNode | null> {
  return (await readPageRecord(absFile, relFile))?.node ?? null
}

async function readDirectPages(
  absDir: string,
  relDir: string,
  unreadable: string[],
): Promise<PageNode[]> {
  const files = (await listEntries(absDir)).filter(isContentFile)
  const out = await Promise.all(
    files.map(async (e) => {
      const rel = relDir ? `${relDir}/${e.name}` : e.name
      // Null is Unknown admission or an unreadable file — either way the walk skips it,
      // and the record must not read the skip as absence.
      const node = await readPage(join(absDir, e.name), rel).catch(() => null)
      if (node === null) unreadable.push(rel)
      return node
    }),
  )
  return out.filter((n): n is PageNode => n !== null)
}

/** Lenient read of a sidecar `views[]` — drops any view that fails to decode rather than
 *  poisoning the whole container read; absent/empty ⇒ undefined. */
export function parseViews(raw: unknown): SavedView[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: SavedView[] = []
  for (const v of raw) {
    const r = savedView.safeParse(v)
    if (r.success) out.push(r.data)
  }
  return out.length > 0 ? out : undefined
}

/** Every non-excluded subfolder of a Collection or Set is itself a Set (position-driven,
 *  any depth). Shared by the Collection root and every Set level — the recursion. */
async function readChildSets(
  absDir: string,
  relDir: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  unreadable: string[],
): Promise<SetNode[]> {
  const dirs = (await listEntries(absDir)).filter(
    (e) => e.isDirectory() && !shouldSkipDir(e.name, `${relDir}/${e.name}`, scope),
  )
  // A nested folder is a Set only if the resolver says so — one carrying an agenda config
  // renders as nothing rather than as an ordinary Set.
  const kinds = await Promise.all(
    dirs.map((e) => resolveFolderKind(join(absDir, e.name), 'nested', kindCtx)),
  )
  const sets = dirs.filter((_, i) => kinds[i] === 'set')
  return Promise.all(
    sets.map((e) =>
      readSet(join(absDir, e.name), `${relDir}/${e.name}`, e.name, kindCtx, scope, unreadable),
    ),
  )
}

async function readSet(
  absDir: string,
  relDir: string,
  name: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  unreadable: string[],
): Promise<SetNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.set, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, unreadable),
    readDirectPages(absDir, relDir, unreadable),
  ])
  return makeSetNode({
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    icon: asString(meta.icon),
    path: relDir,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    sets: resolveOrder(sets, asStringArray(meta.set_order)),
    pages: resolveOrder(pages, asStringArray(meta.page_order)),
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
    disclosureLocked: meta.disclosure_locked === true,
  })
}

/** effectiveSchema(C): assignment ids → their registry defs, in order; drops dangling refs
 *  (a def deleted but an assignment not yet reconciled must not become an undefined hole). */
export function resolveAssignedSchema(
  ids: unknown,
  registry: PropertyRegistry,
): PropertyDefinition[] | undefined {
  if (!Array.isArray(ids)) return undefined
  const defs = ids
    .filter((id): id is string => typeof id === 'string')
    .map((id) => registry[id])
    .filter((d): d is PropertyDefinition => Boolean(d))
  return defs.length ? defs : undefined
}

async function readPageCollection(
  absDir: string,
  relDir: string,
  name: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  registry: PropertyRegistry,
  unreadable: string[],
): Promise<CollectionNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.collection, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, unreadable),
    readDirectPages(absDir, relDir, unreadable),
  ])
  return makeCollectionNode({
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    icon: asString(meta.icon),
    path: relDir,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    properties: resolveAssignedSchema(meta.properties, registry),
    sets: resolveOrder(sets, asStringArray(meta.set_order)),
    pages: resolveOrder(pages, asStringArray(meta.page_order)),
    views: parseViews(meta.views),
    openIn: coerceOpenIn(meta.open_in),
    viewButton: coerceViewButton(meta.view_button),
    disclosureLocked: meta.disclosure_locked === true,
  })
}

async function readSpace(
  absDir: string,
  relDir: string,
  name: string,
  contextId: string,
  unreadable: string[],
): Promise<SpaceNode | null> {
  // A Space IS its sidecar: no sidecar means no Space (a plain folder, silent), while an
  // unparseable one names itself on the list rather than reading as deleted.
  const sc = await readSidecarNaming(join(absDir, SPACE_SIDECAR), relDir, unreadable)
  if (!sc) return null
  const node = makeSpaceNode({
    id: asString(sc.id) ?? adoptedId(relDir),
    title: name,
    icon: asString(sc.icon),
    path: relDir,
    banner: asString(sc.banner),
    headingIconHidden: sc.heading_icon_hidden === true,
    color: asString(sc.color),
    contextId,
  })
  retainContextKeys(node, sc)
  return node
}

/** The registry-backed Space tree: one group per registry entry (registry order), spaces
 *  from `.nexus/contexts/<Title>/` gated on `_space.json`, ordered by `space_orders`. */
async function readContextGroups(
  root: string,
  registry: ContextsRegistry,
  spaceOrders: Json,
  scope: WatchScope,
  unreadable: string[],
): Promise<ContextGroup[]> {
  return Promise.all(
    registry.contexts.map(async (def) => {
      const dir = join(contextsDir(root), def.title)
      const entries = (await listEntries(dir))
        .filter((e) => e.isDirectory())
        .map((e) => ({ name: e.name, rel: spaceDirRel(def.title, e.name) }))
        .filter(({ name, rel }) => !shouldSkipDir(name, rel, scope))
      const read = await Promise.all(
        entries.map(({ name, rel }) => readSpace(join(dir, name), rel, name, def.id, unreadable)),
      )
      const spaces = read.filter((n): n is SpaceNode => n !== null)
      return { def, spaces: resolveOrder(spaces, asStringArray(spaceOrders[def.id])) }
    }),
  )
}

export async function readNexus(root: string): Promise<NexusTree> {
  if (!(await pathExists(root))) throw new Error(`Nexus root not found: ${root}`)
  beginWalk(root)
  try {
    return await walkNexus(root)
  } finally {
    endWalk()
  }
}

async function walkNexus(root: string): Promise<NexusTree> {
  const [identityRead, settings, state, homepageConfig, cropsConfig, registry, ctxRegistryRaw] =
    await Promise.all([
      readJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.identity)),
      readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.settings)),
      readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.state)),
      readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.homepage)),
      readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.crops)),
      readRegistry(root),
      readSidecar(contextsRegistryFile(root)),
    ])
  // Absent nexus.json is real raw mode; an UNREADABLE one is an error — a lenient null here
  // would flip the whole nexus to raw mode, ignoring every sidecar's identity, views and
  // schema for the session. Fail the walk instead; the tree stays as last-read.
  if (!identityRead.ok && identityRead.error.code !== 'not-found') {
    throw new Error(`The nexus identity file could not be read: ${identityRead.error.message}`)
  }
  const identity = identityRead.ok ? identityRead.value : null
  const id = asString(identity?.id) ?? adoptedId(root)
  const kindCtx = await agendaContext(root, identity)

  const leaves = readSettingsLeaves(settings)
  const scope = scopeOf(leaves)
  // Contexts. Registry-backed when `.nexus/contexts.json` parses (the walk never writes —
  // seeding/migration are open-path mutations). No registry (raw/unmigrated) → `contexts`
  // is [] — the open path migrates + seeds BEFORE anything renders, so the walk never
  // reads the legacy area/topic/project dirs itself.
  const ctxParsed = ctxRegistryRaw ? contextsRegistrySchema.safeParse(ctxRegistryRaw) : null
  const ctxRegistry = ctxParsed?.success ? ctxParsed.data : null
  const spaceOrders = readSpaceOrders(state)
  const unreadable: string[] = []
  // An unusable registry blanks the whole Contexts layer for the session — every group and
  // Space leaves the walk at once. Absent stays silent; present names the registry so the
  // record reads the blank layer as unreadable, never as mass deletion.
  if (!ctxRegistry && (await pathExists(contextsRegistryFile(root))))
    unreadable.push(CONTEXTS_REGISTRY_REL)
  const contexts = ctxRegistry
    ? await readContextGroups(root, ctxRegistry, spaceOrders, scope, unreadable)
    : undefined

  // Top-level Collections (gated by `_pagecollection.json`). Agenda singletons are
  // identified ONLY by their config sidecar
  // (`_taskconfig`/`_eventconfig`) — never by folder name — and are not surfaced as Collections.
  const rootDirs = (await listEntries(root)).filter(
    (e) => e.isDirectory() && !shouldSkipDir(e.name, e.name, scope),
  )
  const maybeCollections = await Promise.all(
    rootDirs.map(async (e) => {
      const abs = join(root, e.name)
      if ((await resolveFolderKind(abs, 'root', kindCtx)) !== 'collection') return null
      return readPageCollection(abs, e.name, e.name, kindCtx, scope, registry.defs, unreadable)
    }),
  )
  const allCollections = maybeCollections.filter((c): c is CollectionNode => c !== null)
  const orderedCollections = resolveOrder(allCollections, asStringArray(state.collection_order))

  const collections = orderedCollections

  // Resolve each entity's retained raw context keys onto its own node — a cheap in-memory
  // pass over already-parsed data, so a pre-existing inert key lights up on the first walk
  // after its Space registers.
  if (ctxRegistry && contexts) {
    const spacesByContext = new Map(contexts.map((g) => [g.def.id, g.spaces]))
    const attach = (node: PageNode | SpaceNode): void => {
      const raw = rawContextByNode.get(node)
      const links = raw ? resolveContextKeys(raw, ctxRegistry, spacesByContext) : null
      if (links?.size) node.contextValues = Object.fromEntries(links)
      else delete node.contextValues
    }
    for (const g of contexts) for (const s of g.spaces) attach(s)
    const visitSets = (sets: SetNode[] | undefined): void => {
      for (const s of sets ?? []) {
        s.pages.forEach(attach)
        visitSets(s.sets)
      }
    }
    for (const c of orderedCollections) {
      c.pages.forEach(attach)
      visitSets(c.sets)
    }
  }

  return {
    nexus: {
      id,
      rootPath: root,
      name: basename(root),
      profileImage: leaves.profileImage,
      profileIcon: leaves.profileIcon,
      profileSubtitle: leaves.profileSubtitle,
    },
    homepage: readHomepageLeaves(homepageConfig),
    crops: readCropLeaves(cropsConfig),
    contexts: contexts ?? [],
    collections,
    accent: leaves.accent,
    personalization: leaves.personalization,
    commands: leaves.commands,
    excluded: leaves.excluded,
    assetDirectory: leaves.assetDirectory,
    registry: orderedDefs(registry),
    ...(unreadable.length ? { unreadable: unreadable.map((path) => ({ path })) } : {}),
  }
}
