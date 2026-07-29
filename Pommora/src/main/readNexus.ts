// The whole read engine: one recursive, read-only walk of a nexus root.
// Supports BOTH the sidecar-driven path (`.nexus/` + per-folder sidecars) and
// the structure-classification path (raw/un-adopted folders, e.g. ~/test).
// No file is ever opened for writing.

import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parseDocument } from 'yaml'
import type {
  SolidColor,
  AccentSetting,
  CollectionNode,
  ContextGroup,
  LabelPair,
  NexusLabels,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
  ConnectionColorSetting,
  EntityIconKind,
  FolderPlacement,
  Personalization,
  SidebarMode,
} from '@shared/types'
import {
  contextsRegistry as contextsRegistrySchema,
  parseContextKey,
  type ContextsRegistry,
} from '@shared/contexts'
import { resolveContextKeys } from '@shared/contextResolve'
import {
  SOLID_COLORS,
  DEFAULT_ACCENT,
  DEFAULT_COMMANDS,
  DEFAULT_LABELS,
  DEFAULT_TIME_FORMAT,
  ENTITY_ICON_KINDS,
  coerceViewScale,
} from '@shared/types'
import { savedView, type SavedView } from '@shared/views'
import { coerceOpenIn, coerceViewButton, coerceViewStyle } from '@shared/schemas'
import type { PropertyDefinition } from '@shared/properties'
import { adoptedId } from './ids'
import { pathExists, readJsonObject, readJsonStrict } from './io/atomicWrite'
import { orderedDefs, readRegistry, type PropertyRegistry } from './io/propertiesRegistry'
import { asString, asStringArray, basenameNoMd } from './coerce'
import { shouldSkipDir } from './exclusion'
import { resolveOrder } from './order'
import { beginWalk, cachedParse, endWalk } from './walkCache'
import {
  contextsDir,
  contextsRegistryFile,
  NEXUS_CONFIG_FILES,
  nexusConfig,
  SIDECAR_FILENAME,
  SPACE_SIDECAR,
} from './paths'

type Json = Record<string, unknown>
type Fallback = 'id' | 'title'

const ACCENT_COLOR_SET = new Set<string>(SOLID_COLORS)

// ---------- low-level helpers ----------

// Swift `accent_color` values that aren't in React's own palette → nearest React token.
// React's own values (including the 6 that overlap Swift) pass through unchanged; React
// keeps its own accent vocabulary, this only maps Swift's extras on read.
const SWIFT_ONLY_ACCENT: Record<string, SolidColor> = { pink: 'purple', gray: 'grey' }

function resolveAccent(raw: string | undefined): AccentSetting {
  if (raw === 'system') return 'system'
  if (raw != null && ACCENT_COLOR_SET.has(raw)) return raw as SolidColor
  if (raw != null && raw in SWIFT_ONLY_ACCENT) return SWIFT_ONLY_ACCENT[raw]
  return DEFAULT_ACCENT
}

// Per-field: absent/invalid → undefined = the built-in default. Accent is resolved
// separately into tree.accent, so it isn't surfaced here.
export function readPersonalization(raw: unknown): Personalization {
  const p =
    raw != null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)
  const placement = (v: unknown): FolderPlacement | undefined =>
    v === 'top' || v === 'bottom' ? v : undefined
  const mode = (v: unknown): SidebarMode | undefined =>
    v === 'collections' || v === 'contexts' || v === 'agenda' ? v : undefined
  const ribbonOrder = Array.isArray(p.ribbonOrder)
    ? p.ribbonOrder.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []
  const conn = asString(p.connectionColor)
  const rawIcons =
    p.defaultIcons != null && typeof p.defaultIcons === 'object' && !Array.isArray(p.defaultIcons)
      ? (p.defaultIcons as Record<string, unknown>)
      : {}
  const defaultIcons: Partial<Record<EntityIconKind, string>> = {}
  for (const k of ENTITY_ICON_KINDS) {
    const v = asString(rawIcons[k])
    if (v) defaultIcons[k] = v
  }
  const favoriteIcons = Array.isArray(p.favoriteIcons)
    ? p.favoriteIcons.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []
  return {
    connectionColor:
      conn === 'accent' || (conn != null && ACCENT_COLOR_SET.has(conn))
        ? (conn as ConnectionColorSetting)
        : undefined,
    hideChevrons: bool(p.hideChevrons),
    outlinerLines: bool(p.outlinerLines),
    navCloseOnSelect: bool(p.navCloseOnSelect),
    defaultIcons: Object.keys(defaultIcons).length ? defaultIcons : undefined,
    favoriteIcons: favoriteIcons.length ? favoriteIcons : undefined,
    setPlacement: placement(p.setPlacement),
    subSetPlacement: placement(p.subSetPlacement),
    sidebarMode: mode(p.sidebarMode),
    revealTabBarOnHover: bool(p.revealTabBarOnHover),
    connectionsOpenInPreview: bool(p.connectionsOpenInPreview),
    ribbonOrder: ribbonOrder.length ? ribbonOrder : undefined,
    defaultViewScale: coerceViewScale(p.defaultViewScale),
  }
}

// Overlay the on-disk `settings.commands` map onto DEFAULT_COMMANDS — string values only, so a
// malformed entry falls back to the built-in binding instead of poisoning the map.
export function readCommands(raw: unknown): Record<string, string> {
  const commands = { ...DEFAULT_COMMANDS }
  const c =
    raw != null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === 'string' && value.length > 0) commands[key] = value
  }
  return commands
}

// Parse Swift's nested snake_case `settings.labels` into the structured camelCase
// NexusLabels, defaulting per-field so a partial/absent blob still yields full labels.
export function readLabels(raw: unknown): NexusLabels {
  const obj = (v: unknown): Record<string, unknown> =>
    v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  const pair = (v: unknown, fallback: LabelPair): LabelPair => {
    const o = obj(v)
    return {
      singular: asString(o.singular) ?? fallback.singular,
      plural: asString(o.plural) ?? fallback.plural,
    }
  }
  const L = obj(raw)
  // Migrate a legacy `sidebar_sections.{areas,topics}` blob into the area/topic label plurals when the
  // new LabelPairs are absent (singular defaults). The old `pages` header is dropped — the Collections
  // sidebar header now derives from pageCollection.plural.
  const ss = obj(L.sidebar_sections)
  const labelled = (key: string, legacyPlural: unknown, fallback: LabelPair): LabelPair =>
    pair(L[key], { singular: fallback.singular, plural: asString(legacyPlural) ?? fallback.plural })
  return {
    area: labelled('area', ss.areas, DEFAULT_LABELS.area),
    topic: labelled('topic', ss.topics, DEFAULT_LABELS.topic),
    project: pair(L.project, DEFAULT_LABELS.project),
    pageCollection: pair(L.page_collection, DEFAULT_LABELS.pageCollection),
    pageSet: pair(L.page_set, DEFAULT_LABELS.pageSet),
    agendaTask: pair(L.agenda_task, DEFAULT_LABELS.agendaTask),
    agendaEvent: pair(L.agenda_event, DEFAULT_LABELS.agendaEvent),
  }
}

async function listEntries(dir: string): Promise<import('node:fs').Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
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

// ---------- page reads ----------

/** Raw context keys retained off the parse each entity read already does — the parenthesized root
 *  keys, keyed by the cached node object. Registry-INDEPENDENT
 *  data, so the parse cache never needs busting for registry changes; resolution runs at
 *  tree assembly each walk. */
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
}

/** THE per-page read: one stat-gated parse serves the walk (the node) and the view
 *  pipeline's value batch (the frontmatter) — the same bytes are never read twice. */
export async function readPageRecord(absFile: string, relFile: string): Promise<PageRecord> {
  return cachedParse(absFile, async () => {
    const fm = splitFrontmatter(await readFile(absFile, 'utf8'))
    const node: PageNode = {
      kind: 'page',
      id: asString(fm.id) ?? adoptedId(relFile),
      title: basenameNoMd(basename(absFile)),
      icon: asString(fm.icon),
      path: relFile,
    }
    retainContextKeys(node, fm)
    return { node, fm }
  })
}

async function readPage(absFile: string, relFile: string): Promise<PageNode> {
  return (await readPageRecord(absFile, relFile)).node
}

async function readDirectPages(absDir: string, relDir: string): Promise<PageNode[]> {
  const files = (await listEntries(absDir)).filter(
    (e) => e.isFile() && !e.name.startsWith('_') && e.name.toLowerCase().endsWith('.md'),
  )
  const out = await Promise.all(
    files.map((e) => {
      const rel = relDir ? `${relDir}/${e.name}` : e.name
      return readPage(join(absDir, e.name), rel).catch(() => null) // unreadable page -> skip
    }),
  )
  return out.filter((n): n is PageNode => n !== null)
}

// ---------- container reads (Collection -> recursive Set) ----------

/** Lenient read of a sidecar `views[]` — drops any view that fails to decode rather than
 *  poisoning the whole container read; absent/empty ⇒ undefined. */
function parseViews(raw: unknown): SavedView[] | undefined {
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
  sidecarMode: boolean,
  excluded: string[],
  fb: Fallback,
): Promise<SetNode[]> {
  const dirs = (await listEntries(absDir)).filter(
    (e) => e.isDirectory() && !shouldSkipDir(e.name, `${relDir}/${e.name}`, excluded),
  )
  return Promise.all(
    dirs.map((e) =>
      readSet(join(absDir, e.name), `${relDir}/${e.name}`, e.name, sidecarMode, excluded, fb),
    ),
  )
}

async function readSet(
  absDir: string,
  relDir: string,
  name: string,
  sidecarMode: boolean,
  excluded: string[],
  fb: Fallback,
): Promise<SetNode> {
  const [meta, sets, pages] = await Promise.all([
    sidecarMode
      ? readSidecar(join(absDir, SIDECAR_FILENAME.set)).then((m) => m ?? {})
      : Promise.resolve<Json>({}),
    readChildSets(absDir, relDir, sidecarMode, excluded, fb),
    readDirectPages(absDir, relDir),
  ])
  return {
    kind: 'set',
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    icon: asString(meta.icon),
    path: relDir,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    sets: resolveOrder(sets, asStringArray(meta.set_order), fb),
    pages: resolveOrder(pages, asStringArray(meta.page_order), fb),
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
    viewStyle: coerceViewStyle(meta.view_style),
  }
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
  sidecarMode: boolean,
  excluded: string[],
  fb: Fallback,
  registry: PropertyRegistry,
): Promise<CollectionNode> {
  const [meta, sets, pages] = await Promise.all([
    sidecarMode
      ? readSidecar(join(absDir, SIDECAR_FILENAME.collection)).then((m) => m ?? {})
      : Promise.resolve<Json>({}),
    readChildSets(absDir, relDir, sidecarMode, excluded, fb),
    readDirectPages(absDir, relDir),
  ])
  return {
    kind: 'collection',
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    icon: asString(meta.icon),
    path: relDir,
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    properties: resolveAssignedSchema(meta.properties, registry),
    sets: resolveOrder(sets, asStringArray(meta.set_order), fb),
    pages: resolveOrder(pages, asStringArray(meta.page_order), fb),
    views: parseViews(meta.views),
    openIn: coerceOpenIn(meta.open_in),
    viewButton: coerceViewButton(meta.view_button),
    viewStyle: coerceViewStyle(meta.view_style),
  }
}

// ---------- contexts ----------

/** The registry-backed Space tree: one group per registry entry (registry order), spaces
 *  from `.nexus/contexts/<Title>/` gated on `_space.json`, ordered by `space_orders`. */
async function readContextGroups(
  root: string,
  registry: ContextsRegistry,
  spaceOrders: Json,
  excluded: string[],
  fb: Fallback,
): Promise<ContextGroup[]> {
  return Promise.all(
    registry.contexts.map(async (def) => {
      const dir = join(contextsDir(root), def.title)
      const dirs = (await listEntries(dir)).filter(
        (e) =>
          e.isDirectory() && !shouldSkipDir(e.name, `.nexus/contexts/${def.title}/${e.name}`, excluded),
      )
      const read = await Promise.all(
        dirs.map(async (e) => {
          const rel = `.nexus/contexts/${def.title}/${e.name}`
          const sc = await readSidecar(join(dir, e.name, SPACE_SIDECAR))
          if (!sc) return null // a Space IS its sidecar
          const node: SpaceNode = {
            kind: 'space',
            id: asString(sc.id) ?? adoptedId(rel),
            title: e.name,
            icon: asString(sc.icon),
            path: rel,
            banner: asString(sc.banner),
            headingIconHidden: sc.heading_icon_hidden === true,
            color: asString(sc.color),
            contextId: def.id,
          }
          retainContextKeys(node, sc)
          return node
        }),
      )
      const spaces = read.filter((n): n is SpaceNode => n !== null)
      return { def, spaces: resolveOrder(spaces, asStringArray(spaceOrders[def.id]), fb) }
    }),
  )
}

// ---------- top level ----------

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
  const [identityRead, settingsRead, state, homepageConfig, navviewConfig, registry, ctxRegistryRaw] =
    await Promise.all([
      readJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.identity)),
      readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings)),
      readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.state)).then((s) => s ?? {}),
      readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.homepage)).then((h) => h ?? {}),
      readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.navview)).then((n) => n ?? {}),
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
  const sidecarMode = !!asString(identity?.id)
  const id = sidecarMode ? (identity!.id as string) : adoptedId(root)
  const fb: Fallback = sidecarMode ? 'id' : 'title'

  const settings = settingsRead ?? {}
  const excluded = asStringArray(settings.excluded_folders) ?? []
  const labels = readLabels(settings.labels)
  const rawPersonalization =
    settings.personalization != null &&
    typeof settings.personalization === 'object' &&
    !Array.isArray(settings.personalization)
      ? (settings.personalization as Record<string, unknown>)
      : {}
  // Accent's new home is personalization.accent; the legacy top-level accent_color is the back-compat
  // fallback for un-migrated nexuses. resolveAccent normalizes either into an AccentSetting.
  const accent = resolveAccent(
    asString(rawPersonalization.accent) ?? asString(settings.accent_color),
  )
  const personalization = readPersonalization(rawPersonalization)
  const commands = readCommands(settings.commands)
  const timeFormat =
    settings.time_format === 'twentyFourHour' ? 'twentyFourHour' : DEFAULT_TIME_FORMAT
  // Profile image + subtitle live in settings (Swift parity), not nexus.json. profileImage is a
  // nexus-relative asset path the renderer serves via nexus-asset://; subtitle is plain text.
  const profileImage = asString(settings.profile_image) ?? null
  const profileIcon = asString(settings.profile_icon)
  const profileSubtitle = asString(settings.profile_subtitle) ?? ''
  // Contexts. Registry-backed when `.nexus/contexts.json` parses (the walk never writes —
  // seeding/migration are open-path mutations). No registry (raw/unmigrated) → `contexts`
  // is [] — the open path migrates + seeds BEFORE anything renders, so the walk never
  // reads the legacy area/topic/project dirs itself.
  const ctxParsed = ctxRegistryRaw ? contextsRegistrySchema.safeParse(ctxRegistryRaw) : null
  const ctxRegistry = ctxParsed?.success ? ctxParsed.data : null
  const spaceOrders =
    state.space_orders != null && typeof state.space_orders === 'object'
      ? (state.space_orders as Json)
      : {}
  const contexts = ctxRegistry
    ? await readContextGroups(root, ctxRegistry, spaceOrders, excluded, fb)
    : undefined

  // Top-level Collections (gated by `_pagecollection.json`; raw mode treats every root folder
  // as a Collection). Agenda singletons are identified ONLY by their config sidecar
  // (`_taskconfig`/`_eventconfig`) — never by folder name — and are not surfaced as Collections.
  const rootDirs = (await listEntries(root)).filter(
    (e) => e.isDirectory() && !shouldSkipDir(e.name, e.name, excluded),
  )
  const maybeCollections = await Promise.all(
    rootDirs.map(async (e) => {
      const abs = join(root, e.name)
      const [hasTask, hasEvent, hasCollection] = await Promise.all([
        pathExists(join(abs, SIDECAR_FILENAME.taskConfig)),
        pathExists(join(abs, SIDECAR_FILENAME.eventConfig)),
        sidecarMode ? pathExists(join(abs, SIDECAR_FILENAME.collection)) : true,
      ])
      if (hasTask || hasEvent || !hasCollection) return null
      return readPageCollection(abs, e.name, e.name, sidecarMode, excluded, fb, registry.defs)
    }),
  )
  const allCollections = maybeCollections.filter((c): c is CollectionNode => c !== null)
  const orderedCollections = resolveOrder(allCollections, asStringArray(state.collection_order), fb)

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
    nexus: { id, rootPath: root, name: basename(root), profileImage, profileIcon, profileSubtitle },
    homepage: {
      banner: asString(homepageConfig.banner),
      headingIconHidden: homepageConfig.heading_icon_hidden === true,
    },
    navView: { banner: asString(navviewConfig.banner) },
    contexts: contexts ?? [],
    collections,
    labels,
    accent,
    timeFormat,
    personalization,
    commands,
    registry: orderedDefs(registry),
  }
}
