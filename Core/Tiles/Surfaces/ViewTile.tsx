import { useEffect, useRef, useState } from 'react'
import type { ConnPage } from '@pommora/core/Connections/pageIndex'
import type { EmbeddedView, ViewTileEntry } from '@pommora/core/Tiles/tiles'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  DEFAULT_VIEW_ID,
  mintDefaultView,
  mintNewView,
  savedView,
  type SavedView,
  type ViewState,
} from '@pommora/core/Views/views'
import { freeName } from '@pommora/core/Paths/names'
import { Icon, LockGlyph } from '@pommora/uix/Symbols'
import { cellRing } from '@pommora/uix/Theme/ramp'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { AccessoryButton, MenuFooting, MenuItem, MenuScrollFrame } from '@pommora/uix/Menus'
import { titleInput as rowInput, rowDisabled } from '@pommora/uix/Menus/menu-base.css'
import { reorder, SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { IconChoice } from '../../Assets/IconChoice'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { notifyDeleted } from '../../Interface/Notifications/notifications'
import { findCollection, findSet } from '../../Nexus/treeIndex'
import { resolveContainerSchema } from '../../Views/Pipeline/pickView'
import { viewGlyph } from '../../Views/viewIcon'
import { ViewHost } from '../../Views/Host/ViewHost'
import { SettingsFrame } from '../../Views/Settings/SettingsFrame'
import { hostedGutter } from '@pommora/uix/Menus/menu-surface.css'
import { resolveViewWrite, ViewTileScopeProvider } from '../../Views/ViewTileScope'
import type { MutateEntry } from '../tileKinds'
import { useSession } from '../../Session/store'
import { cx } from '@pommora/uix/Utilities/cx'
import { labelSlot, labelSlotHidden, labelText } from '@pommora/uix/Buttons/button-base.css'
import { titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { useSettleFallback } from '@pommora/uix/Animations/useExitPresence'
import {
  SEGMENT_ICON,
  segment,
  segmentActive,
  segmentDrop,
  segmentEntering,
  segmentExiting,
  segmentTrail,
  settingsBtn,
  settingsBtnActive,
} from '@pommora/uix/Elements/action-band.css'
import * as s from './view-tile.css'
import { popMenu } from '../../Actions/menuActions'
import { viewsLabel } from '../../Actions/toggleLabels'
import { embedAreaMenuItems, embedTitleMenuItems } from '@pommora/core/Actions/viewMenus'
import { viewRowMenuItems } from '@pommora/core/Actions/viewRowMenu'

function coerceEmbeddedView(
  raw: unknown,
  schema: PropertyDefinition[],
  fallbackId: string,
): SavedView {
  const r = savedView.safeParse(raw ?? {})
  if (r.success && r.data.id && r.data.id !== DEFAULT_VIEW_ID) return r.data
  return { ...mintDefaultView(schema), id: fallbackId }
}

function usePillPresence(views: SavedView[]): {
  entering: Set<string>
  exiting: string | null
  beginExit: (id: string) => void
  onAnimEnd: (id: string) => void
  deleteView: { current: (id: string) => void }
} {
  const [exiting, setExiting] = useState<string | null>(null)
  const deleteView = useRef((_id: string) => {})
  const [entering, setEntering] = useState<Set<string>>(() => new Set())
  const prevIdsRef = useRef<Set<string> | null>(null)
  const ids = views.map((v) => v.id)
  const idKey = ids.join(',')
  const idsRef = useRef(ids)
  idsRef.current = ids

  useEffect(() => {
    const prev = prevIdsRef.current
    const cur = new Set(idsRef.current)
    if (prev) {
      const added = [...cur].filter((id) => !prev.has(id))
      if (added.length) setEntering((s0) => new Set([...s0, ...added]))
    }
    prevIdsRef.current = cur
  }, [idKey])

  const exited = useSettleFallback(exiting !== null, 'menu', () => {
    if (exiting) deleteView.current(exiting)
    setExiting(null)
  })

  const onAnimEnd = (id: string): void => {
    if (exiting === id) exited()
    else if (entering.has(id)) {
      setEntering((s0) => (s0.has(id) ? new Set([...s0].filter((x) => x !== id)) : s0))
    }
  }
  return { entering, exiting, beginExit: setExiting, onAnimEnd, deleteView }
}

// KNOB — how long the band's lock stays after locking before it fades
const BAND_LOCK_LINGER_MS = 2000

type PeekAnchor = { kind: 'zone'; el: Element } | { kind: 'row'; first: Element } | null

// A table reveals from its heading row; cards, which have none, from the first group band ahead of the first card, else the first row of cards.
function resolvePeekAnchor(body: Element): PeekAnchor {
  const head = body.querySelector('.table-head')
  if (head) return { kind: 'zone', el: head }
  const first = body.querySelector('.cards-view .card')
  if (!first) return null
  const band = body.querySelector('.group-band-row')
  if (band && band.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
    return { kind: 'zone', el: band }
  return { kind: 'row', first }
}

function inPeekAnchor(anchor: PeekAnchor, target: EventTarget): boolean {
  if (!anchor || !(target instanceof Element)) return false
  if (anchor.kind === 'zone') return anchor.el.contains(target)
  const card = target.closest('.card')
  return (
    card?.parentElement === anchor.first.parentElement &&
    Math.abs(card.getBoundingClientRect().top - anchor.first.getBoundingClientRect().top) < 1
  )
}

const rawViews = (raw: Record<string, unknown>): unknown[] =>
  Array.isArray(raw.views) ? [...(raw.views as unknown[])] : []

const freeEmbedId = (arr: unknown[], entryId: string): string => {
  const used = new Set(
    arr.map((el) => ((el as { config?: { id?: unknown } })?.config?.id as string) ?? ''),
  )
  let slot = arr.length
  while (used.has(`embed:${entryId}:${slot}`)) slot++
  return `embed:${entryId}:${slot}`
}

const strokeStyle = (v: SavedView): React.CSSProperties | undefined => {
  const key = labelColorFor(v.color)
  if (key === 'default') return undefined
  const stroke = cellRing(key)
  return { '--segment-stroke': stroke } as React.CSSProperties
}

function ViewPill({
  view,
  active,
  entering,
  exiting,
  labeled,
  renaming,
  label,
  onSwitch,
  onMenu,
  onAnimEnd,
}: {
  view: SavedView
  active: boolean
  entering: boolean
  exiting: boolean
  labeled: boolean
  renaming: boolean
  label: React.ReactNode
  onSwitch: () => void
  onMenu: (e: React.MouseEvent) => void
  onAnimEnd: () => void
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(view.id)
  return (
    <button
      ref={setNodeRef}
      style={{ ...style, ...strokeStyle(view) }}
      {...handle}
      type="button"
      className={cx(
        segment,
        active && segmentActive,
        entering && segmentEntering,
        exiting && segmentExiting,
      )}
      onClick={renaming ? undefined : onSwitch}
      onContextMenu={onMenu}
      onAnimationEnd={onAnimEnd}
    >
      <Icon name={viewGlyph(view)} size={SEGMENT_ICON} />
      <span className={cx(labelSlot, !renaming && !labeled && labelSlotHidden)}>
        <span className={labelText}>{label}</span>
      </span>
    </button>
  )
}

export function ViewTile({
  entry,
  mutateEntry,
  onActivate,
  openPage,
}: {
  entry: ViewTileEntry
  mutateEntry: MutateEntry
  onActivate?: () => void
  openPage?: (page: ConnPage) => void
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const [iconFor, setIconFor] = useState<number | 'title' | null>(null)
  const [colorFor, setColorFor] = useState<number | null>(null)
  const menuAnchorRef = useRef<Element | null>(null)
  const titleIconRef = useRef<SVGSVGElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLButtonElement>(null)

  const index = Math.min(entry.active ?? 0, entry.views.length - 1)
  const prevIndexRef = useRef(index)
  const slideFrom =
    index > prevIndexRef.current ? '24px' : index < prevIndexRef.current ? '-24px' : '0px'
  useEffect(() => {
    prevIndexRef.current = index
  }, [index])
  const embedded = entry.views[index]
  const source: CollectionNode | SetNode | undefined =
    embedded && tree
      ? (findCollection(tree, embedded.source_id) ?? findSet(tree, embedded.source_id))
      : undefined

  const schema = source && tree ? resolveContainerSchema(tree, source) : []
  const views = source
    ? entry.views.map((v, i) => coerceEmbeddedView(v.config, schema, `embed:${entry.id}:${i}`))
    : []
  const presence = usePillPresence(views)
  const viewsShown = entry.view_band !== false
  const [menuOpen, setMenuOpen] = useState(false)
  const anchoredOpen =
    listOpen || cfgOpen || menuOpen || renaming !== null || iconFor !== null || colorFor !== null
  const reveal = useHoverReveal({
    dwell: true,
    held: !viewsShown && anchoredOpen,
    engaged: viewsShown,
    linger: { on: BAND_LOCK_LINGER_MS },
  })
  const peekAnchor = useRef<PeekAnchor>(null)
  const bandOpen = viewsShown || reveal.on
  const hoverProps = {
    onPointerEnter: () => reveal.hover(true),
    onPointerLeave: () => reveal.hover(false),
  }
  const peekHover = viewsShown ? undefined : hoverProps

  // The anchor resolves once per entry into the body, so crossing cards reads no layout beyond the first row's.
  const bodyHover = viewsShown
    ? undefined
    : {
        onPointerOver: (e: React.PointerEvent<HTMLDivElement>) => {
          const a = peekAnchor.current
          if (!a || !(a.kind === 'zone' ? a.el : a.first).isConnected)
            peekAnchor.current = resolvePeekAnchor(e.currentTarget)
          reveal.hover(inPeekAnchor(peekAnchor.current, e.target))
        },
        onPointerLeave: () => {
          peekAnchor.current = null
          reveal.hover(false)
        },
      }

  if (!embedded || !source || !tree) return <div className="tile-inert" />

  const view = views[index]
  const titleShown = entry.title !== false
  const iconShown = entry.icon !== false
  const titleLevel = entry.title_level ?? 4
  const labeled = (entry.view_button ?? 'labeled') === 'labeled'
  const dropdown = entry.view_style === 'dropdown'

  const locked = entry.locked ?? false
  const patchEntry = (patch: Record<string, unknown>): void => {
    if (locked && !('locked' in patch) && !('active' in patch)) return
    mutateEntry(entry.id, (raw) => {
      const next = { ...raw, ...patch }
      for (const [k, v] of Object.entries(patch)) if (v === undefined) delete next[k]
      return next
    })
  }
  const setLocked = (v: boolean): void => patchEntry({ locked: v ? true : undefined })
  const writeConfig = (i: number, config: SavedView): void => {
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const el = arr[i]
      if (typeof el !== 'object' || el === null) return raw
      arr[i] = { ...(el as Record<string, unknown>), config }
      return { ...raw, views: arr }
    })
  }
  const persistConfig = (i: number, config: SavedView): void => {
    if (resolveViewWrite(locked, config).kind === 'config') writeConfig(i, config)
  }
  // Folds onto the STORED view, never the caller's — the live overrides on a locked tile hold gestures the lock already refused.
  const persistState = (i: number, state: ViewState): void => {
    const stored = views[i]
    if (stored) writeConfig(i, { ...stored, ...state })
  }
  const addView = (): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      arr.push({
        source_id: source.id,
        config: { ...mintNewView('Untitled', schema), id: freeEmbedId(arr, entry.id) },
      })
      return { ...raw, views: arr, active: arr.length - 1 }
    })
  }
  const duplicate = (i: number): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const el = arr[i]
      if (typeof el !== 'object' || el === null) return raw
      const config = {
        ...views[i],
        id: freeEmbedId(arr, entry.id),
        name: freeName(
          views[i].name,
          views.map((v) => v.name),
        ),
      }
      arr.splice(i + 1, 0, { ...(el as Record<string, unknown>), config })
      return { ...raw, views: arr, active: i + 1 }
    })
  }
  const restoreViewAt = (i: number, el: EmbeddedView): void => {
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const at = Math.min(i, arr.length)
      arr.splice(at, 0, el)
      return { ...raw, views: arr, active: at }
    })
  }
  const deleteView = (id: string): void => {
    if (locked) return
    const i = views.findIndex((v) => v.id === id)
    if (i < 0 || entry.views.length <= 1) return
    const removed = entry.views[i]
    const name = views[i].name
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      if (arr.length <= 1) return raw
      arr.splice(i, 1)
      const cur = typeof raw.active === 'number' ? raw.active : 0
      return { ...raw, views: arr, active: Math.min(cur > i ? cur - 1 : cur, arr.length - 1) }
    })
    notifyDeleted(name, () => restoreViewAt(i, removed))
  }
  presence.deleteView.current = deleteView

  const reorderViews = (activeId: string, overId: string): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const seq = reorder(
        views.map((v, i) => ({ id: v.id, i })),
        activeId,
        overId,
      )
      const next = seq.map((x) => arr[x.i]).filter((x) => x != null)
      const newActive = seq.findIndex((x) => x.i === index)
      return { ...raw, views: next, active: newActive >= 0 ? newActive : 0 }
    })
  }
  const commitTitle = (next: string): void => {
    patchEntry({ display_title: !next || next === source.title ? undefined : next })
  }

  const toggleViews = (): void => patchEntry({ view_band: viewsShown ? false : undefined })
  const popHeld = async <A extends string>(
    items: Parameters<typeof popMenu<A>>[0],
  ): Promise<A | null> => {
    setMenuOpen(true)
    try {
      return await popMenu(items)
    } finally {
      setMenuOpen(false)
    }
  }
  const titleMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    if (locked) return
    const action = await popHeld(embedTitleMenuItems(iconShown, titleLevel, viewsShown))
    if (action === 'toggle-icon') patchEntry({ icon: iconShown ? false : undefined })
    else if (action === 'change-icon') {
      menuAnchorRef.current = titleIconRef.current
      setIconFor('title')
    } else if (action === 'hide-title') patchEntry({ title: false })
    else if (action === 'toggle-views') toggleViews()
    else if (action?.startsWith('size-')) {
      const n = Number(action.slice(5))
      patchEntry({ title_level: n === 4 ? undefined : n })
    }
  }
  const areaMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    if (locked) return
    const action = await popHeld(
      embedAreaMenuItems({ viewStyle: dropdown ? 'dropdown' : 'toolbar', titleShown, viewsShown }),
    )
    if (action === 'show-title') patchEntry({ title: undefined })
    else if (action === 'toggle-views') toggleViews()
    else if (action === 'new-view') addView()
    else if (action === 'style-dropdown') patchEntry({ view_style: 'dropdown' })
    else if (action === 'style-toolbar') patchEntry({ view_style: undefined })
  }
  const rowMenu = async (i: number, e: React.MouseEvent, animate: boolean): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (locked) return
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await popHeld(
      viewRowMenuItems({ titlesShown: labeled, deletable: entry.views.length > 1 }),
    )
    switch (action) {
      case 'rename':
        return setRenaming(i)
      case 'icon':
        return setIconFor(i)
      case 'color':
        return setColorFor(i)
      case 'duplicate':
        return duplicate(i)
      case 'titles':
        return patchEntry({ view_button: labeled ? 'icon' : undefined })
      case 'delete':
        if (!(await askDeleteView('tile'))) return
        return animate ? presence.beginExit(views[i].id) : deleteView(views[i].id)
      default:
        return
    }
  }

  const viewLabel = (i: number): React.JSX.Element => (
    <RenamableLabel
      renames="title"
      editing={renaming === i}
      value={views[i].name}
      className={rowInput}
      autoSize
      onCommit={(next) => {
        setRenaming(null)
        persistConfig(i, { ...views[i], name: next })
      }}
      onBegin={() => setRenaming(i)}
      onCancel={() => setRenaming(null)}
    />
  )

  const configButton = (
    <button
      ref={btnRef}
      type="button"
      className={cx(settingsBtn, cfgOpen && settingsBtnActive)}
      aria-label="View settings"
      onClick={() => setCfgOpen(true)}
    >
      <Icon name="sliders-horizontal" size="body" />
    </button>
  )

  const bandLock = !locked && (
    <span className={cx(s.bandLock, !reveal.on && titleActionFadeHidden)}>
      <button
        type="button"
        className={settingsBtn}
        aria-label={viewsLabel(viewsShown)}
        onClick={() => {
          reveal.press()
          toggleViews()
        }}
      >
        <LockGlyph locked={viewsShown} size="body" />
      </button>
    </span>
  )

  const newViewButton = (
    <AccessoryButton
      icon="plus"
      size="control"
      box={20}
      create
      ariaLabel="New View"
      disabled={locked}
      className={locked ? rowDisabled : undefined}
      onClick={addView}
    />
  )

  const switcher = dropdown ? (
    <button
      ref={dropRef}
      type="button"
      className={cx(segment, segmentActive, segmentDrop)}
      style={strokeStyle(view)}
      onClick={() => setListOpen(true)}
    >
      <Icon name={viewGlyph(view)} size={SEGMENT_ICON} />
      <span className={cx(labelSlot, !labeled && labelSlotHidden)}>
        <span className={labelText}>{view.name}</span>
      </span>
      <Icon name="chevrons-up-down" size="control" className={segmentTrail} />
    </button>
  ) : (
    <>
      <SortableZone
        items={views.map((v) => v.id)}
        axis="x"
        disabled={locked}
        onReorder={reorderViews}
      >
        {views.map((v, i) => (
          <ViewPill
            key={v.id}
            view={v}
            active={i === index}
            entering={presence.entering.has(v.id)}
            exiting={presence.exiting === v.id}
            labeled={labeled}
            renaming={renaming === i}
            label={viewLabel(i)}
            onSwitch={() => patchEntry({ active: i })}
            onMenu={(e) => void rowMenu(i, e, true)}
            onAnimEnd={() => presence.onAnimEnd(v.id)}
          />
        ))}
      </SortableZone>
      <span className={s.newViewReveal}>{newViewButton}</span>
    </>
  )

  return (
    <ViewTileScopeProvider
      value={{
        source,
        view,
        persistConfig: (next) => persistConfig(index, next),
        persistState: (next) => persistState(index, next),
        locked,
        setLocked,
        openPage,
      }}
    >
      <div className={s.tile} onPointerDownCapture={onActivate}>
        <div className={cx(s.titleSpace, !titleShown && s.titleSpaceHidden)}>
          <div className={s.spaceInner}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
            <div className={s.titleRow} onContextMenu={(e) => void titleMenu(e)} {...peekHover}>
              <span className={cx(s.titleSlide, !titleShown && s.titleSlideHidden)}>
                <Icon
                  ref={titleIconRef}
                  name={entityIcon(source.kind, entry.display_icon ?? source.icon, defaultIcons)}
                  className={cx(
                    s.titleIcon,
                    `md-h${titleLevel}`,
                    'title-icon-reveal',
                    !iconShown && iconFor !== 'title' && 'is-hidden',
                  )}
                />
                <RenamableLabel
                  renames="title"
                  editing={titleEditing}
                  emptyCommits
                  value={entry.display_title ?? source.title}
                  className={`${s.titleText} md-h${titleLevel}`}
                  onCommit={(next) => {
                    setTitleEditing(false)
                    commitTitle(next)
                  }}
                  onBegin={locked ? undefined : () => setTitleEditing(true)}
                  onCancel={() => setTitleEditing(false)}
                >
                  <span className={`${s.titleText} md-h${titleLevel}`}>
                    {entry.display_title ?? source.title}
                  </span>
                </RenamableLabel>
              </span>
              {titleShown && configButton}
            </div>
          </div>
        </div>
        <div className={cx(s.bandSpace, !bandOpen && s.bandSpaceHidden)} {...hoverProps}>
          <div className={s.spaceInner}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
            <div className={s.switcherRow} onContextMenu={(e) => void areaMenu(e)}>
              {switcher}
              <span className={s.spacer} />
              {!titleShown && configButton}
              {bandLock}
            </div>
          </div>
        </div>
        <div className={cx(s.body, !bandOpen && s.bodyFlush, 'over-scroll')} {...bodyHover}>
          <div
            key={index}
            className={s.slideWrap}
            style={{ '--slide-from': slideFrom } as React.CSSProperties}
          >
            <ViewHost key={source.id} source={source} />
          </div>
        </div>
        <PickerMenu
          open={cfgOpen}
          onDismiss={() => setCfgOpen(false)}
          triggerRef={btnRef}
          bareSurface
          contentClassName={hostedGutter}
        >
          <SettingsFrame />
        </PickerMenu>
        <PickerMenu solid open={listOpen} onDismiss={() => setListOpen(false)} triggerRef={dropRef}>
          <div className={s.listPane}>
            <MenuScrollFrame
              maxHeight={PICKER_MAX_HEIGHT}
              footer={<MenuFooting leading={newViewButton} />}
            >
              {views.map((v, i) => (
                <MenuItem
                  key={v.id}
                  checked={i === index}
                  leading={<Icon name={viewGlyph(v)} size="headline" />}
                  onClick={renaming === i ? undefined : () => patchEntry({ active: i })}
                  onContextMenu={(e) => void rowMenu(i, e, false)}
                >
                  {viewLabel(i)}
                </MenuItem>
              ))}
            </MenuScrollFrame>
          </div>
        </PickerMenu>
        <IconChoice
          open={iconFor !== null}
          onClose={() => setIconFor(null)}
          triggerRef={menuAnchorRef}
          value={
            iconFor === 'title'
              ? (entry.display_icon ?? source.icon)
              : iconFor !== null
                ? views[iconFor]?.icon
                : undefined
          }
          onSelect={(icon) => {
            if (iconFor === 'title') patchEntry({ display_icon: icon })
            else if (iconFor !== null) persistConfig(iconFor, { ...views[iconFor], icon })
          }}
        />
        <ColorPicker
          open={colorFor !== null}
          selected={labelColorFor(colorFor !== null ? views[colorFor]?.color : undefined)}
          onPick={(picked) => {
            if (colorFor !== null) persistConfig(colorFor, { ...views[colorFor], color: picked })
            setColorFor(null)
          }}
          onDismiss={() => setColorFor(null)}
          triggerRef={menuAnchorRef}
        />
      </div>
    </ViewTileScopeProvider>
  )
}
