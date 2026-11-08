import {
  type SavedView,
  VIEW_KINDS,
  VIEW_TYPES,
  type ViewType,
  type ViewWriter,
  viewOption,
} from '../views'
import { Icon } from '@pommora/uix/Symbols'
import { MenuIndex, switchRow } from '@pommora/uix/Menus/MenuIndex'
import { MenuSeparator, MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus/MenuRows'
import { ROOT_ROW_LOOK, SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { iconForTypeSwitch } from '../viewIcon'
import { cx } from '@pommora/uix/Utilities/cx'
import * as vs from './layout-frame.css'
import { BUILT_KINDS, presentedKind } from '../Host/viewKinds'
import type { PaneProps } from './ViewPane'

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

export const kindSwitches = (view: SavedView, save: ViewWriter): React.JSX.Element => (
  <MenuIndex
    sections={[
      {
        rows: presentedKind(view.type).layout.switches.map(({ icon, label, key, invert = false }) =>
          switchRow(
            icon,
            label,
            viewOption(view, key) !== invert,
            (next) => void save({ [key]: next !== invert }),
            ROOT_ROW_LOOK,
          ),
        ),
      },
    ]}
  />
)

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
  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Layout" />}
      footer={kindRows(view, save)}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      {typeGrid(view, save)}
      <MenuSeparator flush />
      {kindSwitches(view, save)}
    </MenuScrollFrame>
  )
}
