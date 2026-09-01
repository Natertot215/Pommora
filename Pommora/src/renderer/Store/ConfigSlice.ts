import type { DevicePrefs } from '@shared/devicePrefs'
import { DEFAULT_COMMANDS, type Personalization } from '@shared/types'
import { applyPersonalizationKey } from '@renderer/DesignSystem/Tokens/personalization'
import type { Slice } from './SessionState'

export interface ConfigSlice {
  personalization: Personalization
  setPersonalization: <K extends keyof Personalization>(key: K, value: Personalization[K]) => void
  commands: Record<string, string>
  /** Machine-local, not the Nexus's — loaded alongside it, saved to nexus.db. */
  devicePrefs: DevicePrefs
  setDevicePref: <K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => void
  /** Per-page footnote-section visibility for pages with an explicit answer; a page with no entry
   *  follows the nexus-wide default. The section's disclosure follows this, never the reverse. */
  citationsShown: Record<string, boolean>
  setCitationsShown: (pageId: string, shown: boolean | null) => void
  toggleCitations: (pageId: string) => void
  /** Put a page's footnotes at `shown`, clearing the row when that matches the nexus-wide default —
   *  so nothing that discloses the section can pin a row forever. */
  setCitationsVisible: (pageId: string, shown: boolean) => void
}

/** The nexus-wide footnote-visibility default: an absent key means hidden. `citationsVisible` is
 *  where the fallback happens; the toggle's write compares against it. */
const citationsDefault = (s: { personalization: Personalization }): boolean =>
  s.personalization.citationsShown ?? false

/** A page's resolved footnote visibility — its own override, else the nexus-wide default. Every
 *  surface that draws a page resolves it here, so they can't disagree about one page. */
export const citationsVisible = (
  s: { personalization: Personalization; citationsShown: Record<string, boolean> },
  pageId: string | undefined,
): boolean => (pageId === undefined ? undefined : s.citationsShown[pageId]) ?? citationsDefault(s)

export const createConfigSlice: Slice<ConfigSlice> = (set, get) => ({
  personalization: {},
  setPersonalization: (key, value) => {
    // The tree copy re-identifies only for defaultIcons, the one key tree-keyed derivations
    // (nav icons, context identity) resolve — a new tree identity re-runs every tree memo and
    // pipeline, a cost a boolean toggle must never pay. Everything else reads the slice.
    set((s) => ({
      personalization: { ...s.personalization, [key]: value },
      tree:
        s.tree && key === 'defaultIcons'
          ? { ...s.tree, personalization: { ...s.tree.personalization, [key]: value } }
          : s.tree,
    }))
    applyPersonalizationKey(key, value)
    void window.nexus.personalization.set(key, value)
  },

  commands: DEFAULT_COMMANDS,

  devicePrefs: {},
  setDevicePref: (key, value) => {
    set((s) => ({ devicePrefs: { ...s.devicePrefs, [key]: value } }))
    void window.nexus.devicePrefs.save(get().devicePrefs)
  },

  citationsShown: {},
  toggleCitations: (pageId) => {
    const s = get()
    s.setCitationsVisible(pageId, !citationsVisible(s, pageId))
  },
  setCitationsVisible: (pageId, shown) => {
    const s = get()
    s.setCitationsShown(pageId, shown === citationsDefault(s) ? null : shown)
  },
  setCitationsShown: (pageId, shown) => {
    set((s) => {
      const next = { ...s.citationsShown }
      if (shown === null) delete next[pageId]
      else next[pageId] = shown
      return { citationsShown: next }
    })
    void window.nexus.citations.set(pageId, shown)
  },
})
