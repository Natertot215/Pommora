import { useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { lockLabel } from '@shared/toggleLabels'
import type {
  BlockEntry,
  BlockStyle,
  DrillPickItem,
  PagePickerItem,
  ViewPick,
  ViewPickerItem,
} from '@shared/blocks'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu, PickerRow } from '@renderer/DesignSystem/Pickers/picker-base'
import { leadingRow, PICKER_MAX_HEIGHT } from '@renderer/DesignSystem/Pickers/picker-base.css'
import {
  FooterLockButton,
  MenuFooting,
  MenuItem,
  MenuTopRow,
  MenuScrollFrame,
  MenuSeparator,
} from '@renderer/DesignSystem/Menus'
import {
  footerLockAction,
  footingLabel,
  lockIcon,
  rowDisabled,
  value,
} from '@renderer/DesignSystem/Menus/menu-base.css'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { ZOOM_STEPS, zoomStep } from './tileZoom'
import * as s from './handle-menu.css'

const GLYPH = 12
const LOC_GLYPH = 11

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
  const chevron = <Icon name="chevron-right" size={GLYPH} />
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
        {bodyNodes.map((n, i) =>
          n.submenu ? (
            <MenuItem
              key={`${n.label}-${String(i)}`}
              className={n.submenu.length === 0 ? rowDisabled : undefined}
              leading={n.icon ? <Icon name={n.icon} size={GLYPH} /> : undefined}
              trailing={chevron}
              onClick={() => setOpenIdx(i)}
            >
              {n.label}
            </MenuItem>
          ) : (
            <MenuItem
              key={`${n.label}-${String(i)}`}
              className={n.pick === undefined ? rowDisabled : undefined}
              leading={n.icon ? <Icon name={n.icon} size={GLYPH} /> : undefined}
              onClick={n.pick === undefined ? undefined : () => resolve(n.pick)}
            >
              {n.label}
            </MenuItem>
          ),
        )}
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
  zoom,
  onSetZoom,
  containerLocked = false,
}: {
  open: boolean
  entry: BlockEntry
  anchor: HTMLElement
  pageItems: PagePickerItem[]
  viewItems: ViewPickerItem[]
  pageInfo?: { title: string; icon: string }
  location?: { title: string; icon: string }
  onClose: () => void
  onPickPage: (pageId: string) => void
  onPickView: (pick: ViewPick) => void
  onStyle: (style: BlockStyle) => void
  onDuplicate: () => void
  onRemove: () => void
  onToggleLock: () => void
  onOpenPage: () => void
  zoom?: number
  onSetZoom?: (factor: number) => void
  containerLocked?: boolean
}): React.JSX.Element {
  const [pane, setPane] = useState<'root' | 'style' | 'page' | 'view'>('root')
  const [scaleOpen, setScaleOpen] = useState(false)
  const scaleTriggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!scaleOpen) return
    const onDown = (e: PointerEvent): void => {
      const t = e.target as HTMLElement | null
      if (scaleTriggerRef.current?.contains(t) || t?.closest?.('[data-scale-menu]')) return
      setScaleOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // close the scale menu first, not the whole menu
      setScaleOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [scaleOpen])
  const style: BlockStyle = entry.style === 'borderless' ? 'borderless' : 'bordered'
  const currentStep = zoomStep(zoom)
  const locked = (entry.locked ?? false) || containerLocked
  const rowMute = locked ? rowDisabled : undefined
  const act = (fn: () => void) => () => {
    onClose()
    fn()
  }
  const chevron = <Icon name="chevron-right" size={GLYPH} />

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
        {entry.type === 'page' && pageInfo && (
          <button
            type="button"
            className={s.titleField}
            onClick={() => {
              onClose()
              onOpenPage()
            }}
          >
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
        {entry.type === 'markdown' ? (
          <>
            <MenuItem
              className={rowMute}
              leading={<Icon name="link" size={GLYPH} />}
              trailing={chevron}
              onClick={locked ? undefined : () => setPane('view')}
            >
              Link View
            </MenuItem>
            <MenuItem
              className={rowMute}
              leading={<Icon name="link" size={GLYPH} />}
              trailing={chevron}
              onClick={locked ? undefined : () => setPane('page')}
            >
              Link Page
            </MenuItem>
          </>
        ) : (
          <MenuItem
            className={cx(entry.type === 'view' && rowDisabled, rowMute)}
            leading={<Icon name="link" size={GLYPH} />}
            trailing={chevron}
            onClick={!locked && entry.type === 'page' ? () => setPane('page') : undefined}
          >
            Source
          </MenuItem>
        )}
        <MenuItem
          className={rowMute}
          leading={<Icon name="palette" size={GLYPH} />}
          trailing={chevron}
          onClick={locked ? undefined : () => setPane('style')}
        >
          Style
        </MenuItem>
        <MenuItem
          className={rowMute}
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
          className={rowMute}
          leading={<Icon name="copy" size={GLYPH} />}
          onClick={locked ? undefined : act(onDuplicate)}
        >
          Duplicate
        </MenuItem>
        <MenuItem
          className={rowMute}
          leading={<Icon name="x" size={GLYPH} />}
          onClick={locked ? undefined : act(onRemove)}
        >
          Delete
        </MenuItem>
      </MenuScrollFrame>
    </div>
  )

  const stylePane = (
    <div className={s.pane}>
      <MenuTopRow label="Menu" current="Style" onBack={() => setPane('root')} />
      {(['bordered', 'borderless'] as const).map((v) => (
        <PickerRow
          key={v}
          ring
          align="start"
          selected={style === v}
          onClick={act(() => onStyle(v))}
        >
          {v === 'bordered' ? 'Bordered' : 'Borderless'}
        </PickerRow>
      ))}
    </div>
  )

  const drillRootLabel =
    pane === 'page' ? (entry.type === 'markdown' ? 'Link Page' : 'Source') : 'Link View'
  const detail =
    pane === 'style' ? (
      stylePane
    ) : pane === 'page' || pane === 'view' ? (
      <DrillLevel
        nodes={pane === 'page' ? pageItems : viewItems}
        title={drillRootLabel}
        backLabel="Menu"
        onBack={() => setPane('root')}
        resolve={(v) => {
          onClose()
          if (pane === 'page') onPickPage(v as string)
          else onPickView(v as ViewPick)
        }}
      />
    ) : null

  return (
    <>
      <PickerMenu open={open} onDismiss={onClose} triggerRef={{ current: anchor }} origin="center">
        <FrameSlide open={pane !== 'root'} root={root} detail={detail} />
      </PickerMenu>
      <PickerMenu open={open && scaleOpen} triggerRef={scaleTriggerRef} solid>
        <div className={s.scaleMenu} data-scale-menu>
          {ZOOM_STEPS.map((st) => (
            <PickerRow
              key={st.label}
              ring
              align="start"
              selected={currentStep.factor === st.factor}
              onClick={() => onSetZoom?.(st.factor)}
            >
              {st.label}
            </PickerRow>
          ))}
        </div>
      </PickerMenu>
    </>
  )
}
