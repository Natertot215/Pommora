import { persist } from '@pommora/core/Interface/Notifications/notifications'
import type { DevicePrefs } from '@pommora/core/Settings/devicePrefs'
import { type Commands, DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import {
  type Personalization,
  SETTING_DEFAULTS,
  settingOf,
} from '@pommora/core/Settings/personalization'
import { applyPersonalizationKey } from '../Settings/applyPersonalization'
import type { Slice } from './sessionState'
import { host } from '../Platform/dialer'

export interface ConfigSlice {
  personalization: Personalization
  setPersonalization: <K extends keyof Personalization>(key: K, value: Personalization[K]) => void
  commands: Commands
  /** Machine-local, not the Nexus's — loaded alongside it, saved to nexus.db. */
  devicePrefs: DevicePrefs
  /** Whether `devicePrefs` is the open Nexus's own record: `unread` asks for it on the next tree, `held` keeps a record that may belong to another Nexus or never arrived from saving, and only `live` saves. */
  devicePrefsState: 'unread' | 'held' | 'live'
  setDevicePref: <K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => void
  /** Per-page footnote-section visibility for pages with an explicit answer; a page with no entry follows the nexus-wide default. The section's disclosure follows this, never the reverse. */
  citationsShown: Record<string, boolean>
  toggleCitations: (pageId: string) => void
  /** Clears the row when `shown` matches the nexus-wide default, so nothing that discloses the section can pin a row forever. */
  setCitationsVisible: (pageId: string, shown: boolean) => void
}

/** An absent key means hidden. `citationsVisible` is where the fallback happens; the toggle's write compares against it. */
const citationsDefault = (s: { personalization: Personalization }): boolean =>
  settingOf(s.personalization, 'citationsShown')

/** Every surface that draws a page resolves its footnote visibility here, so they can't disagree about one page. */
export const citationsVisible = (
  s: { personalization: Personalization; citationsShown: Record<string, boolean> },
  pageId: string | undefined,
): boolean => (pageId === undefined ? undefined : s.citationsShown[pageId]) ?? citationsDefault(s)

export const createConfigSlice: Slice<ConfigSlice> = (set, get) => ({
  personalization: {},
  setPersonalization: (key, next) => {
    const value = next === SETTING_DEFAULTS[key] ? undefined : next
    // The tree copy re-identifies only for defaultIcons, the one key tree-keyed derivations resolve — a new tree identity re-runs every tree memo and pipeline, a cost a boolean toggle must never pay. Everything else reads the slice.
    set((s) => ({
      personalization: { ...s.personalization, [key]: value },
      tree:
        s.tree && key === 'defaultIcons'
          ? { ...s.tree, personalization: { ...s.tree.personalization, [key]: value } }
          : s.tree,
    }))
    applyPersonalizationKey(key, value)
    void persist('the setting', host().ask('personalization:set', key, value))
  },

  commands: DEFAULT_COMMANDS,

  devicePrefs: {},
  devicePrefsState: 'unread',
  setDevicePref: (key, value) => {
    set((s) => ({ devicePrefs: { ...s.devicePrefs, [key]: value } }))
    if (get().devicePrefsState === 'live')
      void persist('the setting', host().ask('devicePrefs:save', get().devicePrefs))
  },

  citationsShown: {},
  toggleCitations: (pageId) => {
    const s = get()
    s.setCitationsVisible(pageId, !citationsVisible(s, pageId))
  },
  setCitationsVisible: (pageId, shown) => {
    const stored = shown === citationsDefault(get()) ? null : shown
    set((s) => {
      const next = { ...s.citationsShown }
      if (stored === null) delete next[pageId]
      else next[pageId] = stored
      return { citationsShown: next }
    })
    void persist('the footnote setting', host().ask('citations:set', pageId, stored), true)
  },
})
