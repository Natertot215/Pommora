import {
  carries,
  DropSlot,
  type Family,
  SortableZone,
  useDragItem,
} from '@pommora/uix/Interactions/drag'
import { type MenuRow, MenuRowView } from '@pommora/uix/Menus/MenuIndex'
import { MenuScrollFrame, MenuTopRow } from '@pommora/uix/Menus/MenuRows'
import { SETTINGS_PANE_MAX_HEIGHT } from '@pommora/uix/Menus/frames.css'
import { menuCompact } from '@pommora/uix/Menus/menu-row.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { popMenu } from '../../Actions/menuActions'
import { sideMoveMenuItems } from '../../Actions/viewMenus'
import { FILEDATA } from '../../Properties/properties'
import { useSession } from '../../Session/store'
import { sideColumn, sideDrop, sideFor } from '../List/listSides'
import type { Side } from '../views'
import type { VisibilityPaneProps } from './ViewPane'
import { visibilityPane } from './VisibilityFrame'
import * as s from './sides-frame.css'

const SIDES_FAMILY: Family<string> = { name: 'view-sides' }

const SIDE_COLUMNS: { side: Side; heading: string; other: Side }[] = [
  { side: 'left', heading: 'Left', other: 'right' },
  { side: 'right', heading: 'Right', other: 'left' },
]

function SideRow({
  id,
  row,
  onMenu,
}: {
  id: string
  row: MenuRow
  onMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const drag = useDragItem(id)
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      ref={drag.setNodeRef}
      style={drag.style}
      onContextMenu={onMenu}
      data-reveal-host=""
      {...drag.handle}
    >
      <MenuRowView row={row} />
    </div>
  )
}

export function SidesFrame({
  current = 'Visibility',
  ...pane
}: Omit<VisibilityPaneProps, 'footer'>): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const { view, back, save } = pane
  const { shown, hidden, label, row } = visibilityPane(pane, tree)

  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current={current} />}
      maxHeight={SETTINGS_PANE_MAX_HEIGHT}
    >
      <div className={cx(s.columns, menuCompact)}>
        {SIDE_COLUMNS.map(({ side, heading, other }) => {
          const drawn = sideColumn(shown, view, side)
          const drop = (id: string, beforeId: string | null): void =>
            void save(sideDrop(view, shown, side, id, beforeId))
          const menu = (id: string) => async (e: React.MouseEvent) => {
            e.preventDefault()
            if (await popMenu(sideMoveMenuItems(other)))
              void save({ column_sides: { [id]: other } })
          }
          return (
            <div key={side} className={s.column}>
              <MenuRowView row={{ kind: 'heading', label: heading }} />
              <div className={s.list}>
                {/* The one settings pane that displaces: a row carried to the other column makes room there, never drawn over the hidden rows at its foot. */}
                <SortableZone
                  className={s.zone}
                  items={drawn.map((c) => c.id)}
                  axis="y"
                  family={SIDES_FAMILY}
                  label={label}
                  carry={[carries(SIDES_FAMILY, (id) => (id === FILEDATA.title.id ? null : id))]}
                  onMove={drop}
                  receive={drop}
                  leaves
                >
                  <DropSlot foreignOnly />
                  {drawn.map((c) => (
                    <SideRow
                      key={c.id}
                      id={c.id}
                      row={row(c)}
                      onMenu={c.kind === 'title' ? undefined : menu(c.id)}
                    />
                  ))}
                </SortableZone>
                {hidden
                  .filter((c) => sideFor(c, view) === side)
                  .map((c) => (
                    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                    <div key={c.id} onContextMenu={menu(c.id)}>
                      <MenuRowView row={row(c)} />
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </MenuScrollFrame>
  )
}
