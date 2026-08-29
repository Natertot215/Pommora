import { useEffect, useRef, useState } from 'react'
import type { ViewBlockEntry } from '@shared/blocks'
import type { CollectionNode, SetNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import {
  DEFAULT_VIEW_ID,
  mintDefaultView,
  mintNewView,
  type SavedView,
  type ViewState,
} from '@shared/views'
import { Icon, iconNameOr } from '@renderer/DesignSystem/Symbols'
import { cellColor } from '@renderer/DesignSystem/Tokens/ramp'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'
import { ColorPicker } from '@renderer/DesignSystem/Pickers/ColorPicker/ColorPicker'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import {
  AccessoryButton,
  Menu,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
} from '@renderer/DesignSystem/Menus'
import { titleInput as rowInput, rowDisabled } from '@renderer/DesignSystem/Menus/menu-base.css'
import { reorder, SortableZone, useDragItem } from '@renderer/DesignSystem/Interactions/drag'
import { optionRing } from '@renderer/DesignSystem/Pickers/picker-base.css'
import { RenamableLabel } from '@renderer/DesignSystem/Fields'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { findCollection, findCollectionForSet, findSet } from '@renderer/Interface/Scope'
import { ViewRenderer } from '@renderer/Views/ViewRenderer'
import { SettingsFrame } from '@renderer/Frames/SettingsFrame'
import { hostedGutter } from '@renderer/DesignSystem/Menus/menu-surface.css'
import { resolveViewWrite, ViewTileScopeProvider } from '@renderer/SurfacePM/ViewTileScope'
import { useSession } from '@renderer/store'
import { PICKER_MAX_HEIGHT } from '@renderer/DesignSystem/Pickers/picker-base.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import {
  labelSlot,
  labelSlotHidden,
  labelText,
} from '@renderer/DesignSystem/Buttons/button-base.css'
import {
  SEGMENT_ICON,
  segment,
  segmentActive,
  segmentEntering,
  segmentExiting,
  segmentTrail,
  settingsBtn,
  settingsBtnActive,
} from '@renderer/Interface/ActionBand.css'
import * as s from './viewTile.css'

function coerceConfig(raw: unknown, schema: PropertyDefinition[], fallbackId: string): SavedView {
  const v = raw as SavedView | null
  const shapeOk =
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.type === 'string' &&
    (['property_order', 'hidden_properties', 'sort'] as const).every(
      (k) => v[k] === undefined || Array.isArray(v[k]),
    )
  if (!shapeOk) return { ...mintDefaultView(schema), id: fallbackId }
  return v.id === DEFAULT_VIEW_ID ? { ...v, id: fallbackId } : v
}

const rawViews = (raw: Record<string, unknown>): unknown[] =>
  Array.isArray(raw.views) ? [...(raw.views as unknown[])] : []

const viewIcon = (v: SavedView): string => iconNameOr(v.icon, 'table')

const strokeStyle = (v: SavedView): React.CSSProperties | undefined => {
  const key = labelColorFor(v.color)
  if (key === 'default') return undefined
  const stroke = tintAt(cellColor(key), 'primary')
  return { '--segment-stroke': stroke } as React.CSSProperties
}

function EmbedTitle({
  title,
  level,
  editable,
  onCommit,
}: {
  title: string
  level: number
  editable: boolean
  onCommit: (next: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const reverting = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!editing || !el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editing])

  const commit = (): void => {
    setEditing(false)
    const next = (ref.current?.textContent ?? '').trim()
    if (next !== title) onCommit(next)
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a rich block surface, not a form control
    <span
      ref={ref}
      className={`${s.titleText} md-h${level}`}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={editing ? 0 : undefined}
      onClick={editing || !editable ? undefined : () => setEditing(true)}
      onKeyDown={
        editing
          ? (e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                reverting.current = true
                if (ref.current) ref.current.textContent = title
                setEditing(false)
              }
            }
          : undefined
      }
      onBlur={
        editing
          ? () => {
              if (reverting.current) {
                reverting.current = false
                return
              }
              commit()
            }
          : undefined
      }
    >
      {title}
    </span>
  )
}

function ViewPill({
  id,
  view,
  active,
  entering,
  exiting,
  labeled,
  renameNode,
  onSwitch,
  onMenu,
  onAnimEnd,
}: {
  id: string
  view: SavedView
  active: boolean
  entering: boolean
  exiting: boolean
  labeled: boolean
  renameNode: React.ReactNode | null
  onSwitch: () => void
  onMenu: (e: React.MouseEvent) => void
  onAnimEnd: () => void
}): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem(id)
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
      onClick={renameNode ? undefined : onSwitch}
      onContextMenu={onMenu}
      onAnimationEnd={onAnimEnd}
    >
      <Icon name={viewIcon(view)} size={SEGMENT_ICON} />
      <span className={cx(labelSlot, !renameNode && !labeled && labelSlotHidden)}>
        <span className={labelText}>{renameNode ?? view.name}</span>
      </span>
    </button>
  )
}

export function ViewTile({
  entry,
  mutateEntry,
  onActivate,
}: {
  entry: ViewBlockEntry
  mutateEntry: (
    entryId: string,
    fn: (raw: Record<string, unknown>) => Record<string, unknown>,
  ) => void
  onActivate?: () => void
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const [cfgOpen, setCfgOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [iconFor, setIconFor] = useState<number | null>(null)
  const [colorFor, setColorFor] = useState<number | null>(null)
  const menuAnchorRef = useRef<Element | null>(null)
  const titleIconRef = useRef<SVGSVGElement>(null)
  const [exitingId, setExitingId] = useState<string | null>(null)
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set())
  const prevIdsRef = useRef<Set<string> | null>(null)
  const viewsRef = useRef<SavedView[]>([])
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

  const schemaCollection =
    source && source.kind !== 'collection' ? findCollectionForSet(tree, source.id) : source
  const schema = (schemaCollection as CollectionNode | undefined)?.properties ?? []
  const views = source
    ? entry.views.map((v, i) => coerceConfig(v.config, schema, `embed:${entry.id}:${i}`))
    : []
  viewsRef.current = views
  const idKey = views.map((v) => v.id).join(',')

  useEffect(() => {
    const prev = prevIdsRef.current
    const cur = new Set(viewsRef.current.map((v) => v.id))
    if (prev) {
      const added = [...cur].filter((id) => !prev.has(id))
      if (added.length) setEnteringIds((s0) => new Set([...s0, ...added]))
    }
    prevIdsRef.current = cur
  }, [idKey])

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
      const next = { ...raw }
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k]
        else next[k] = v
      }
      return next
    })
  }
  const setLocked = (v: boolean): void => patchEntry({ locked: v ? true : undefined })
  const toggleTitles = (): void => patchEntry({ view_button: labeled ? 'icon' : undefined })
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
  // Folds onto the STORED view, never the caller's — the live overrides on a locked tile hold
  // gestures the lock already refused, and folding those in would smuggle them past it.
  const persistState = (i: number, state: ViewState): void => {
    const stored = views[i]
    if (stored) writeConfig(i, { ...stored, ...state })
  }
  const addView = (): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const used = new Set(
        arr.map((el) => ((el as { config?: { id?: unknown } })?.config?.id as string) ?? ''),
      )
      let slot = arr.length
      while (used.has(`embed:${entry.id}:${slot}`)) slot++
      arr.push({
        source_id: source.id,
        config: { ...mintNewView('Untitled', schema), id: `embed:${entry.id}:${slot}` },
      })
      return { ...raw, views: arr, active: arr.length - 1 }
    })
  }
  const deleteViewAt = (i: number): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      if (arr.length <= 1) return raw
      arr.splice(i, 1)
      const cur = typeof raw.active === 'number' ? raw.active : 0
      return { ...raw, views: arr, active: Math.min(cur > i ? cur - 1 : cur, arr.length - 1) }
    })
  }
  const beginDeleteView = (i: number): void => {
    if (locked || entry.views.length <= 1) return
    setExitingId(views[i].id)
  }
  const finishExit = (id: string): void => {
    const i = viewsRef.current.findIndex((v) => v.id === id)
    if (i >= 0) deleteViewAt(i)
    setExitingId(null)
  }
  const reorderViews = (activeId: string, overId: string): void => {
    if (locked) return
    mutateEntry(entry.id, (raw) => {
      const arr = rawViews(raw)
      const seq = reorder(
        viewsRef.current.map((v, i) => ({ id: v.id, i })),
        activeId,
        overId,
      )
      const next = seq.map((x) => arr[x.i]).filter((x) => x != null)
      const newActive = seq.findIndex((x) => x.i === index)
      return { ...raw, views: next, active: newActive >= 0 ? newActive : 0 }
    })
  }
  const commitTitle = (next: string): void => {
    const t = next.trim()
    patchEntry({ display_title: !t || t === source.title ? undefined : t })
  }

  const titleMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    if (locked) return
    const action = await window.nexus.viewEmbedTitleMenu({ iconShown, level: titleLevel })
    if (action === 'toggle-icon') patchEntry({ icon: iconShown ? false : undefined })
    else if (action === 'change-icon') {
      menuAnchorRef.current = titleIconRef.current
      setIconFor(index)
    } else if (action === 'hide-title') patchEntry({ title: false })
    else if (action?.startsWith('size-')) {
      const n = Number(action.slice(5))
      patchEntry({ title_level: n === 4 ? undefined : n })
    }
  }
  const areaMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    if (locked) return
    const action = await window.nexus.viewEmbedAreaMenu({
      viewStyle: dropdown ? 'dropdown' : 'toolbar',
      titleShown,
    })
    if (action === 'show-title') patchEntry({ title: undefined })
    else if (action === 'new-view') addView()
    else if (action === 'style-dropdown') patchEntry({ view_style: 'dropdown' })
    else if (action === 'style-toolbar') patchEntry({ view_style: undefined })
  }
  const rowMenu = async (i: number, e: React.MouseEvent, animate: boolean): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (locked) return
    menuAnchorRef.current = e.currentTarget as HTMLElement
    const action = await window.nexus.viewRowMenu({
      titlesShown: labeled,
      deletable: entry.views.length > 1,
    })
    switch (action) {
      case 'rename':
        return setRenaming(i)
      case 'icon':
        return setIconFor(i)
      case 'color':
        return setColorFor(i)
      case 'titles':
        return toggleTitles()
      case 'delete':
        return (animate ? beginDeleteView : deleteViewAt)(i)
      default:
        return
    }
  }
  const pillAnimEnd = (id: string): void => {
    if (exitingId === id) finishExit(id)
    else if (enteringIds.has(id))
      setEnteringIds((s0) => (s0.has(id) ? new Set([...s0].filter((x) => x !== id)) : s0))
  }

  const renameField = (i: number): React.JSX.Element => (
    <RenamableLabel
      renames="title"
      editing
      value={views[i].name}
      className={rowInput}
      autoSize
      onCommit={(next) => {
        setRenaming(null)
        persistConfig(i, { ...views[i], name: next })
      }}
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
      className={segment}
      style={strokeStyle(view)}
      onClick={() => setListOpen(true)}
    >
      <Icon name={viewIcon(view)} size={SEGMENT_ICON} />
      <span className={cx(labelSlot, !labeled && labelSlotHidden)}>
        <span className={labelText}>{view.name}</span>
      </span>
      <Icon name="chevron-down" size="footnote" className={segmentTrail} />
    </button>
  ) : (
    <>
      <SortableZone
        items={views.map((v) => v.id)}
        layout="list"
        axis="x"
        disabled={locked}
        onReorder={reorderViews}
      >
        {views.map((v, i) => (
          <ViewPill
            key={v.id}
            id={v.id}
            view={v}
            active={i === index}
            entering={enteringIds.has(v.id)}
            exiting={exitingId === v.id}
            labeled={labeled}
            renameNode={renaming === i ? renameField(i) : null}
            onSwitch={() => patchEntry({ active: i })}
            onMenu={(e) => void rowMenu(i, e, true)}
            onAnimEnd={() => pillAnimEnd(v.id)}
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
      }}
    >
      <div className={s.tile} onPointerDownCapture={onActivate}>
        <div className={cx(s.titleSpace, !titleShown && s.titleSpaceHidden)}>
          <div className={s.titleSpaceInner}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
            <div className={s.titleRow} onContextMenu={(e) => void titleMenu(e)}>
              <span className={cx(s.titleSlide, !titleShown && s.titleSlideHidden)}>
                <Icon
                  ref={titleIconRef}
                  name={viewIcon(view)}
                  className={cx(
                    `md-h${titleLevel}`,
                    'title-icon-reveal',
                    !iconShown && 'is-hidden',
                  )}
                />
                <EmbedTitle
                  title={entry.display_title ?? source.title}
                  level={titleLevel}
                  editable={!locked}
                  onCommit={commitTitle}
                />
              </span>
              {titleShown && configButton}
            </div>
          </div>
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div className={s.switcherRow} onContextMenu={(e) => void areaMenu(e)}>
          {switcher}
          {!titleShown && (
            <>
              <span className={s.spacer} />
              {configButton}
            </>
          )}
        </div>
        <div className={`${s.body} over-scroll`}>
          <div
            key={index}
            className={s.slideWrap}
            style={{ '--slide-from': slideFrom } as React.CSSProperties}
          >
            <ViewRenderer key={source.id} source={source} />
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
        <PickerMenu open={listOpen} onDismiss={() => setListOpen(false)} triggerRef={dropRef}>
          <div className={s.listPane}>
            <MenuScrollFrame
              maxHeight={PICKER_MAX_HEIGHT}
              footer={<MenuFooting leading={newViewButton} />}
            >
              <Menu>
                {views.map((v, i) => (
                  <MenuItem
                    key={v.id}
                    className={i === index ? optionRing : undefined}
                    leading={<Icon name={viewIcon(v)} size="headline" />}
                    onClick={renaming === i ? undefined : () => patchEntry({ active: i })}
                    onContextMenu={(e) => void rowMenu(i, e, false)}
                  >
                    {renaming === i ? renameField(i) : v.name}
                  </MenuItem>
                ))}
              </Menu>
            </MenuScrollFrame>
          </div>
        </PickerMenu>
        <IconPicker
          open={iconFor !== null}
          onClose={() => setIconFor(null)}
          triggerRef={menuAnchorRef}
          value={iconFor !== null ? views[iconFor]?.icon : undefined}
          onSelect={(icon) => {
            if (iconFor !== null) persistConfig(iconFor, { ...views[iconFor], icon })
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
