import { useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import {
  type DrillPickItem,
  type PagePickerItem,
  TILE_KINDS,
  type TileEntry,
  type TileStyle,
  type ViewPick,
  type ViewPickerItem,
} from '@pommora/core/Tiles/tiles'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { leadingRow, PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import {
  FooterLockButton,
  MenuFooting,
  MenuItem,
  MenuTopRow,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus'
import {
  footerLockAction,
  footingLabel,
  lockIcon,
  rowDisabled,
  value,
} from '@pommora/uix/Menus/menu-base.css'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Elements/OverScroll'
import { ZOOM_STEPS, zoomStep } from './tileZoom'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import * as s from './handle-menu.css'

export type TileMenuAction =
  | 'tile:open'
  | 'tile:duplicate'
  | 'tile:delete'
  | 'tile:lock'
  | `tile:style:${TileStyle}`
  | `tile:zoom:${number}`
  | `tile:pick:${number}`

/** Rows name an index into `picks` because a menu row can't carry a view pick's three fields. */
export type TilePick = { kind: 'page'; value: string } | { kind: 'view'; value: ViewPick }

/** The pane below as native rows: the same link drills, style and scale sets, from the same inputs. */
export function tileMenuItems({
  entry,
  pageItems,
  viewItems,
  pageInfo,
  containerLocked,
}: {
  entry: TileEntry
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  pageInfo?: { title: string }
  containerLocked: boolean
}): { items: ActionItem<TileMenuAction>[]; picks: TilePick[] } {
  const picks: TilePick[] = []
  const locked = (entry.locked ?? false) || containerLocked
  const drill = <T,>(
    nodes: readonly DrillPickItem<T>[],
    wrap: (value: T) => TilePick,
  ): ActionItem<TileMenuAction>[] =>
    nodes.map((n) => {
      if (n.submenu) {
        const rows = drill(n.submenu, wrap)
        // An empty submenu opens onto blank space instead of saying there is nothing to pick.
        return rows.length > 0
          ? { label: n.label, action: 'tile:open' as const, submenu: rows }
          : { label: n.label, action: 'tile:open' as const, disabled: true }
      }
      if (n.pick === undefined) return { label: n.label, action: 'tile:open', disabled: true }
      picks.push(wrap(n.pick))
      return { label: n.label, action: `tile:pick:${picks.length - 1}` as const }
    })
  const borderless = entry.style === 'borderless'
  const currentFactor = zoomStep(entry.zoom).factor
  const items: ActionItem<TileMenuAction>[] = [
    ...(pageInfo ? [{ label: pageInfo.title, action: 'tile:open' as const, disabled: true }] : []),
    // A row with no source is shown and refused rather than dropped.
    ...TILE_KINDS[entry.type].menuRows.map(({ label, source }): ActionItem<TileMenuAction> => {
      const rows =
        source === 'pages'
          ? drill(pageItems, (value) => ({ kind: 'page', value }))
          : drill(viewItems, (value) => ({ kind: 'view', value }))
      const off = locked || rows.length === 0
      return { label, action: 'tile:open', disabled: off, ...(off ? {} : { submenu: rows }) }
    }),
    {
      label: 'Style',
      action: 'tile:open',
      disabled: locked,
      submenu: [
        { label: 'Bordered', action: 'tile:style:bordered', checked: !borderless },
        { label: 'Borderless', action: 'tile:style:borderless', checked: borderless },
      ],
    },
    {
      label: 'Scale',
      action: 'tile:open',
      disabled: locked,
      submenu: ZOOM_STEPS.map((st) => ({
        label: st.label,
        action: `tile:zoom:${st.factor}` as const,
        checked: st.factor === currentFactor,
      })),
    },
    { label: 'Duplicate', action: 'tile:duplicate', separatorBefore: true, disabled: locked },
    { label: 'Delete', action: 'tile:delete', disabled: locked },
    {
      label: containerLocked ? 'Locked' : lockLabel(locked),
      action: 'tile:lock',
      separatorBefore: true,
      disabled: containerLocked,
    },
  ]
  return { items, picks }
}

const GLYPH = 12
const LOC_GLYPH = 11
const CHEVRON = <Icon name="chevron-right" size={GLYPH} />

function DrillLevel({
  nodes,
  title,
  backLabel,
  onBack,
  resolve,
}: {
  nodes: Array<DrillPickItem<unknown>>
  title: string
  backLabel: string
  onBack: () => void
  resolve: (pick: unknown) => void
}): React.JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const bodyNodes = nodes.filter((n) => !n.footer)
  const footerNodes = nodes.filter((n) => n.footer)
  const child = openIdx != null ? bodyNodes[openIdx] : null
  const rows = (
    <div className={s.pane}>
      <MenuScrollFrame
        maxHeight={PICKER_MAX_HEIGHT}
        header={<MenuTopRow label={backLabel} current={title} onBack={onBack} />}
        footer={
          footerNodes.length ? (
            <MenuFooting
              leading={footerNodes.map((n, i) => (
                <Button
                  key={`${n.label}-${String(i)}`}
                  size="button-inline"
                  className={footingLabel}
                  onClick={n.pick === undefined ? undefined : () => resolve(n.pick)}
                >
                  {n.label}
                </Button>
              ))}
            />
          ) : undefined
        }
      >
        {bodyNodes.map((n, i) => {
          const off = n.submenu ? n.submenu.length === 0 : n.pick === undefined
          return (
            <MenuItem
              key={`${n.label}-${String(i)}`}
              className={off ? rowDisabled : undefined}
              leading={n.icon ? <Icon name={n.icon} size={GLYPH} /> : undefined}
              trailing={n.submenu && !off ? CHEVRON : undefined}
              onClick={off ? undefined : n.submenu ? () => setOpenIdx(i) : () => resolve(n.pick)}
            >
              {n.label}
            </MenuItem>
          )
        })}
      </MenuScrollFrame>
    </div>
  )
  return (
    <FrameSlide
      open={openIdx != null}
      root={rows}
      detail={
        child?.submenu ? (
          <DrillLevel
            nodes={child.submenu}
            title={child.label}
            backLabel={title}
            onBack={() => setOpenIdx(null)}
            resolve={resolve}
          />
        ) : null
      }
    />
  )
}

export function TileHandleMenu({
  open,
  entry,
  anchor,
  pageItems,
  viewItems,
  pageInfo,
  location,
  onClose,
  onPickPage,
  onPickView,
  onStyle,
  onDuplicate,
  onRemove,
  onToggleLock,
  onOpenPage,
  onSetZoom,
  containerLocked,
}: {
  open: boolean
  entry: TileEntry
  anchor: HTMLElement
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  pageInfo?: { title: string; icon: string }
  location?: { title: string; icon: string }
  onClose: () => void
  onPickPage: (pageId: string) => void
  onPickView: (pick: ViewPick) => void
  onStyle: (style: TileStyle) => void
  onDuplicate: () => void
  onRemove: () => void
  onToggleLock: () => void
  onOpenPage: () => void
  onSetZoom: (factor: number) => void
  containerLocked: boolean
}): React.JSX.Element {
  const [pane, setPane] = useState<'root' | 'style' | 'pages' | 'views'>('root')
  const [scaleOpen, setScaleOpen] = useState(false)
  // The menu stays mounted through its retract (it holds what it draws), so each open starts at the root.
  useEffect(() => {
    if (open) {
      setPane('root')
      setScaleOpen(false)
    }
  }, [open])
  const scaleTriggerRef = useRef<HTMLButtonElement>(null)
  const currentStep = zoomStep(entry.zoom)
  const locked = (entry.locked ?? false) || containerLocked
  const act = (fn: () => void) => () => {
    onClose()
    fn()
  }
  const rows = TILE_KINDS[entry.type].menuRows

  const root = (
    <div className={s.pane}>
      <MenuScrollFrame
        footer={
          <MenuFooting
            leading={
              containerLocked ? (
                <span className={`${footerLockAction} ${rowDisabled}`} title="Locked by the board">
                  <Icon name="locked" size={GLYPH} className={lockIcon} />
                  Locked
                </span>
              ) : (
                <FooterLockButton
                  verb={lockLabel(locked)}
                  noun="tile"
                  locked={locked}
                  onToggle={onToggleLock}
                />
              )
            }
          />
        }
      >
        {pageInfo && (
          <button type="button" className={s.titleField} onClick={act(onOpenPage)}>
            <span className={leadingRow}>
              <Icon name={pageInfo.icon} size={GLYPH} className={s.titleFieldIcon} />
              <span className={cx(s.titleFieldText, overScrollEllipsis)}>{pageInfo.title}</span>
            </span>
            {location && (
              <span className={leadingRow}>
                <Icon name={location.icon} size={LOC_GLYPH} className={s.titleFieldLocIcon} />
                <span className={cx(s.titleFieldLoc, overScrollEllipsis)}>{location.title}</span>
              </span>
            )}
          </button>
        )}
        {rows.map(({ label, source }) => {
          const items = source === 'pages' ? pageItems : viewItems
          const off = locked || items.length === 0
          return (
            <MenuItem
              key={label}
              disabled={off}
              leading={<Icon name="link" size={GLYPH} />}
              trailing={CHEVRON}
              onClick={() => setPane(source)}
            >
              {label}
            </MenuItem>
          )
        })}
        <MenuItem
          disabled={locked}
          leading={<Icon name="palette" size={GLYPH} />}
          trailing={CHEVRON}
          onClick={() => setPane('style')}
        >
          Style
        </MenuItem>
        <MenuItem
          disabled={locked}
          leading={<Icon name="scaling" size={GLYPH} />}
          trailing={
            <button
              type="button"
              ref={scaleTriggerRef}
              className={s.scaleTrailing}
              onClick={locked ? undefined : () => setScaleOpen((o) => !o)}
            >
              <span className={value}>{currentStep.inline}</span>
              <Icon name="chevrons-up-down" size={GLYPH} />
            </button>
          }
        >
          Scale
        </MenuItem>
        <MenuSeparator flush />
        <MenuItem
          disabled={locked}
          leading={<Icon name="copy" size={GLYPH} />}
          onClick={act(onDuplicate)}
        >
          Duplicate
        </MenuItem>
        <MenuItem
          disabled={locked}
          leading={<Icon name="x" size={GLYPH} />}
          onClick={act(onRemove)}
        >
          Delete
        </MenuItem>
      </MenuScrollFrame>
    </div>
  )

  const detail =
    pane === 'style' ? (
      <div className={s.pane}>
        <MenuTopRow label="Menu" current="Style" onBack={() => setPane('root')} />
        {(['bordered', 'borderless'] as const).map((v) => (
          <PickerRow
            key={v}
            ring
            align="start"
            selected={(entry.style ?? 'bordered') === v}
            onClick={act(() => onStyle(v))}
          >
            {v === 'bordered' ? 'Bordered' : 'Borderless'}
          </PickerRow>
        ))}
      </div>
    ) : pane === 'pages' || pane === 'views' ? (
      <DrillLevel
        nodes={pane === 'pages' ? pageItems : viewItems}
        title={rows.find((r) => r.source === pane)?.label ?? ''}
        backLabel="Menu"
        onBack={() => setPane('root')}
        resolve={(v) => {
          onClose()
          if (pane === 'pages') onPickPage(v as string)
          else onPickView(v as ViewPick)
        }}
      />
    ) : null

  return (
    <>
      <PickerMenu open={open} onDismiss={onClose} triggerRef={{ current: anchor }} origin="center">
        <FrameSlide open={pane !== 'root'} root={root} detail={detail} />
      </PickerMenu>
      <PickerMenu
        open={open && scaleOpen}
        onDismiss={() => setScaleOpen(false)}
        triggerRef={scaleTriggerRef}
        solid
      >
        <div className={s.scaleMenu}>
          {ZOOM_STEPS.map((st) => (
            <PickerRow
              key={st.label}
              ring
              align="start"
              selected={currentStep.factor === st.factor}
              onClick={() => onSetZoom(st.factor)}
            >
              {st.label}
            </PickerRow>
          ))}
        </div>
      </PickerMenu>
    </>
  )
}
