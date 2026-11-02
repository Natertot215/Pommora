import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { MenuItem, MenuScrollFrame, MenuSeparator, MenuTopRow } from '@pommora/uix/Menus/MenuRows'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { Icon } from '@pommora/uix/Symbols'
import { contextsByIdOf } from '../../Contexts/contextIdentity'
import { useSession } from '../../Session/store'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'
import type { ValueSeatApi } from '../Cells/ValueSeat'
import { columnIcon, columnLabel, GROUP_LABELS } from '../columnDisplay'
import { resolveFieldValue } from '../fieldValue'
import { ValuePane } from './PropertyPicker'
import { emptyPane } from './property-picker.css'
import { entryOutcome } from './valueClick'

export function MetadataPicker({ seat }: { seat: ValueSeatApi }): React.JSX.Element {
  const contexts = contextsByIdOf(useSession((s) => s.tree))
  const { open, host } = seat
  const adding = open?.mode === 'add' ? open : null
  const row = adding ? host.rowOf(adding.rowId) : undefined
  const column = adding?.slid ? host.columnOf(adding.slid) : undefined
  const target = row && column ? seat.target([row], column) : null

  const entryRow = (at: ViewRow, entry: ResolvedColumn): React.JSX.Element => {
    const outcome = entryOutcome(entry.type, resolveFieldValue(at, entry))
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
          seat.close()
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
  const rest = item && adding?.group !== 'contexts' ? item.properties : []

  return (
    <PickerMenu solid open={adding !== null} onDismiss={seat.close} triggerRef={seat.anchor}>
      <FrameSlide
        open={target !== null}
        minWidth={120}
        root={
          row && spaces.length + rest.length > 0 ? (
            <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
              {spaces.map((c) => entryRow(row, c))}
              {spaces.length > 0 && rest.length > 0 && <MenuSeparator />}
              {rest.map((c) => entryRow(row, c))}
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
                  onBack={() => seat.slide()}
                />
              }
              onCommit={(commits) => seat.commitPicks([row], column, commits)}
              onClose={seat.close}
            />
          )
        }
      />
    </PickerMenu>
  )
}
