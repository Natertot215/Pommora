// The whole read engine: one recursive, read-only walk of a nexus root.
// Supports BOTH the sidecar-driven path (`.nexus/` + per-folder sidecars) and
// the structure-classification path (raw/un-adopted folders, e.g. ~/test).
// No file is ever opened for writing.

import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parseDocument } from 'yaml'
import { admitContentFile } from '@shared/identity'
import { agendaContext, resolveFolderKind, type FolderKindContext } from './folderKind'
import type {
  AccentSetting,
  CollectionNode,
  ContextGroup,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
  ColorSetting,
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
import { DATE_FORMATS } from '@shared/columnStyles'
import {
  DEFAULT_ACCENT,
  DEFAULT_COMMANDS,
  EMBED_SCALE_DEFAULT,
  ENTITY_ICON_KINDS,
  WEB_ZOOM_DEFAULT,
  coerceHoverLinger,
  coerceScale,
  coerceInterfaceScale,
  EDITOR_SCALE_DEFAULT,
} from '@shared/types'
import { isColorKey } from '@shared/theme'
import { savedView, type SavedView } from '@shared/views'
import { type Crop, coerceOpenIn, coerceViewButton, cropsFile } from '@shared/schemas'
import { LINK_DISPLAYS, type PropertyDefinition } from '@shared/properties'
import { makeCollectionNode, makePageNode, makeSetNode, makeSpaceNode } from '@shared/treePatch'
import { adoptedId } from './ids'
import { pathExists, readJsonObject, readJsonStrict } from './IO/atomicWrite'
import { isContentFile, listEntries } from './IO/walk'
import { orderedDefs, readRegistry, type PropertyRegistry } from './IO/propertiesRegistry'
import { asString, asStringArray, basenameNoMd } from './coerce'
import { normalizeSeg, rootSegs, shouldSkipDir, type WatchScope } from './exclusion'
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
import {
  ASSETS_DIR_REL,
  CONTEXTS_REGISTRY_REL,
  NON_CORPUS_TOP,
  spaceDirRel,
} from '@shared/nexusPaths'

type Json = Record<string, unknown>
type Fallback = 'id' | 'title'

function resolveAccent(raw: string | undefined): AccentSetting {
  if (raw === 'system') return 'system'
  if (raw != null && isColorKey(raw)) return raw as AccentSetting
  return DEFAULT_ACCENT
}

// Per-field: absent/invalid → undefined = the built-in default. Accent is the exception — it
// resolves to a concrete setting so the row that shows it can never disagree with what paints.
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
  /** A deferring color setting: its own sentinel, or a ramp cell. Anything else is an unwritten key
   *  rather than a value — the settings surface would have nothing to show for it. */
  const colorSetting = <S extends string>(v: unknown, inherit: S): ColorSetting<S> | undefined => {
    const c = asString(v)
    return c === inherit || (c != null && isColorKey(c)) ? (c as ColorSetting<S>) : undefined
  }
  // An unwritten key stays unwritten — only a stored number clamps to the ramp.
  const scale = (v: unknown, fallback: number): number | undefined =>
    typeof v === 'number' ? coerceScale(v, fallback) : undefined
  const ribbonOrder = Array.isArray(p.ribbonOrder)
    ? p.ribbonOrder.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []
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
    accent: resolveAccent(asString(p.accent)),
    connectionColor: colorSetting(p.connectionColor, 'accent'),
    externalLinkColor: colorSetting(p.externalLinkColor, 'system'),
    checkboxColor: colorSetting(p.checkboxColor, 'accent'),
    highlightColor: colorSetting(p.highlightColor, 'accent'),
    codeColor: colorSetting(p.codeColor, 'default'),
    muteCheckedItems: bool(p.muteCheckedItems),
    hideChevrons: bool(p.hideChevrons),
    repairOnOpen: bool(p.repairOnOpen),
    capitalizeMetadata: bool(p.capitalizeMetadata),
    outlinerLines: bool(p.outlinerLines),
    codeblockLineCount: bool(p.codeblockLineCount),
    navCloseOnSelect: bool(p.navCloseOnSelect),
    removeTitleOnLinkChange: bool(p.removeTitleOnLinkChange),
    aliasPickerOnCommit: bool(p.aliasPickerOnCommit),
    defaultIcons: Object.keys(defaultIcons).length ? defaultIcons : undefined,
    favoriteIcons: favoriteIcons.length ? favoriteIcons : undefined,
    setPlacement: placement(p.setPlacement),
    subSetPlacement: placement(p.subSetPlacement),
    sidebarMode: mode(p.sidebarMode),
    revealTabBarOnHover: bool(p.revealTabBarOnHover),
    pickerSelection: p.pickerSelection === 'checked' ? 'checked' : undefined,
    connectionsOpenInPreview: bool(p.connectionsOpenInPreview),
    plainUnresolvedLinks: bool(p.plainUnresolvedLinks),
    ribbonOrder: ribbonOrder.length ? ribbonOrder : undefined,
    interfaceScale: coerceInterfaceScale(p.interfaceScale),
    hoverPreviewLinger: coerceHoverLinger(p.hoverPreviewLinger),
    permanentDelete: bool(p.permanentDelete),
    dateFormat: DATE_FORMATS.find((f) => f === p.dateFormat),
    timeFormat: p.timeFormat === 'twentyFourHour' ? 'twentyFourHour' : undefined,
    trashDateFormat: DATE_FORMATS.find((f) => f === p.trashDateFormat),
    trashHideTime: bool(p.trashHideTime),
    pasteLinkIntoText: bool(p.pasteLinkIntoText),
    defaultLinkFormat: LINK_DISPLAYS.find((d) => d === p.defaultLinkFormat),
    openLinksInApp: bool(p.openLinksInApp),
    webZoomFactor: scale(p.webZoomFactor, WEB_ZOOM_DEFAULT),
    embedScale: scale(p.embedScale, EMBED_SCALE_DEFAULT),
    editorScale: scale(p.editorScale, EDITOR_SCALE_DEFAULT),
    citationsShown: bool(p.citationsShown),
    jumpToCitation: bool(p.jumpToCitation),
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

/** Every tree leaf `settings.json` feeds, decoded in one place — the walk and the watcher's
 *  settings patch read the same file through the same coercions, so they cannot disagree. */
export interface SettingsLeaves {
  excluded: string[]
  assetDirectory: string
  accent: AccentSetting
  personalization: Personalization
  commands: Record<string, string>
  /** A nexus-relative asset path the renderer serves via nexus-asset://. Profile image,
   *  icon and subtitle live in settings, not nexus.json — preferences, not identity. */
  profileImage: string | null
  profileIcon: string | undefined
  profileSubtitle: string
}

/** Shared by the asset root and each exclusion entry, so a value one reader would coerce and
 *  another would store is the disagreement this rule prevents. */
export function nexusFolderRefusal(raw: string): string | null {
  const segs = rootSegs(raw)
  if (
    !raw ||
    raw.startsWith('/') ||
    raw.includes('\\') ||
    segs.some((s) => s === '.' || s === '..')
  )
    return 'That folder’s name can’t be written as a nexus path.'
  if (NON_CORPUS_TOP.has(normalizeSeg(segs[0]))) return 'That folder belongs to the app.'
  return null
}

/** The asset root's refusal. A refused value takes the default rather than narrowing the walk or
 *  widening the protocol handler's containment check — e.g. `.nexus/contexts` would drop every
 *  Space from the walk, and a root-wide value would classify the whole nexus as asset. */
export const assetDirRefusal = nexusFolderRefusal

/** An exclusion entry's refusal. A hand-edited entry that fails it is dropped from the list
 *  rather than taking the whole list down with it. */
export const excludedFolderRefusal = nexusFolderRefusal

function readAssetDirectoryLeaf(v: unknown): string {
  const raw = asString(v)?.trim() ?? ''
  return assetDirRefusal(raw) ? ASSETS_DIR_REL : rootSegs(raw).join('/')
}

/** Each exclusion entry read on its own: a non-string or refused element is dropped rather than
 *  discarding the whole list, and a kept one is normalized to the spelling the matcher compares. */
function readExcludedLeaf(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string') continue
    const raw = item.trim()
    if (!raw || excludedFolderRefusal(raw)) continue
    const segs = rootSegs(raw)
    const key = segs.map(normalizeSeg).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(segs.join('/'))
  }
  return out
}

export function readSettingsLeaves(settings: Json): SettingsLeaves {
  const rawPersonalization =
    settings.personalization != null &&
    typeof settings.personalization === 'object' &&
    !Array.isArray(settings.personalization)
      ? (settings.personalization as Record<string, unknown>)
      : {}
  const personalization = readPersonalization(rawPersonalization)
  return {
    excluded: readExcludedLeaf(settings.excluded_folders),
    assetDirectory: readAssetDirectoryLeaf(settings.asset_directory),
    accent: personalization.accent ?? DEFAULT_ACCENT,
    personalization,
    commands: readCommands(settings.commands),
    profileImage: asString(settings.profile_image) ?? null,
    profileIcon: asString(settings.profile_icon),
    profileSubtitle: asString(settings.profile_subtitle) ?? '',
  }
}

/** The two leaves the walk and the watcher arm with, as the unit they are threaded as — read
 *  from whatever already holds them, the freshly-decoded leaves or a live tree. */
export function scopeOf(leaves: Pick<SettingsLeaves, 'excluded' | 'assetDirectory'>): WatchScope {
  return { excluded: leaves.excluded, assetDir: leaves.assetDirectory }
}

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
  kindCtx: FolderKindContext,
  unreadable: string[],
): Promise<Json> =>
  kindCtx.sidecarMode
    ? readSidecarNaming(join(absDir, sidecar), relDir, unreadable).then((m) => m ?? {})
    : Promise.resolve<Json>({})

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
  fb: Fallback,
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
      readSet(join(absDir, e.name), `${relDir}/${e.name}`, e.name, kindCtx, scope, fb, unreadable),
    ),
  )
}

async function readSet(
  absDir: string,
  relDir: string,
  name: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  fb: Fallback,
  unreadable: string[],
): Promise<SetNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.set, kindCtx, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, fb, unreadable),
    readDirectPages(absDir, relDir, unreadable),
  ])
  return makeSetNode({
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
  fb: Fallback,
  registry: PropertyRegistry,
  unreadable: string[],
): Promise<CollectionNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.collection, kindCtx, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, fb, unreadable),
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
    sets: resolveOrder(sets, asStringArray(meta.set_order), fb),
    pages: resolveOrder(pages, asStringArray(meta.page_order), fb),
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
  fb: Fallback,
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
      return { def, spaces: resolveOrder(spaces, asStringArray(spaceOrders[def.id]), fb) }
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
  const sidecarMode = !!asString(identity?.id)
  const id = sidecarMode ? (identity!.id as string) : adoptedId(root)
  const fb: Fallback = sidecarMode ? 'id' : 'title'
  const kindCtx = await agendaContext(root, identity, sidecarMode)

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
  // Space leaves the walk at once. Absent is real raw mode and stays silent; present names
  // the registry so the record reads the blank layer as unreadable, never as mass deletion.
  if (!ctxRegistry && (await pathExists(contextsRegistryFile(root))))
    unreadable.push(CONTEXTS_REGISTRY_REL)
  const contexts = ctxRegistry
    ? await readContextGroups(root, ctxRegistry, spaceOrders, scope, fb, unreadable)
    : undefined

  // Top-level Collections (gated by `_pagecollection.json`; raw mode treats every root folder
  // as a Collection). Agenda singletons are identified ONLY by their config sidecar
  // (`_taskconfig`/`_eventconfig`) — never by folder name — and are not surfaced as Collections.
  const rootDirs = (await listEntries(root)).filter(
    (e) => e.isDirectory() && !shouldSkipDir(e.name, e.name, scope),
  )
  const maybeCollections = await Promise.all(
    rootDirs.map(async (e) => {
      const abs = join(root, e.name)
      if ((await resolveFolderKind(abs, 'root', kindCtx)) !== 'collection') return null
      return readPageCollection(abs, e.name, e.name, kindCtx, scope, fb, registry.defs, unreadable)
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
