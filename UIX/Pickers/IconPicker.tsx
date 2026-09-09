import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PickerMenu } from './picker-base'
import { SearchField } from '../Fields/SearchField'
import { fullIconSet, Icon, loadFullIconSet, subscribeFullIconSet } from '../Symbols'
import type { IconEntry } from '../Symbols/allSymbols'
import { reorder, SortableZone, useDragItem } from '../Interactions/drag'
import { cx } from '../Utilities/cx'
import * as s from './icon-picker.css'

const { CELL, COLS } = s

export interface IconPickerProps {
  open: boolean
  onClose: () => void
  /** An SVG glyph, so `Element`. Omit ⇒ anchors to the picker's own mount point. */
  triggerRef?: RefObject<Element | null>
  value?: string
  onSelect?: (id: string) => void
  direction?: 'down' | 'up' | 'left' | 'right'
  favorites: IconFavorites
}

export type IconFavorites = {
  ids: string[]
  onChange: (next: string[]) => void
  onMenu?: (isFavorite: boolean) => Promise<'toggle' | null>
}

export function IconPicker({
  open,
  onClose,
  triggerRef,
  value,
  onSelect,
  direction = 'down',
  favorites,
}: IconPickerProps): React.JSX.Element | null {
  const favs = favorites.ids

  const [query, setQuery] = useState('')
  const set = useSyncExternalStore(subscribeFullIconSet, fullIconSet, fullIconSet)
  useEffect(() => {
    if (open) void loadFullIconSet()
  }, [open])
  const filtered = useMemo(() => set?.searchIcons(query) ?? [], [set, query])

  const pick = useCallback(
    (id: string) => {
      onSelect?.(id)
      onClose()
    },
    [onSelect, onClose],
  )

  const toggleFav = useCallback(
    (id: string) => {
      favorites.onChange(favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id])
    },
    [favs, favorites.onChange],
  )
  const reorderFavs = useCallback(
    (a: string, o: string) => {
      const next = reorder(
        favs.map((id) => ({ id })),
        a,
        o,
      ).map((x) => x.id)
      favorites.onChange(next)
    },
    [favs, favorites.onChange],
  )

  const openContext = useCallback(
    async (e: MouseEvent, id: string) => {
      e.preventDefault()
      if ((await favorites.onMenu?.(favs.includes(id))) === 'toggle') toggleFav(id)
    },
    [favs, favorites.onMenu, toggleFav],
  )

  // A state-backed callback ref, so the virtualizer re-runs the moment the element mounts.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)

  // How far the list's top sits below the scroll container's top.
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    if (listEl) setScrollMargin(listEl.offsetTop)
  }, [listEl, favs.length, open])

  const rowCount = Math.ceil(filtered.length / COLS)
  const rowVirt = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollEl,
    estimateSize: () => CELL,
    overscan: 6,
    scrollMargin,
  })

  return (
    <PickerMenu
      open={open}
      onDismiss={onClose}
      triggerRef={triggerRef}
      direction={direction}
      origin="center"
      bareSurface
      contentClassName={s.content}
    >
      <SearchField className={s.search} value={query} onValueChange={setQuery} />
      {favs.length === 0 && <div className={s.separator} />}

      <div ref={setScrollEl} className={cx(s.grid, 'over-scroll')}>
        {favs.length > 0 && (
          <div className={s.favorites}>
            <div className={cx(s.favScroll, 'over-scroll-x')}>
              <SortableZone items={favs} onReorder={reorderFavs}>
                {favs.map((id) => (
                  <FavCell
                    key={id}
                    id={id}
                    selected={id === value}
                    onPick={pick}
                    onContext={openContext}
                  />
                ))}
              </SortableZone>
            </div>
          </div>
        )}

        <div ref={setListEl} className={s.list} style={{ height: rowVirt.getTotalSize() }}>
          {rowVirt.getVirtualItems().map((vr) => {
            const start = vr.index * COLS
            return (
              <div
                key={vr.key}
                className={s.row}
                style={{ height: CELL, transform: `translateY(${vr.start - scrollMargin}px)` }}
              >
                {filtered.slice(start, start + COLS).map((entry) => (
                  <GridCell
                    key={entry.id}
                    entry={entry}
                    selected={entry.id === value}
                    onPick={pick}
                    onContext={openContext}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </PickerMenu>
  )
}

function GridCell({
  entry,
  selected,
  onPick,
  onContext,
}: {
  entry: IconEntry
  selected: boolean
  onPick: (id: string) => void
  onContext: (e: MouseEvent, id: string) => void
}): React.JSX.Element {
  const Glyph = entry.Glyph
  return (
    <button
      type="button"
      className={cx(s.cell, selected && s.cellSelected)}
      title={entry.id}
      onClick={() => onPick(entry.id)}
      onContextMenu={(e) => onContext(e, entry.id)}
    >
      <Glyph size="1em" />
    </button>
  )
}

function FavCell({
  id,
  selected,
  onPick,
  onContext,
}: {
  id: string
  selected: boolean
  onPick: (id: string) => void
  onContext: (e: MouseEvent, id: string) => void
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...handle}
      className={cx(s.cell, selected && s.cellSelected)}
      title={id}
      onClick={() => onPick(id)}
      onContextMenu={(e) => onContext(e, id)}
    >
      <Icon name={id} size="1em" />
    </button>
  )
}
