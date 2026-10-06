import { LineRow, useLineEl } from '@pommora/uix/Interactions/drag'
import { Button } from '@pommora/uix/Buttons/Button'
import type { ColumnLook } from '../columnStyles'
import type { PropertyDefinition } from '../properties'
import { OptionChip, type OptionChipData } from '../Cells/OptionChip'
import { ghostAnchorProps, type GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import * as s from '@pommora/uix/Menus/frames.css'
import { compactTitle } from './option-row.css'

export function OptionSlot({
  option,
  type,
  look,
  def,
  editing,
  ghost,
  onToggleEditing,
  onOpenMenu,
}: {
  option: OptionChipData
  type: string
  look: ColumnLook | undefined
  def: Pick<PropertyDefinition, 'status_groups'>
  editing: boolean
  ghost: GhostAnchor
  onToggleEditing: (anchor: HTMLElement | undefined) => void
  onOpenMenu: (row: HTMLElement) => void
}): React.JSX.Element {
  const rowEl = useLineEl()
  return (
    <LineRow
      id={option.value}
      {...ghostAnchorProps(ghost, option.value)}
      className={s.optionRow}
      data-reveal-host=""
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(e.currentTarget)
      }}
    >
      <span className={s.optionLead}>
        <OptionChip type={type} look={look} option={option} def={def} />
        {look === 'compact' && <span className={compactTitle}>{option.value}</span>}
      </span>
      <Button
        size="button-inline"
        paddingX="0"
        icon="square-pen"
        iconSize={s.ICON.optionEdit}
        className={s.optionEditButton}
        data-reveal-held={editing || undefined}
        aria-label="Edit Option"
        onClick={() => onToggleEditing(rowEl(option.value))}
      />
    </LineRow>
  )
}
