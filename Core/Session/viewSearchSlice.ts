import { tabKey } from '../Navigation/tabsModel'
import { frozenOf } from './navigationSlice'
import type { SessionState, Slice } from './sessionState'

/** `key` is the tab's shown entity when the search opened; the entry drops once the tab shows anything else. `summon` counts the tab's own summons, each one refocusing its field. */
export interface ViewSearch {
  key: string
  query: string
  summon: number
}

export interface ViewSearchSlice {
  viewSearch: Record<string, ViewSearch>
  searchView: () => boolean
  setViewQuery: (query: string | null) => void
  scrubTabSearch: (tabId: string) => void
  retagTabSearch: (oldId: string, newId: string) => void
  pruneViewSearch: () => void
  resetViewSearch: () => void
}

const heldContainerKey = (s: SessionState): string | null =>
  frozenOf(s) && (s.selection.kind === 'collection' || s.selection.kind === 'set')
    ? tabKey(s.selection)
    : null

/** A cold switch holds the last container on screen until the next page lands, so the held frame reads the search of the tab it belongs to. */
export const shownViewSearch = (s: SessionState): ViewSearch | undefined => {
  const held = heldContainerKey(s)
  if (held === null) return s.viewSearch[s.activeTabId]
  return Object.values(s.viewSearch).find((search) => search.key === held)
}

export const createViewSearchSlice: Slice<ViewSearchSlice> = (set, get) => ({
  viewSearch: {},
  searchView: () => {
    const { selection, activeTabId, viewSearch } = get()
    if (selection.kind !== 'collection' && selection.kind !== 'set') return false
    const open = viewSearch[activeTabId] ?? { key: tabKey(selection), query: '', summon: 0 }
    set({ viewSearch: { ...viewSearch, [activeTabId]: { ...open, summon: open.summon + 1 } } })
    return true
  },
  setViewQuery: (query) => {
    const { activeTabId, viewSearch } = get()
    const { [activeTabId]: open, ...rest } = viewSearch
    if (!open) return
    set({ viewSearch: query === null ? rest : { ...rest, [activeTabId]: { ...open, query } } })
  },
  scrubTabSearch: (tabId) => {
    const { [tabId]: search, ...rest } = get().viewSearch
    if (search) set({ viewSearch: rest })
  },
  retagTabSearch: (oldId, newId) => {
    const { [oldId]: search, ...rest } = get().viewSearch
    if (search) set({ viewSearch: { ...rest, [newId]: search } })
  },
  pruneViewSearch: () => {
    const s = get()
    const shown = new Map([...s.tabs, ...s.pinnedTabs].map((t) => [t.id, tabKey(t.target)]))
    const searches = Object.entries(s.viewSearch)
    const onScreen = heldContainerKey(s)
    const held = searches.filter(
      ([tabId, search]) =>
        (shown.get(tabId) === search.key || search.key === onScreen) &&
        (search.query.trim() !== '' || tabId === s.activeTabId),
    )
    if (held.length < searches.length) set({ viewSearch: Object.fromEntries(held) })
  },
  resetViewSearch: () => set({ viewSearch: {} }),
})
