import { useEffect, useRef, useState } from 'react'
import type {
  BlockEntry,
  BlockStyle,
  DrillPickItem,
  PagePickerItem,
  ViewPick,
  ViewPickerItem,
} from '@shared/blocks'
import { Icon } from '@renderer/design-system/symbols'
import { PickerMenu, PickerOption } from '@renderer/design-system/components/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@renderer/design-system/components/PickerMenu/pickerMenu.css'
import {
  MenuBottomRow,
  MenuItem,
  MenuPaneTopRow,
  MenuScrollFrame,
  MenuSeparator,
} from '@renderer/design-system/components/menu'
import {
  footerAction,
  footerLockAction,
  lockIcon,
  rowDisabled,
} from '@renderer/design-system/components/menu/menu.css'
import { PaneSlider } from '@renderer/Components/Detail/PaneSlider'
import { cx } from '@renderer/design-system/cx'
import { ZOOM_STEPS, zoomStep } from './blockZoom'
import * as s from './handleMenu.css'

// Matches the SettingsPane ladder's control-size rows.
const GLYPH = 12
// The title field's location sub-line rides a step smaller than its glyph.
const LOC_GLYPH = 11

/** A nested PaneSlider per depth so every push AND back slides — a flat content swap would
 *  animate neither. */
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
        header={<MenuPaneTopRow label={backLabel} current={title} onBack={onBack} />}
        footer={
          footerNodes.length ? (
            <MenuBottomRow
              leading={footerNodes.map((n, i) => (
                <button
                  key={`${n.label}-${String(i)}`}
                  type="button"
                  className={footerAction}
                  onClick={n.pick === undefined ? undefined : () => resolve(n.pick)}
                >
                  {n.label}
                </button>
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
    <PaneSlider
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

// Delete still confirms natively in main.
export function BlockHandleMenu({
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
  /** False plays the retract; the host keeps this mounted until it finishes. */
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
  /** Respects Open In — full-page for now. */
  onOpenPage: () => void
  /** absent = 1.0. Markdown/page only. */
  zoom?: number
  onSetZoom?: (factor: number) => void
  containerLocked?: boolean
}): React.JSX.Element {
  const [pane, setPane] = useState<'root' | 'style' | 'page' | 'view'>('root')
  // An anchored dropdown (not an in-menu pane) — the menu stays put while steps drop over it.
  // Dismissal is a document listener (the CalendarPicker idiom) that spares the dropdown + trigger
  // and closes on any other pointerdown.
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
      e.stopPropagation() // close the dropdown first, not the whole menu
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
  // A per-tile lock OR the host board lock dims + inerts every action, but the menu still opens
  // (it just can't mutate). The per-tile Lock always toggles back; a board lock shows the inert "Locked".
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
          <MenuBottomRow
            leading={
              containerLocked ? (
                <span className={`${footerLockAction} ${rowDisabled}`} title="Locked by the board">
                  <Icon name="lock" size={GLYPH} className={lockIcon} />
                  Locked
                </span>
              ) : (
                <button
                  type="button"
                  className={footerLockAction}
                  aria-label={locked ? 'Unlock tile' : 'Lock tile'}
                  onClick={() => onToggleLock()}
                >
                  <Icon name="lock" size={GLYPH} className={lockIcon} />
                  {locked ? 'Unlock' : 'Lock'}
                </button>
              )
            }
          />
        }
      >
        {entry.type === 'page' && pageInfo && (
          // Not muted by lock — opening is read-only.
          <button
            type="button"
            className={s.titleField}
            onClick={() => {
              onClose()
              onOpenPage()
            }}
          >
            <span className={s.titleFieldRow}>
              <Icon name={pageInfo.icon} size={GLYPH} className={s.titleFieldIcon} />
              <span className={s.titleFieldText}>{pageInfo.title}</span>
            </span>
            {location && (
              <span className={s.titleFieldRow}>
                <Icon name={location.icon} size={LOC_GLYPH} className={s.titleFieldLocIcon} />
                <span className={s.titleFieldLoc}>{location.title}</span>
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
        {/* Markdown/page tiles freeze-inset (only content + glyphs scale); a view tile scales as a
            unit — the grid's own CSS zoom compounds with --block-zoom. */}
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
              <span className={s.scaleValue}>{currentStep.inline}</span>
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
      <MenuPaneTopRow label="Menu" current="Style" onBack={() => setPane('root')} />
      {(['bordered', 'borderless'] as const).map((v) => (
        <PickerOption
          key={v}
          ring
          align="start"
          selected={style === v}
          onClick={act(() => onStyle(v))}
        >
          {v === 'bordered' ? 'Bordered' : 'Borderless'}
        </PickerOption>
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
        <PaneSlider open={pane !== 'root'} root={root} detail={detail} />
      </PickerMenu>
      {/* No onDismiss — the document listener above owns dismissal, so a pick can leave it open. */}
      <PickerMenu open={open && scaleOpen} triggerRef={scaleTriggerRef} solid>
        <div className={s.scaleMenu} data-scale-menu>
          {ZOOM_STEPS.map((st) => (
            <PickerOption
              key={st.label}
              ring
              align="start"
              selected={currentStep.factor === st.factor}
              onClick={() => onSetZoom?.(st.factor)}
            >
              {st.label}
            </PickerOption>
          ))}
        </div>
      </PickerMenu>
    </>
  )
}
