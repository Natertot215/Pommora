import type { DevicePrefs } from '@shared/devicePrefs'
import type { Personalization } from '@shared/types'
import { applyPersonalizationKey } from '@renderer/DesignSystem/Theming/personalization'
import type { Slice } from './SessionState'

export interface ConfigSlice {
  personalization: Personalization
  setPersonalization: <K extends keyof Personalization>(key: K, value: Personalization[K]) => void
  /** Machine-local, not the Nexus's — loaded alongside it, saved to nexus.db. */
  devicePrefs: DevicePrefs
  setDevicePref: <K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => void
  /** Per-page footnote-section visibility, for the pages someone has given an answer. A page with no
   *  entry follows the nexus-wide default. THE state the section's disclosure reads and writes —
   *  the fold follows it, never the other way around. */
  citationsShown: Record<string, boolean>
  setCitationsShown: (pageId: string, shown: boolean | null) => void
  /** THE flip, so the two controls that offer it cannot disagree about what it means — including
   *  that landing back on the nexus-wide default clears the row rather than restating it. */
  toggleCitations: (pageId: string) => void
  /** Put a page's footnotes at `shown`, clearing the row when that IS the nexus-wide default. THE
   *  rule, so nothing that discloses the section can write a row that pins it forever. */
  setCitationsVisible: (pageId: string, shown: boolean) => void
}

/** The nexus-wide footnote-visibility default: an absent key means hidden. Local, because a page's
 *  own answer is the only one a surface asks for — `citationsVisible` is where the fallback happens
 *  and the toggle's own write is what compares against it. */
const citationsDefault = (s: { personalization: Personalization }): boolean =>
  s.personalization.citationsShown ?? false

/** A page's resolved footnote visibility — its own override, else the nexus-wide default. THE
 *  reading of it: every surface that draws a page resolves it HERE rather than restating the
 *  fallback, so a preview, a hover card and the main pane cannot disagree about one page. */
export const citationsVisible = (
  s: { personalization: Personalization; citationsShown: Record<string, boolean> },
  pageId: string | undefined,
): boolean => (pageId === undefined ? undefined : s.citationsShown[pageId]) ?? citationsDefault(s)

export const createConfigSlice: Slice<ConfigSlice> = (set, get) => ({
  personalization: {},
  setPersonalization: (key, value) => {
    // One writer, both projections — but the tree copy re-identifies only for defaultIcons,
    // the one key tree-keyed derivations (nav icons, context identity) actually resolve:
    // a new tree identity re-runs every tree memo, thumbnail gate and pipeline, which a
    // boolean toggle must never cost. Everything else reads the slice.
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
