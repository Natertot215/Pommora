import type { AccentSetting } from '@pommora/uix/Theme/colors'
import { chordOf } from '@pommora/uix/Interactions/chords'
import { COMMAND_IDS, type Commands, DEFAULT_COMMANDS } from '../Actions/commands'
import { isPlainObject } from '../Properties/propertyValue'
import { asString } from '../Nexus/coerce'
import { ASSETS_DIR_REL, NON_CORPUS_TOP } from '../Paths/nexusPaths'
import { normalizeSeg, rootSegs, type WatchScope } from '../Paths/exclusion'
import { NEXUS_CONFIG_FILES, nexusConfig } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { type Personalization, personalizationSchema } from './personalization'

type Json = Record<string, unknown>

// Per-field: absent/invalid → undefined = the built-in default.
export const readPersonalization = (raw: unknown): Personalization =>
  personalizationSchema.parse(isPlainObject(raw) ? raw : {})

const MODIFIER_KEYS = new Set(['cmd', 'ctrl', 'alt', 'shift'])

// String values only under a known id, so a malformed entry or a stale id falls back to the built-in binding instead of poisoning the map.
export function readCommands(raw: unknown): Commands {
  const commands: Commands = { ...DEFAULT_COMMANDS }
  const c = isPlainObject(raw) ? raw : {}
  for (const key of COMMAND_IDS) {
    const value = c[key]
    if (typeof value !== 'string') continue
    const chord = chordOf(value)
    if (!chord || MODIFIER_KEYS.has(chord.key)) continue
    if (chord.cmd || chord.ctrl || chord.alt || chord.shift) commands[key] = value
  }
  return commands
}

/** Decoded in one place — the walk and the watcher's settings patch read the same file through the same coercions, so they cannot disagree. */
export interface SettingsLeaves {
  excluded: string[]
  assetDirectory: string
  accent: AccentSetting
  personalization: Personalization
  commands: Commands
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
  const personalization = readPersonalization(settings.personalization)
  return {
    excluded: readExcludedLeaf(settings.excluded_folders),
    assetDirectory: readAssetDirectoryLeaf(settings.asset_directory),
    accent: personalization.accent ?? 'system',
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

export const readSettings = async (root: string): Promise<SettingsLeaves> =>
  readSettingsLeaves((await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {})
