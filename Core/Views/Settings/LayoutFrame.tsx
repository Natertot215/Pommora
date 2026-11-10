import { type SavedView, VIEW_KINDS, VIEW_TYPES, type ViewType, type ViewWriter } from '../views'
import { Icon } from '@pommora/uix/Symbols'
import { MenuIndex } from '@pommora/uix/Menus/MenuIndex'
import { MenuSeparator, MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus/MenuRows'
import { SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { iconForTypeSwitch } from '../viewIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import * as vs from './layout-frame.css'
import { BUILT_KINDS, presentedKind } from '../Host/viewKinds'
import type { PaneProps } from './ViewPane'
import { switchRows } from './switchRows'

export function typeGrid(view: SavedView, save: ViewWriter): React.JSX.Element {
  const setType = (type: ViewType): void => {
    if (type === view.type) return
    const icon = iconForTypeSwitch(view, type)
    void save(icon ? { type, icon } : { type })
  }
  return (
    <div className={vs.grid}>
      {VIEW_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className={cx(vs.tile, t === view.type && vs.tileSelected)}
          aria-label={VIEW_KINDS[t].label}
          onClick={() => t in BUILT_KINDS && setType(t)}
        >
          <Icon name={VIEW_KINDS[t].icon} size="titleMedium" />
        </button>
      ))}
    </div>
  )
}

export function kindSwitches(view: SavedView, save: ViewWriter): React.JSX.Element | null {
  const { switches } = presentedKind(view.type).layout
  return switches.length > 0 ? (
    <MenuIndex sections={[{ rows: switchRows(switches, view, save) }]} />
  ) : null
}

export function kindRows(view: SavedView, save: ViewWriter): React.JSX.Element | null {
  const rows = presentedKind(view.type).layout.rows
  return rows ? (
    <>
      <MenuSeparator flush />
      <MenuIndex sections={[{ rows: rows(view, save) }]} />
    </>
  ) : null
}

export function LayoutFrame({ view, back, save }: PaneProps): React.JSX.Element {
  const switches = kindSwitches(view, save)
  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Layout" />}
      footer={kindRows(view, save)}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      {typeGrid(view, save)}
      {switches && <MenuSeparator flush />}
      {switches}
    </MenuScrollFrame>
  )
}
