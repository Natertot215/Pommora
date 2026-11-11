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

export function kindLeafSwitches(view: SavedView, save: ViewWriter): React.JSX.Element | null {
  const { leafSwitches } = presentedKind(view.type).layout
  return leafSwitches ? (
    <MenuIndex sections={[{ rows: switchRows(leafSwitches, view, save) }]} />
  ) : null
}

export function kindFooting(view: SavedView, save: ViewWriter): React.JSX.Element | null {
  const { footing } = presentedKind(view.type).layout
  return footing ? (
    <>
      <MenuSeparator flush />
      <MenuIndex sections={[{ rows: footing(view, save) }]} />
    </>
  ) : null
}

export function LayoutFrame({ view, back, save }: PaneProps): React.JSX.Element {
  const switches = kindLeafSwitches(view, save)
  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current="Layout" />}
      footer={kindFooting(view, save)}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      {typeGrid(view, save)}
      {switches && <MenuSeparator flush />}
      {switches}
    </MenuScrollFrame>
  )
}
