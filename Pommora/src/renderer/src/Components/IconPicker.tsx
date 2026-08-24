import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PickerMenu } from '@renderer/DesignSystem/Components/Pickers/PickerMenu/PickerMenu'
import { SearchField } from '@renderer/DesignSystem/Components/Fields'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { lucideGlyph, searchIcons, type IconEntry } from '@renderer/DesignSystem/Symbols/AllSymbols'
import { reorder, SortableZone, useDragItem } from '@renderer/DesignSystem/Interactions/drag'
import { useSession } from '@renderer/store'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './iconPicker.css'

const { CELL } = s

interface Props {
  open: boolean
  onClose: () => void
  /** The element the pane anchors to (an icon glyph is an SVG, so `Element`, not just `HTMLElement`).
   *  Omit ⇒ PickerMenu anchors to the picker's own mount point. */
  triggerRef?: RefObject<Element | null>
  value?: string
  onSelect?: (id: string) => void
  direction?: 'down' | 'up' | 'left' | 'right'
}

export function IconPicker({
  open,
  onClose,
  triggerRef,
  value,
  onSelect,
  direction = 'down',
}: Props): React.JSX.Element | null {
  const favorites = useSession((st) => st.personalization.favoriteIcons)
  const setPersonalization = useSession((st) => st.setPersonalization)
  const favs = favorites ?? []

  const [query, setQuery] = useState('')
  const filtered = useMemo(() => searchIcons(query), [query])

  const pick = useCallback(
    (id: string) => {
      onSelect?.(id)
      onClose()
    },
    [onSelect, onClose],
  )

  const toggleFav = useCallback(
    (id: string) => {
      const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]
      setPersonalization('favoriteIcons', next.length ? next : undefined)
    },
    [favs, setPersonalization],
  )
  const reorderFavs = useCallback(
    (a: string, o: string) => {
      const next = reorder(
        favs.map((id) => ({ id })),
        a,
        o,
      ).map((x) => x.id)
      setPersonalization('favoriteIcons', next)
    },
    [favs, setPersonalization],
  )

  // Right-click ⇒ the native Favorite/Remove menu (main-owned); the renderer applies the toggle.
  const openContext = useCallback(
    async (e: MouseEvent, id: string) => {
      e.preventDefault()
      const res = await window.nexus.iconFavoriteMenu(favs.includes(id))
      if (res === 'toggle') toggleFav(id)
    },
    [favs, toggleFav],
  )

  // Defaults to 6 so icons ALWAYS render —
  // a live width measurement only *widens* it, never blanks the grid. `scrollEl` is a state-backed
  // callback ref so the virtualizer re-runs the moment the element mounts (else the grid stays empty
  // until the first re-render — e.g. a keystroke).
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
  const [cols, setCols] = useState(6)
  useLayoutEffect(() => {
    if (!open || !scrollEl) return
    const measure = (): void => {
      // clientWidth (layout box), NOT getBoundingClientRect — the latter includes the Bloom scale
      // transform, so mid-open it reads a shrunken width and undercounts the columns.
      const w = scrollEl.clientWidth
      if (w > 0) setCols(Math.max(1, Math.floor(w / CELL)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [open, scrollEl])

  // Tells the virtualizer how far the list's top sits below the scroll container's top
  // (the favorites strip + separator height).
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    if (listEl) setScrollMargin(listEl.offsetTop)
  }, [listEl, favs.length, open])

  const rowCount = Math.ceil(filtered.length / cols)
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
              <SortableZone items={favs} layout="grid" onReorder={reorderFavs}>
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
            const start = vr.index * cols
            return (
              <div
                key={vr.key}
                className={s.row}
                style={{ height: CELL, transform: `translateY(${vr.start - scrollMargin}px)` }}
              >
                {filtered.slice(start, start + cols).map((entry) => (
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
  const Glyph = lucideGlyph(id)
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
      {Glyph ? <Glyph size="1em" /> : <Icon name="square-dashed" size="1em" />}
    </button>
  )
}
