import { tabKey } from '../Navigation/tabsModel'
import { tabOf } from './navigationSlice'
import type { Slice } from './sessionState'

/** `key` is the tab's shown entity when the search opened; the entry drops once the tab shows anything else. `summon` counts the tab's own summons, each one refocusing its field. */
export interface ViewSearch {
  key: string
  query: string
  summon: number
}

export interface ViewSearchSlice {
  viewSearch: Record<string, ViewSearch>
  searchView: (tabId: string) => boolean
  setViewQuery: (tabId: string, query: string | null) => void
  scrubTabSearch: (tabId: string) => void
  retagTabSearch: (oldId: string, newId: string) => void
  pruneViewSearch: () => void
  resetViewSearch: () => void
}

export const createViewSearchSlice: Slice<ViewSearchSlice> = (set, get) => ({
  viewSearch: {},
  searchView: (tabId) => {
    const target = tabOf(get(), tabId)?.target
    if (target?.kind !== 'collection' && target?.kind !== 'set') return false
    const { viewSearch } = get()
    const open = viewSearch[tabId] ?? { key: tabKey(target), query: '', summon: 0 }
    set({ viewSearch: { ...viewSearch, [tabId]: { ...open, summon: open.summon + 1 } } })
    return true
  },
  setViewQuery: (tabId, query) => {
    const { [tabId]: open, ...rest } = get().viewSearch
    if (!open) return
    set({ viewSearch: query === null ? rest : { ...rest, [tabId]: { ...open, query } } })
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
    const held = searches.filter(
      ([tabId, search]) =>
        shown.get(tabId) === search.key && (search.query.trim() !== '' || tabId === s.activeTabId),
    )
    if (held.length < searches.length) set({ viewSearch: Object.fromEntries(held) })
  },
  resetViewSearch: () => set({ viewSearch: {} }),
})
