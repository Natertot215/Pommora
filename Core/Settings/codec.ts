import type { AccentSetting, ColorSetting } from '@pommora/uix/Theme/colors'
import { DEFAULT_ACCENT } from '@pommora/uix/Theme/colors'
import { isColorKey } from '@pommora/uix/Theme/colors'
import { DEFAULT_COMMANDS } from '../Actions/commands'
import { DATE_FORMATS } from '../Properties/columnStyles'
import { LINK_DISPLAYS } from '../Properties/properties'
import { isPlainObject } from '../Properties/propertyValue'
import { asString } from '../Nexus/coerce'
import { ASSETS_DIR_REL, NON_CORPUS_TOP } from '../Paths/nexusPaths'
import { normalizeSeg, rootSegs, type WatchScope } from '../Paths/exclusion'
import {
  EMBED_SCALE_DEFAULT,
  ENTITY_ICON_KINDS,
  WEB_ZOOM_DEFAULT,
  coercePreviewPersistence,
  clampInt,
  HISTORY_DAYS,
  HISTORY_INTERVAL,
  TAB_CACHE,
  TAB_MAX_WIDTH,
  TAB_MIN_WIDTH,
  coerceScale,
  coerceInterfaceScale,
  EDITOR_SCALE_DEFAULT,
  type EntityIconKind,
  type FolderPlacement,
  type Personalization,
  type SidebarMode,
} from './personalization'

type Json = Record<string, unknown>

function resolveAccent(raw: string | undefined): AccentSetting {
  if (raw === 'system') return 'system'
  if (raw != null && isColorKey(raw)) return raw as AccentSetting
  return DEFAULT_ACCENT
}

// Per-field: absent/invalid → undefined = the built-in default. Accent is the exception — it resolves to a concrete setting so the row that shows it can never disagree with what paints.
export function readPersonalization(raw: unknown): Personalization {
  const p = isPlainObject(raw) ? raw : {}
  const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)
  const placement = (v: unknown): FolderPlacement | undefined =>
    v === 'top' || v === 'bottom' ? v : undefined
  const mode = (v: unknown): SidebarMode | undefined =>
    v === 'collections' || v === 'contexts' || v === 'agenda' ? v : undefined
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
  const rawIcons = isPlainObject(p.defaultIcons) ? p.defaultIcons : {}
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
    tabOpenBehavior: p.tabOpenBehavior === 'newtab' ? 'newtab' : undefined,
    tabTakeFocus: p.tabTakeFocus === false ? false : undefined,
    tabMinWidth: clampInt(p.tabMinWidth, TAB_MIN_WIDTH.min, TAB_MIN_WIDTH.max),
    tabMaxWidth: clampInt(p.tabMaxWidth, TAB_MAX_WIDTH.min, TAB_MAX_WIDTH.max),
    tabCache: clampInt(p.tabCache, TAB_CACHE.min, TAB_CACHE.max),
    pauseMediaOnTabSwitch: p.pauseMediaOnTabSwitch === false ? false : undefined,
    nativeHighlight: bool(p.nativeHighlight),
    pickerSelection: p.pickerSelection === 'checked' ? 'checked' : undefined,
    connectionsOpenInPreview: bool(p.connectionsOpenInPreview),
    plainUnresolvedLinks: bool(p.plainUnresolvedLinks),
    ribbonOrder: ribbonOrder.length ? ribbonOrder : undefined,
    interfaceScale: coerceInterfaceScale(p.interfaceScale),
    previewPersistence: coercePreviewPersistence(p.previewPersistence),
    fileHistory: p.fileHistory === false ? false : undefined,
    historyDays: clampInt(p.historyDays, HISTORY_DAYS.min, HISTORY_DAYS.max),
    historyInterval: clampInt(p.historyInterval, HISTORY_INTERVAL.min, HISTORY_INTERVAL.max),
    permanentDelete: bool(p.permanentDelete),
    confirmDeletion: p.confirmDeletion === false ? false : undefined,
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

// String values only, so a malformed entry falls back to the built-in binding instead of poisoning the map.
export function readCommands(raw: unknown): Record<string, string> {
  const commands = { ...DEFAULT_COMMANDS }
  const c = isPlainObject(raw) ? raw : {}
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === 'string' && value.length > 0) commands[key] = value
  }
  return commands
}

/** Decoded in one place — the walk and the watcher's settings patch read the same file through the same coercions, so they cannot disagree. */
export interface SettingsLeaves {
  excluded: string[]
  assetDirectory: string
  accent: AccentSetting
  personalization: Personalization
  commands: Record<string, string>
  profileImage: string | null
  profileIcon: string | undefined
  profileSubtitle: string
}

/** A refused value takes the default rather than narrowing the walk or widening the protocol handler's containment check — `.nexus/contexts` would drop every Space from the walk. */
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

function readAssetDirectoryLeaf(v: unknown): string {
  const raw = asString(v)?.trim() ?? ''
  return nexusFolderRefusal(raw) ? ASSETS_DIR_REL : rootSegs(raw).join('/')
}

function readExcludedLeaf(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string') continue
    const raw = item.trim()
    if (!raw || nexusFolderRefusal(raw)) continue
    const segs = rootSegs(raw)
    const key = segs.map(normalizeSeg).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(segs.join('/'))
  }
  return out
}

export function readSettingsLeaves(settings: Json): SettingsLeaves {
  const personalization = readPersonalization(
    isPlainObject(settings.personalization) ? settings.personalization : {},
  )
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

export function scopeOf(leaves: Pick<SettingsLeaves, 'excluded' | 'assetDirectory'>): WatchScope {
  return { excluded: leaves.excluded, assetDir: leaves.assetDirectory }
}
