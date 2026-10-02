import { persist } from '../Interface/Notifications/notifications'
import type { DevicePrefs } from '../Settings/devicePrefs'
import { type Commands, DEFAULT_COMMANDS } from '../Actions/commands'
import {
  type Personalization,
  SETTING_DEFAULTS,
  settingOf,
  settingValue,
} from '../Settings/personalization'
import { applyPersonalizationKey } from '../Settings/applyPersonalization'
import type { Slice } from './sessionState'
import { dialer } from '../Platform/dialer'
import { saveDevicePrefs } from './saveScheduler'
import type { NexusTree } from '../Nexus/tree'
import { stabilize } from '../Nexus/treeStabilize'

export interface ConfigSlice {
  setPersonalization: <K extends keyof Personalization>(key: K, value: Personalization[K]) => void
  /** Machine-local, not the Nexus's — loaded alongside it, saved to nexus.db. */
  devicePrefs: DevicePrefs
  /** Whether `devicePrefs` is the open Nexus's own record, the only one that saves; a record not yet read or refused holds nothing to save into. */
  devicePrefsLive: boolean
  setDevicePref: <K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => void
  /** Per-page footnote-section visibility for pages with an explicit answer; a page with no entry follows the nexus-wide default. The section's disclosure follows this, never the reverse. */
  citationsShown: Record<string, boolean>
  toggleCitations: (pageId: string) => void
  /** Clears the row when `shown` matches the nexus-wide default, so nothing that discloses the section can pin a row forever. */
  setCitationsVisible: (pageId: string, shown: boolean) => void
}

type Holding = { tree: NexusTree | null }

const NO_PERSONALIZATION: Personalization = {}

export const personalizationOf = (s: Holding): Personalization =>
  s.tree?.config.personalization ?? NO_PERSONALIZATION

export const commandsOf = (s: Holding): Commands => s.tree?.config.commands ?? DEFAULT_COMMANDS

// A tree read before a newer local toggle would roll that toggle back if it lands after it, so a key with an ask in flight keeps the value the slice holds.
const inFlight = new Map<string, number>()

export function withOwnSettings(tree: NexusTree, held: NexusTree | null): NexusTree {
  if (!held || !inFlight.size) return tree
  const mine: Record<string, unknown> = held.config.personalization
  const own = Object.fromEntries([...inFlight.keys()].map((key) => [key, mine[key]]))
  const personalization: Personalization = stabilize(
    { ...tree.config.personalization, ...own },
    held.config.personalization,
  )
  return { ...tree, config: { ...tree.config, personalization } }
}

/** An absent key means hidden. `citationsVisible` is where the fallback happens; the toggle's write compares against it. */
const citationsDefault = (s: Holding): boolean => settingOf(personalizationOf(s), 'citationsShown')

/** Every surface that draws a page resolves its footnote visibility here, so they can't disagree about one page. */
export const citationsVisible = (
  s: Holding & { citationsShown: Record<string, boolean> },
  pageId: string | undefined,
): boolean => (pageId === undefined ? undefined : s.citationsShown[pageId]) ?? citationsDefault(s)

export const createConfigSlice: Slice<ConfigSlice> = (set, get) => ({
  setPersonalization: (key, next) => {
    const settled = settingValue(key, next)
    const value = settled === SETTING_DEFAULTS[key] ? undefined : settled
    set(({ tree }) =>
      tree
        ? {
            tree: {
              ...tree,
              config: {
                ...tree.config,
                personalization: { ...tree.config.personalization, [key]: value },
              },
            },
          }
        : {},
    )
    applyPersonalizationKey(key, value)
    inFlight.set(key, (inFlight.get(key) ?? 0) + 1)
    const landed = dialer()
      .ask('personalization:set', key, value)
      .finally(() => {
        const left = (inFlight.get(key) ?? 1) - 1
        if (left) inFlight.set(key, left)
        else inFlight.delete(key)
      })
    void persist('the setting', landed)
  },

  devicePrefs: {},
  devicePrefsLive: false,
  setDevicePref: (key, value) => {
    set((s) => ({ devicePrefs: { ...s.devicePrefs, [key]: value } }))
    if (get().devicePrefsLive)
      saveDevicePrefs(() => dialer().ask('devicePrefs:save', get().devicePrefs))
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
    void persist('the footnote setting', dialer().ask('citations:set', pageId, stored), true)
  },
})
