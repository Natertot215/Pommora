import { type Ref, useMemo, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import type { NavRef } from './navRef'
import { useSession } from '../Session/store'
import type { ResolvedNav } from './navResolve'
import { NavGallery } from './NavGallery'
import { NavList } from './NavList'

const NO_PINS: ResolvedNav[] = []

/** The host places `search`; a search lists its results in the chosen style, with no pins and no reorder. */
export function useNavBase({
  gallery,
  search,
  pins,
  recents,
  onReordered,
  onSelect,
  onOpenNewTab,
  inputRef,
}: {
  gallery: boolean
  search: (query: string) => ResolvedNav[]
  pins: ResolvedNav[]
  recents: ResolvedNav[]
  onReordered?: (next: ResolvedNav[]) => void
  onSelect: (target: NavRef) => void
  onOpenNewTab: (target: NavRef) => void
  inputRef?: Ref<HTMLInputElement>
}): { search: React.JSX.Element; body: React.ReactNode; count: number } {
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? search(query) : null), [query, search])
  // A drag commits the SHOWN order wholesale: the store's live order can lag what's drawn, so splicing against it would land elsewhere than the drop showed.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const onReorderRecent = (key: string, beforeKey: string | null): void => {
    const next = moveBefore(recents, (r) => r.key, key, beforeKey)
    if (!next) return
    onReordered?.(next)
    setRecentsOrder(next.map((r) => r.key))
  }
  const shown = results
    ? { pins: NO_PINS, items: results }
    : { pins, items: recents, onReorderRecent }
  return {
    search: (
      <SearchField
        inputRef={inputRef}
        className={cx('nav-view-search', text.headline.emphasized)}
        value={query}
        onValueChange={setQuery}
      />
    ),
    body: gallery ? (
      <NavGallery {...shown} onSelect={onSelect} onOpenNewTab={onOpenNewTab} />
    ) : (
      <NavList {...shown} onSelect={onSelect} onOpenNewTab={onOpenNewTab} />
    ),
    count: shown.pins.length + shown.items.length,
  }
}
