import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConnPage } from '@pommora/core/Connections/pageIndex'
import type { EntryPatch, ViewTileEntry } from '@pommora/core/Tiles/tiles'
import { isPlainObject } from '@pommora/core/Contract/validators'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  mergeViewEdit,
  mintDefaultView,
  mintNewView,
  mintViewId,
  ownsViewId,
  savedView,
  type SavedView,
  type ViewState,
  viewIdsOf,
} from '@pommora/core/Views/views'
import { freeName } from '@pommora/core/Paths/names'
import { Icon, LockGlyph } from '@pommora/uix/Symbols'
import { cellRing, colorNameFor } from '@pommora/uix/Theme/ramp'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { AccessoryButton, MenuFooting, MenuItem, MenuScrollFrame } from '@pommora/uix/Menus'
import { titleInput as rowInput, rowDisabled, spacer } from '@pommora/uix/Menus/menu-row.css'
import { reorder, SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { IconChoice } from '../../Assets/IconChoice'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { notifyDeleted } from '../../Interface/Notifications/notifications'
import { findCollection, findSet } from '../../Nexus/treeIndex'
import { NO_SCHEMA, resolveContainerSchema } from '../../Views/Pipeline/pickView'
import { viewGlyph } from '../../Views/viewIcon'
import { ViewHost } from '../../Views/Host/ViewHost'
import { SettingsFrame } from '../../Views/Settings/SettingsFrame'
import { hostedGutter } from '@pommora/uix/Menus/menu-surface.css'
import { resolveViewWrite, ViewTileScopeProvider } from '../../Views/ViewTileScope'
import { inertTile, type MutateEntry } from '../tileKinds'
import { useSession } from '../../Session/store'
import { cx } from '@pommora/uix/Utilities/cx'
import { labelSlot, labelSlotHidden, labelText } from '@pommora/uix/Buttons/button-base.css'
import { titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { useSettleFallback } from '@pommora/uix/Animations/useExitPresence'
import {
  VIEW_PILL_ICON,
  viewPill,
  viewPillActive,
  viewPillDrop,
  viewPillEntering,
  viewPillExiting,
  viewPillTrail,
  settingsBtn,
  settingsBtnActive,
} from '@pommora/uix/Elements/view-strip.css'
import * as s from './view-tile.css'
import { popMenu } from '../../Actions/menuActions'
import { viewsLabel } from '../../Actions/toggleLabels'
import { embedAreaMenuItems, embedTitleMenuItems } from '@pommora/core/Actions/viewMenus'
import { viewRowMenuItems } from '@pommora/core/Actions/viewRowMenu'
import { useLatest, useStableApi } from '@pommora/uix/Utilities/stableApi'

function coerceEmbeddedView(raw: unknown, schema: PropertyDefinition[], id: string): SavedView {
  const r = savedView.safeParse(raw ?? {})
  return { ...(r.success ? r.data : mintDefaultView(schema)), id }
}

const configIdOf = (el: unknown): unknown =>
  (el as { config?: { id?: unknown } } | null)?.config?.id

export const embedViewIds = (els: readonly unknown[], entryId: string): string[] =>
  viewIdsOf(els.map(configIdOf), (n) => `embed:${entryId}:${n}`)

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
  const idsRef = useLatest(ids)

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

// KNOB — how long the strip's lock stays after locking before it fades
const STRIP_LOCK_LINGER_MS = 2000

type PeekAnchor =
  | { kind: 'zone'; el: Element }
  | { kind: 'row'; first: HTMLElement; lead: Element | null; cols: number }
  | null

// A table reveals from its heading row; cards, which have none, from the first group band ahead of the first card, else the first row of cards.
function resolvePeekAnchor(body: Element): PeekAnchor {
  const head = body.querySelector('.table-head')
  if (head) return { kind: 'zone', el: head }
  const first = body.querySelector<HTMLElement>('.cards-view .card')
  if (!first) return null
  const band = body.querySelector('.group-band-row')
  if (band && band.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
    return { kind: 'zone', el: band }
  // The row is counted once by offsetTop, which a scroll leaves alone, so hovering tests position alone; a width change is counted on the next entry.
  let cols = 1
  for (
    let n = first.nextElementSibling;
    n instanceof HTMLElement && n.offsetTop === first.offsetTop;
    n = n.nextElementSibling
  )
    cols++
  return { kind: 'row', first, lead: first.previousElementSibling, cols }
}

function inPeekAnchor(anchor: PeekAnchor, target: EventTarget): boolean {
  if (!anchor || !(target instanceof Element)) return false
  if (anchor.kind === 'zone') return anchor.el.contains(target)
  let n = target.closest('.card')
  for (let i = 0; n && i < anchor.cols; i++, n = n.previousElementSibling)
    if (n === anchor.first) return true
  return false
}

const rawViews = (raw: Record<string, unknown>): unknown[] =>
  Array.isArray(raw.views) ? [...(raw.views as unknown[])] : []

// Read as the entry's parse reads it: a non-negative integer, else the first view, clamped to the views held.
const rawActive = (raw: Record<string, unknown>, count: number): number =>
  Math.min(
    Number.isInteger(raw.active) && (raw.active as number) >= 0 ? (raw.active as number) : 0,
    count - 1,
  )

const strokeStyle = (v: SavedView): React.CSSProperties | undefined => {
  const key = colorNameFor(v.color)
  if (key === 'default') return undefined
  const stroke = cellRing(key)
  return { '--view-pill-stroke': stroke } as React.CSSProperties
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
  const open = renaming ? undefined : onSwitch
  const { setNodeRef, style, handle } = useDragItem(view.id, open)
  return (
    <button
      ref={setNodeRef}
      style={{ ...style, ...strokeStyle(view) }}
      {...handle}
      type="button"
      className={cx(
        viewPill,
        active && viewPillActive,
        entering && viewPillEntering,
        exiting && viewPillExiting,
      )}
      onClick={open}
      onContextMenu={onMenu}
      onAnimationEnd={onAnimEnd}
    >
      <Icon name={viewGlyph(view)} size={VIEW_PILL_ICON} />
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
  const [renaming, setRenaming] = useState<string | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const [iconFor, setIconFor] = useState<{ view: string } | 'title' | null>(null)
  const [colorFor, setColorFor] = useState<string | null>(null)
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

  const schema = useMemo(
    () => (source && tree ? resolveContainerSchema(tree, source) : NO_SCHEMA),
    [tree, source],
  )
  const views = useMemo(() => {
    if (!source) return []
    const ids = embedViewIds(entry.views, entry.id)
    return entry.views.map((v, i) => coerceEmbeddedView(v.config, schema, ids[i]))
  }, [source, schema, entry.views, entry.id])
  const view = views[index]
  const viewById = (id: string | null | undefined): SavedView | undefined =>
    views.find((v) => v.id === id)
  const viewAt = (arr: unknown[], id: string): number => embedViewIds(arr, entry.id).indexOf(id)
  const presence = usePillPresence(views)
  const viewsShown = entry.view_band !== false
  const [menuOpen, setMenuOpen] = useState(false)
  const anchoredOpen =
    listOpen ||
    cfgOpen ||
    menuOpen ||
    viewById(renaming) !== undefined ||
    iconFor !== null ||
    colorFor !== null
  const reveal = useHoverReveal({
    dwell: true,
    held: !viewsShown && anchoredOpen,
    engaged: viewsShown,
    linger: { on: STRIP_LOCK_LINGER_MS },
  })
  const peekAnchor = useRef<PeekAnchor>(null)
  const stripOpen = viewsShown || reveal.on
  const hoverProps = {
    onPointerEnter: () => reveal.hover(true),
    onPointerLeave: () => reveal.hover(false),
  }
  const peekHover = viewsShown ? undefined : hoverProps

  // The anchor resolves once per entry into the body, and again only when its first card moves, so crossing cards reads no layout.
  const bodyHover = viewsShown
    ? undefined
    : {
        onPointerOver: (e: React.PointerEvent<HTMLDivElement>) => {
          const a = peekAnchor.current
          const stale =
            !a ||
            (a.kind === 'zone'
              ? !a.el.isConnected
              : !a.first.isConnected || a.first.previousElementSibling !== a.lead)
          if (stale) peekAnchor.current = resolvePeekAnchor(e.currentTarget)
          reveal.hover(inPeekAnchor(peekAnchor.current, e.target))
        },
        onPointerLeave: () => {
          peekAnchor.current = null
          reveal.hover(false)
        },
      }

  const locked = entry.locked ?? false
  const patchEntry = (patch: EntryPatch): void => {
    if (locked && !('locked' in patch) && !('active' in patch)) return
    mutateEntry(entry.id, () => patch)
  }
  const setLocked = (v: boolean): void => patchEntry({ locked: v ? true : null })
  const writeConfig = (id: string, config: SavedView): void => {
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const i = viewAt(arr, id)
      const el = arr[i]
      if (!isPlainObject(el)) return null
      // A view answering to a derived id takes a minted one when first written, so only minted ids reach the file.
      const own = ownsViewId(configIdOf(el), id)
      arr[i] = {
        ...el,
        config: mergeViewEdit(el.config, own ? config : { ...config, id: mintViewId() }),
      }
      return { views: arr }
    })
  }
  const persistConfig = (id: string, config: SavedView): void => {
    if (resolveViewWrite(locked, config).kind === 'config') writeConfig(id, config)
  }
  // Folds onto the STORED view, never the caller's — the live overrides on a locked tile hold gestures the lock already refused.
  const persistState = (id: string, state: ViewState): void => {
    const stored = viewById(id)
    if (stored) writeConfig(id, { ...stored, ...state })
  }
  const scopeApi = useStableApi({
    persistConfig: (next: SavedView) => {
      if (view) persistConfig(view.id, next)
    },
    persistState: (next: ViewState) => {
      if (view) persistState(view.id, next)
    },
    setLocked,
  })
  const scope = useMemo(
    () => (source && view ? { source, view, locked, openPage, ...scopeApi } : null),
    [source, view, locked, openPage, scopeApi],
  )

  if (!embedded || !source || !tree) return inertTile()

  const titleShown = entry.title !== false
  const iconShown = entry.icon !== false
  const titleLevel = entry.title_level ?? 4
  const labeled = (entry.view_button ?? 'labeled') === 'labeled'
  const dropdown = entry.view_style === 'dropdown'

  const addView = (): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      arr.push({
        source_id: source.id,
        config: { ...mintNewView('Untitled', schema), id: mintViewId() },
      })
      return { views: arr, active: arr.length - 1 }
    })
  }
  const duplicate = (id: string): void => {
    const src = viewById(id)
    if (locked || !src) return
    const names = views.map((v) => v.name)
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const i = viewAt(arr, id)
      const el = arr[i]
      if (!isPlainObject(el)) return null
      const stored = isPlainObject(el.config) ? el.config : src
      const config = { ...stored, id: mintViewId(), name: freeName(src.name, names) }
      arr.splice(i + 1, 0, { ...el, config })
      return { views: arr, active: i + 1 }
    })
  }
  const restoreViewAt = (i: number, el: unknown): void => {
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const at = Math.min(i, arr.length)
      arr.splice(at, 0, el)
      return { views: arr, active: at }
    })
  }
  const deleteView = (id: string): void => {
    const name = viewById(id)?.name
    if (locked || name === undefined) return
    let undo: (() => void) | undefined
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const at = viewAt(arr, id)
      if (at < 0 || arr.length <= 1) return null
      const cur = rawActive(raw, arr.length)
      const [removed] = arr.splice(at, 1)
      undo = () => restoreViewAt(at, removed)
      return { views: arr, active: Math.min(cur > at ? cur - 1 : cur, arr.length - 1) }
    })
    if (undo) notifyDeleted(name, undo)
  }
  presence.deleteView.current = deleteView

  const reorderViews = (activeId: string, overId: string): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const seq = reorder(
        embedViewIds(arr, entry.id).map((id, i) => ({ id, i })),
        activeId,
        overId,
      )
      const cur = rawActive(raw, arr.length)
      const newActive = seq.findIndex((x) => x.i === cur)
      return { views: seq.map((x) => arr[x.i]), active: newActive >= 0 ? newActive : 0 }
    })
  }
  const commitTitle = (next: string): void => {
    patchEntry({ display_title: !next || next === source.title ? null : next })
  }

  const toggleViews = (): void => patchEntry({ view_band: viewsShown ? false : null })
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
    if (action === 'toggle-icon') patchEntry({ icon: iconShown ? false : null })
    else if (action === 'change-icon') {
      menuAnchorRef.current = titleIconRef.current
      setIconFor('title')
    } else if (action === 'hide-title') patchEntry({ title: false })
    else if (action === 'toggle-views') toggleViews()
    else if (action?.startsWith('size-')) {
      const n = Number(action.slice(5))
      patchEntry({ title_level: n === 4 ? null : n })
    }
  }
  const areaMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    if (locked) return
    const action = await popHeld(
      embedAreaMenuItems({ viewStyle: dropdown ? 'dropdown' : 'toolbar', titleShown, viewsShown }),
    )
    if (action === 'show-title') patchEntry({ title: null })
    else if (action === 'toggle-views') toggleViews()
    else if (action === 'new-view') addView()
    else if (action === 'style-dropdown') patchEntry({ view_style: 'dropdown' })
    else if (action === 'style-toolbar') patchEntry({ view_style: null })
  }
  const rowMenu = async (id: string, e: React.MouseEvent, animate: boolean): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (locked) return
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await popHeld(
      viewRowMenuItems({
        titlesShown: labeled,
        deletable: entry.views.length > 1,
        duplicable: true,
      }),
    )
    switch (action) {
      case 'rename':
        return setRenaming(id)
      case 'icon':
        return setIconFor({ view: id })
      case 'color':
        return setColorFor(id)
      case 'duplicate':
        return duplicate(id)
      case 'titles':
        return patchEntry({ view_button: labeled ? 'icon' : null })
      case 'delete':
        if (!(await askDeleteView('tile'))) return
        return animate ? presence.beginExit(id) : deleteView(id)
      default:
        return
    }
  }

  const viewLabel = (v: SavedView): React.JSX.Element => (
    <RenamableLabel
      renames="title"
      editing={renaming === v.id}
      value={v.name}
      className={rowInput}
      autoSize
      onCommit={(next) => {
        setRenaming(null)
        persistConfig(v.id, { ...v, name: next })
      }}
      onBegin={() => setRenaming(v.id)}
      onCancel={() => setRenaming(null)}
    />
  )

  const configButton = (
    <button
      ref={btnRef}
      type="button"
      className={cx(settingsBtn, revealTarget, cfgOpen && settingsBtnActive)}
      data-reveal-held={cfgOpen || undefined}
      aria-label="View settings"
      onClick={() => setCfgOpen(true)}
    >
      <Icon name="sliders-horizontal" size="body" />
    </button>
  )

  const stripLock = !locked && (
    <span className={cx(s.stripLock, !reveal.on && titleActionFadeHidden)}>
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
      className={cx(viewPill, viewPillActive, viewPillDrop)}
      style={strokeStyle(view)}
      onClick={() => setListOpen(true)}
    >
      <Icon name={viewGlyph(view)} size={VIEW_PILL_ICON} />
      <span className={cx(labelSlot, !labeled && labelSlotHidden)}>
        <span className={labelText}>{view.name}</span>
      </span>
      <Icon name="chevrons-up-down" size="control" className={viewPillTrail} />
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
            renaming={renaming === v.id}
            label={viewLabel(v)}
            onSwitch={() => patchEntry({ active: i })}
            onMenu={(e) => void rowMenu(v.id, e, true)}
            onAnimEnd={() => presence.onAnimEnd(v.id)}
          />
        ))}
      </SortableZone>
      <span className={s.newView}>{newViewButton}</span>
    </>
  )

  return (
    <ViewTileScopeProvider value={scope}>
      <div className={s.tile} data-reveal-host="" onPointerDownCapture={onActivate}>
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
        <div className={cx(s.stripSpace, !stripOpen && s.stripSpaceHidden)} {...hoverProps}>
          <div className={s.spaceInner}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
            <div className={s.stripRow} data-reveal-host="" onContextMenu={(e) => void areaMenu(e)}>
              {switcher}
              <span className={spacer} />
              {!titleShown && configButton}
              {stripLock}
            </div>
          </div>
        </div>
        <div className={cx(s.body, !stripOpen && s.bodyFlush, 'scroll-fade')} {...bodyHover}>
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
                  onClick={renaming === v.id ? undefined : () => patchEntry({ active: i })}
                  onContextMenu={(e) => void rowMenu(v.id, e, false)}
                >
                  {viewLabel(v)}
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
              : viewById(iconFor?.view)?.icon
          }
          onSelect={(icon) => {
            if (iconFor === 'title') return patchEntry({ display_icon: icon })
            const v = viewById(iconFor?.view)
            if (v) persistConfig(v.id, { ...v, icon })
          }}
        />
        <ColorPicker
          open={colorFor !== null}
          selected={colorNameFor(viewById(colorFor)?.color)}
          onPick={(picked) => {
            const v = viewById(colorFor)
            if (v) persistConfig(v.id, { ...v, color: picked })
            setColorFor(null)
          }}
          onDismiss={() => setColorFor(null)}
          triggerRef={menuAnchorRef}
        />
      </div>
    </ViewTileScopeProvider>
  )
}
