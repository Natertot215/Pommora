import { Reveal } from '@pommora/uix/Animations/Reveal'
import { LineRow, useLineEl } from '@pommora/uix/Interactions/drag'
import { Button } from '@pommora/uix/Buttons/Button'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { Label } from '@pommora/uix/Labels/Label'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import type { ColumnLook } from '../columnStyles'
import type { PropertyDefinition, PropertyType, SelectOption } from '../properties'
import { OptionChip } from '../Cells/OptionChip'
import { chipOf } from '../typeDisplay'
import { ghostAnchorProps, type GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import * as s from '@pommora/uix/Menus/frames.css'

export function OptionSlot({
  option,
  look,
  def,
  editing,
  ghost,
  onToggleEditing,
  onOpenMenu,
}: {
  option: SelectOption
  look: ColumnLook | undefined
  def: Pick<PropertyDefinition, 'type' | 'status_groups'>
  editing: boolean
  ghost: GhostAnchor
  onToggleEditing: (anchor: HTMLElement | undefined) => void
  onOpenMenu: (row: HTMLElement) => void
}): React.JSX.Element {
  const rowEl = useLineEl()
  return (
    <LineRow
      id={option.id}
      {...ghostAnchorProps(ghost, option.id)}
      className={s.optionRow}
      data-reveal-host=""
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(e.currentTarget)
      }}
    >
      <span className={s.optionLead}>
        <OptionChip type={def.type} look={look} option={option} def={def} />
        {look === 'compact' && <span className={s.compactTitle}>{option.label}</span>}
      </span>
      <Button
        size="button-inline"
        paddingX="0"
        icon="square-pen"
        iconSize={s.ICON.optionEdit}
        className={s.optionEditButton}
        data-reveal-held={editing || undefined}
        aria-label="Edit Option"
        onClick={() => onToggleEditing(rowEl(option.id))}
      />
    </LineRow>
  )
}

/** The chip a new option is named in, in its group's color. */
export function OptionDraft({
  edit,
  type,
  color,
}: {
  edit: { commitDraft: (label: string) => void; cancelDraft: () => void }
  type: PropertyType
  color?: string
}): React.JSX.Element {
  return (
    <Reveal open enterOnMount fill>
      <Label shape={chipOf(type).shape} color={colorNameFor(color)}>
        <RenamableLabel
          renames="title"
          editing
          value=""
          className={base}
          autoSize
          onCommit={edit.commitDraft}
          onCancel={edit.cancelDraft}
        />
      </Label>
    </Reveal>
  )
}
