import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { MenuItem, MenuScrollFrame, MenuSeparator, MenuTopRow } from '@pommora/uix/Menus/MenuRows'
import { MenuBase } from '@pommora/uix/Menus/MenuBase'
import { PANE_MAX_HEIGHT, PANE_WIDTH } from '@pommora/uix/Menus/menu-row.css'
import { Icon } from '@pommora/uix/Symbols'
import { contextsByIdOf } from '../../Contexts/contextIdentity'
import { useSession } from '../../Session/store'
import type { ViewRow } from '../../Views/viewRow'
import type { ValueSeatApi } from './ValueSeat'
import { columnIcon, columnLabel, GROUP_LABELS } from '../columnDisplay'
import { resolveFieldValue } from '../fieldValue'
import { ValuePane } from './PropertyPicker'
import { emptyPane } from './property-picker.css'
import { entryOutcome } from './valueClick'
import type { ResolvedColumn } from '../properties'

export function MetadataPicker({ seat }: { seat: ValueSeatApi }): React.JSX.Element {
  const contexts = contextsByIdOf(useSession((s) => s.tree))
  const { open, host } = seat
  const adding = open?.mode === 'add' ? open : null
  const row = adding ? host.rowOf(adding.rowId) : undefined
  const column = adding?.slid ? host.columnOf(adding.slid) : undefined
  const target = row && column ? seat.target([row], column) : null

  const entryRow = (at: ViewRow, entry: ResolvedColumn): React.JSX.Element => {
    const outcome = entryOutcome(entry.type, resolveFieldValue(at, entry), host.add?.inPlace)
    const choose = (): void => {
      switch (outcome) {
        case 'show':
          host.add?.show(entry)
          seat.close()
          break
        case 'slide':
          seat.slide(entry.id)
          break
        case 'click':
          seat.openAway(at, entry, seat.anchor.current)
      }
    }
    return (
      <MenuItem
        key={entry.id}
        leading={<Icon name={columnIcon(entry, contexts)} size="control" />}
        trailing={outcome === 'slide' ? <Icon name="chevron-right" size="control" /> : undefined}
        onClick={choose}
      >
        {columnLabel(entry, contexts)}
      </MenuItem>
    )
  }
  const item = row && host.add?.columns(row)
  const spaces = item && adding?.group !== 'properties' ? item.contexts : []
  const properties = item && adding?.group !== 'contexts' ? item.properties : []
  const listed = spaces.length + properties.length > 0

  return (
    <MenuBase solid open={adding !== null} onDismiss={seat.close} triggerRef={seat.anchor}>
      <FrameSlide
        open={target !== null}
        minWidth={PANE_WIDTH.minWidth}
        root={
          row && listed ? (
            <MenuScrollFrame maxHeight={PANE_MAX_HEIGHT}>
              {spaces.map((c) => entryRow(row, c))}
              {spaces.length > 0 && properties.length > 0 && <MenuSeparator />}
              {properties.map((c) => entryRow(row, c))}
            </MenuScrollFrame>
          ) : (
            <div className={emptyPane} />
          )
        }
        detail={
          row &&
          column &&
          target && (
            <ValuePane
              key={column.id}
              target={target}
              header={
                <MenuTopRow
                  label={GROUP_LABELS[column.kind === 'context' ? 'contexts' : 'properties']}
                  current={columnLabel(column, contexts)}
                  onBack={() => (listed ? seat.slide() : seat.close())}
                />
              }
              onCommit={(commits) => seat.commitPicks([row], column, commits)}
              onClose={seat.close}
            />
          )
        }
      />
    </MenuBase>
  )
}
