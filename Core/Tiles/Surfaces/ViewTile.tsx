import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConnPage } from '../../Connections/pageIndex'
import type { EntryOp, EntryPatch, ViewTileEntry } from '../tiles'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { canDeleteView, type SavedView, type ViewPatch } from '../../Views/views'
import {
  addView,
  deleteView,
  duplicateView,
  embeddedViews,
  moveView,
  writeView,
} from '../viewTileEntry'
import { Icon, LockGlyph } from '@pommora/uix/Symbols'
import { cellRing, colorNameFor } from '@pommora/uix/Theme/ramp'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { FootingCreate, MenuFooting, MenuScrollFrame } from '@pommora/uix/Menus/MenuRows'
import { titleInput as rowInput, rowDisabled, spacer } from '@pommora/uix/Menus/menu-row.css'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { REVEAL_DWELL_MS, useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { useChoiceOpen, useIconChoice } from '../../Assets/IdentityChoice'
import { entityIcon } from '../../Assets/entityIconPolicy'
import { askDeleteView } from '../../Interface/Confirm/confirmations'
import { notifyDeleted } from '../../Interface/Notifications/notifications'
import { findCollection, findSet } from '../../Nexus/treeIndex'
import { viewGlyph } from '../../Views/viewIcon'
import { ViewHost } from '../../Views/Host/ViewHost'
import { SettingsFrame } from '../../Views/Settings/SettingsFrame'
import { ViewListRow } from '../../Views/Settings/ViewFrame'
import type { NameRename } from '../../Interface/RenamableTitle'
import { hostedGutter } from '@pommora/uix/Menus/menu-surface.css'
import { ViewTileScopeProvider } from '../../Views/ViewTileScope'
import { inertTile, type MutateEntry } from '../tileKinds'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { cx } from '@pommora/uix/Utilities/cx'
import { labelSlot, labelSlotHidden, labelText } from '@pommora/uix/Buttons/button-base.css'
import { titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { useSettleFallback } from '@pommora/uix/Animations/useExitPresence'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
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
import { shownLabel } from '../../Actions/toggleLabels'
import { embedAreaMenuItems, embedTitleMenuItems, runViewRowAction } from '../../Actions/viewMenus'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'

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
  onMenu: (e: React.MouseEvent<HTMLElement>) => void
  onAnimEnd?: () => void
}): React.JSX.Element {
  const open = renaming ? undefined : onSwitch
  const { setNodeRef, style, handle } = useDragItem(view.id, { open })
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
  const defaultIcons = useSession((st) => personalizationOf(st).defaultIcons)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)
  const menuAnchorRef = useRef<Element | null>(null)
  const rowChoiceOpen = useChoiceOpen(menuAnchorRef)
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
  const titleIcon = useIconChoice<SVGSVGElement>(entry.display_icon ?? source?.icon, (icon) =>
    patchEntry({ display_icon: icon }),
  )

  const views = useMemo(
    () => (source ? embeddedViews(entry.views, entry.id) : []),
    [source, entry.views, entry.id],
  )
  const view = views[index]
  const viewById = (id: string | null | undefined): SavedView | undefined =>
    views.find((v) => v.id === id)
  const entering = useEntrance(views, (v) => v.id)
  const viewsShown = entry.view_band !== false
  const [menuOpen, setMenuOpen] = useState(false)
  const anchoredOpen =
    listOpen ||
    cfgOpen ||
    menuOpen ||
    viewById(renaming) !== undefined ||
    rowChoiceOpen ||
    titleIcon.iconOpen
  const reveal = useHoverReveal({
    dwellMs: REVEAL_DWELL_MS,
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
  const editViews = (op: EntryOp): void => {
    if (!locked) mutateEntry(entry.id, op)
  }
  const saveView = (id: string, patch: ViewPatch): void => editViews(writeView(entry.id, id, patch))
  const removeView = (v: SavedView): void => {
    let undo: EntryOp | undefined
    editViews(
      deleteView(entry.id, v.id, (restore) => {
        undo = restore
      }),
    )
    const restore = undo
    if (restore) notifyDeleted(v.name, () => mutateEntry(entry.id, restore))
  }
  const [exiting, setExiting] = useState<SavedView | null>(null)
  const exited = useSettleFallback(exiting !== null, 'menu', () => {
    if (exiting) removeView(exiting)
    setExiting(null)
  })
  const scopeApi = useStableApi({
    persist: (patch: ViewPatch) => {
      if (view) mutateEntry(entry.id, writeView(entry.id, view.id, patch))
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
    else if (action === 'change-icon') titleIcon.onIconClick()
    else if (action === 'hide-title') patchEntry({ title: false })
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
    else if (action === 'new-view') editViews(addView(source.id))
    else if (action === 'style-dropdown') patchEntry({ view_style: 'dropdown' })
    else if (action === 'style-toolbar') patchEntry({ view_style: null })
  }
  const renameOf = (v: SavedView): Omit<NameRename, 'path'> => ({
    editing: renaming === v.id,
    onBegin: locked ? undefined : () => setRenaming(v.id),
    onEnd: () => setRenaming(null),
  })
  const rowMenu = (v: SavedView, e: React.MouseEvent<HTMLElement>, animate: boolean): void => {
    e.preventDefault()
    e.stopPropagation()
    if (locked) return
    menuAnchorRef.current = e.currentTarget
    const ctx = { deletable: canDeleteView(views.length), duplicable: true }
    const run = {
      rename: () => setRenaming(v.id),
      save: (patch: ViewPatch) => saveView(v.id, patch),
      duplicate: () => editViews(duplicateView(entry.id, v.id)),
      titles: {
        shown: labeled,
        toggle: () => patchEntry({ view_button: labeled ? 'icon' : null }),
      },
      remove: () =>
        void askDeleteView('tile').then((yes) => {
          if (!yes) return
          if (animate) setExiting(v)
          else removeView(v)
        }),
    }
    void runViewRowAction(ctx, v, e.currentTarget, run, popHeld)
  }

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
        aria-label={shownLabel(viewsShown, 'Views')}
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
    <FootingCreate
      ariaLabel="New View"
      disabled={locked}
      className={locked ? rowDisabled : undefined}
      onClick={() => editViews(addView(source.id))}
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
        label={(id) => viewById(id)?.name ?? ''}
        onMove={(id, beforeId) => editViews(moveView(entry.id, id, beforeId))}
      >
        {views.map((v, i) => {
          const { onEnd, ...rename } = renameOf(v)
          return (
            <ViewPill
              key={v.id}
              view={v}
              active={i === index}
              entering={entering(v.id)}
              exiting={exiting?.id === v.id}
              labeled={labeled}
              renaming={rename.editing}
              label={
                <RenamableLabel
                  renames="title"
                  {...rename}
                  value={v.name}
                  className={rowInput}
                  autoSize
                  onCommit={(next) => {
                    onEnd()
                    saveView(v.id, { name: next })
                  }}
                  onCancel={onEnd}
                />
              }
              onSwitch={() => patchEntry({ active: i })}
              onMenu={(e) => rowMenu(v, e, true)}
              onAnimEnd={exiting?.id === v.id ? exited : undefined}
            />
          )
        })}
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
                  ref={titleIcon.iconRef}
                  name={entityIcon(source.kind, entry.display_icon ?? source.icon, defaultIcons)}
                  className={cx(
                    s.titleIcon,
                    `md-h${titleLevel}`,
                    'title-icon-reveal',
                    !iconShown && !titleIcon.iconOpen && 'is-hidden',
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
        <Scrollbar />
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
                <ViewListRow
                  key={v.id}
                  view={v}
                  picked={i === index}
                  rename={renameOf(v)}
                  onCommit={(name) => saveView(v.id, { name })}
                  onSwitch={() => patchEntry({ active: i })}
                  onMenu={(e) => rowMenu(v, e, false)}
                />
              ))}
            </MenuScrollFrame>
          </div>
        </PickerMenu>
      </div>
    </ViewTileScopeProvider>
  )
}
