// Per-Nexus settings (`.nexus/settings.json`) — user preferences, hand-editable. Reads tolerate
// an absent file; a write creates it holding only what was written, and every writer preserves
// the foreign keys it doesn't own.

import {
  coerceViewScale,
  type NavViewMode,
  type NavViewModes,
  type NexusLabels,
  type Personalization,
  type SubfieldConfig,
} from '@shared/types'
import type { WatchScope } from './exclusion'
import { readJsonObject, rmwJsonStrict } from './io/atomicWrite'
import { getLiveTree } from './liveTree'
import { nexusConfig, NEXUS_CONFIG_FILES } from './paths'
import { readSettingsLeaves, scopeOf, type SettingsLeaves } from './readNexus'

/** Serialized read-modify-write of a `.nexus` config file — the one primitive every writer funnels
 *  through, so concurrent writes to different keys can't clobber each other. A missing file
 *  starts empty; an unreadable one fails the write (the throw lands as the operation's error
 *  envelope) rather than replacing what's already on disk. */
export async function updateNexusConfig(
  root: string,
  file: keyof typeof NEXUS_CONFIG_FILES,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES[file])
  const written = await rmwJsonStrict(path, mutate, () => ({}))
  if (!written.ok) throw new Error(written.error.message)
}

export const updateSettings = (
  root: string,
  mutate: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> => updateNexusConfig(root, 'settings', mutate)

/** Merge the `byImage` map in `crops.json` (serialized; foreign top-level keys preserved). The
 *  one owner every crop writer funnels through, so `byImage` is never spelled two ways. */
export function updateCrops(
  root: string,
  edit: (byImage: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  return updateNexusConfig(root, 'crops', (cur) => {
    const b =
      cur.byImage != null && typeof cur.byImage === 'object' && !Array.isArray(cur.byImage)
        ? (cur.byImage as Record<string, unknown>)
        : {}
    return { ...cur, byImage: edit(b) }
  })
}

/** The leaves `settings.json` feeds, for the main-side consumers that want one of them and not a
 *  whole tree. Served from the tree main already holds — the walk decoded this exact file through
 *  these exact coercions and the watcher's settings patch keeps it current — so the daily callers
 *  (every mutate, every context-menu pop, every cascade scan) cost nothing. The disk read covers
 *  the moments before a walk has installed a tree for this root: launch-restore and adoption. */
async function liveLeaves(
  root: string,
): Promise<Pick<SettingsLeaves, 'personalization' | 'labels' | 'excluded' | 'assetDirectory'>> {
  const tree = getLiveTree()
  if (tree?.nexus.rootPath === root) return tree
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  return readSettingsLeaves(settings)
}

/** The nexus-wide interface personalization — the source the named readers below narrow. */
export const readLivePersonalization = async (root: string): Promise<Personalization> =>
  (await liveLeaves(root)).personalization

/** The nexus's labels — for the callers outside the tree walk that need to name an entity (a
 *  native menu building its "New …" items). */
export const readNexusLabels = async (root: string): Promise<NexusLabels> =>
  (await liveLeaves(root)).labels

/** The scope the walk and the watcher arm with — the user's `excluded_folders` and the asset
 *  root. A missing or unreadable settings file excludes nothing and takes the default root. */
export const readWatchScope = async (root: string): Promise<WatchScope> =>
  scopeOf(await liveLeaves(root))

/** The nexus's default window zoom from `personalization.defaultViewScale` — the factor the window
 *  opens at and ⌘0 resets to, clamped to a usable range; absent/malformed → 1.0. */
export async function readDefaultViewScale(root: string): Promise<number> {
  return coerceViewScale((await readLivePersonalization(root)).defaultViewScale)
}

/** Whether emptying the trash erases outright rather than handing the artifact to the operating
 *  system. Anything that is not literally `true` reads as off: the destructive direction is never
 *  reached by a truthy coercion. */
export async function readPermanentDelete(root: string): Promise<boolean> {
  return (await readLivePersonalization(root)).permanentDelete === true
}

/** Read the React-owned `subfield` foreign key from settings.json (null when absent/malformed). */
export async function readSubfield(root: string): Promise<SubfieldConfig | null> {
  const existing = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))
  const sub = existing?.subfield
  if (!sub || typeof sub !== 'object') return null
  const s = sub as Record<string, unknown>
  return {
    order: s.order && typeof s.order === 'object' ? (s.order as SubfieldConfig['order']) : {},
    expanded: typeof s.expanded === 'boolean' ? s.expanded : true,
  }
}

/** Write the `subfield` key, preserving every other foreign key in settings.json. */
export function writeSubfield(root: string, config: SubfieldConfig): Promise<void> {
  return updateSettings(root, (cur) => ({ ...cur, subfield: config }))
}

/** The asset root. An emptied value deletes the key rather than storing a blank — absent is what
 *  the default means, and the reader answers it either way. */
export function writeAssetDirectory(root: string, dir: string): Promise<void> {
  return updateSettings(root, ({ asset_directory: _drop, ...rest }) =>
    dir ? { ...rest, asset_directory: dir } : rest,
  )
}

/** Read the React-owned `navViewModes` foreign key from settings.json (null when absent/malformed). */
export async function readNavViewModes(root: string): Promise<NavViewModes | null> {
  const existing = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))
  const nv = existing?.navViewModes
  if (!nv || typeof nv !== 'object') return null
  const s = nv as Record<string, unknown>
  const mode = (v: unknown): NavViewMode => (v === 'gallery' ? 'gallery' : 'list')
  return { window: mode(s.window), view: mode(s.view) }
}

/** Write the `navViewModes` key, preserving every other foreign key. */
export function writeNavViewModes(root: string, modes: NavViewModes): Promise<void> {
  return updateSettings(root, (cur) => ({ ...cur, navViewModes: modes }))
}

/** Merge one personalization key into `settings.json` `personalization` (serialized; foreign +
 *  sibling keys preserved). An `undefined` value resets the key to its built-in default — JSON
 *  omits it on write. The read-side coercion + renderer apply-map own validation. */
export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
  return updateSettings(root, (cur) => {
    const p =
      cur.personalization != null &&
      typeof cur.personalization === 'object' &&
      !Array.isArray(cur.personalization)
        ? (cur.personalization as Record<string, unknown>)
        : {}
    return { ...cur, personalization: { ...p, [key]: value } }
  })
}
