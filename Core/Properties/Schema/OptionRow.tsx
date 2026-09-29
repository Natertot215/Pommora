import { useRef, useState } from 'react'
import { LineRow } from '@pommora/uix/Interactions/drag'
import { Button } from '@pommora/uix/Buttons/Button'

import { lookOptions, OPTION_LOOKS } from '@pommora/core/Properties/columnStyles'
import type { OptionAppearance, PropertyDefinition } from '@pommora/core/Properties/properties'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import { OptionChip } from '../Cells/OptionChip'
import { OptionEditPopup } from './OptionEditPopup'
import { IconChoice } from '../../Assets/IconChoice'
import { OptionNameCaret } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import type { GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import * as s from '@pommora/uix/Menus/frames.css'
import { compactTitle } from './option-row.css'
import { labelColor, shape as labelShape } from '@pommora/uix/Labels/label-base.css'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'

export type OptionStyle = (typeof OPTION_LOOKS)[number]

export const OPTION_STYLE_OPTIONS = lookOptions(OPTION_LOOKS)

function OptionRow({
  type,
  look,
  value,
  color,
  icon,
  appearance,
  def,
  renaming,
  editing,
  editButtonRef,
  onCommitRename,
  onCancelRename,
  onToggleEditing,
  onCloseEditing,
  onPickColor,
  onPickAppearance,
  onEditIcon,
}: {
  type: string
  look: OptionStyle
  value: string
  color: string | undefined
  icon?: string
  appearance?: OptionAppearance
  def?: Pick<PropertyDefinition, 'status_groups'>
  renaming: boolean
  editing: boolean
  editButtonRef: React.RefObject<HTMLButtonElement | null>
  onCommitRename: (raw: string) => void
  onCancelRename: () => void
  onToggleEditing: () => void
  onCloseEditing: () => void
  onPickColor: (color: string | undefined) => void
  onPickAppearance: (appearance: OptionAppearance) => void
  onEditIcon: (icon: string | undefined) => void
}): React.JSX.Element {
  const option = { value, color, icon, appearance }
  if (renaming) {
    return (
      <OptionNameCaret
        className={cx(labelShape[optionShapeFor(type)], labelColor[colorNameFor(color)])}
        value={value}
        onCommit={onCommitRename}
        onCancel={onCancelRename}
      />
    )
  }
  return (
    <>
      <span className={s.optionLead}>
        <OptionChip type={type} look={look} option={option} def={def} />
        {look === 'compact' && <span className={compactTitle}>{value}</span>}
      </span>
      <span className={s.optionAnchor}>
        <Button
          ref={editing ? editButtonRef : undefined}
          size="button-inline"
          paddingX="0"
          icon="square-pen"
          iconSize={s.ICON.optionEdit}
          className={s.optionEditButton}
          data-reveal-held={editing || undefined}
          aria-label="Edit Option"
          onClick={onToggleEditing}
        />
        <OptionEditPopup
          open={editing}
          type={type}
          option={option}
          def={def}
          triggerRef={editButtonRef}
          onDismiss={onCloseEditing}
          onRename={onCommitRename}
          onPickIcon={onEditIcon}
          onPickColor={onPickColor}
          onPickAppearance={onPickAppearance}
        />
      </span>
    </>
  )
}

export function OptionSlot({
  ghost,
  onOpenMenu,
  ...row
}: React.ComponentProps<typeof OptionRow> & {
  ghost: GhostAnchor
  onOpenMenu: (row: HTMLElement) => void
}): React.JSX.Element {
  return (
    <LineRow
      id={row.value}
      {...ghostAnchorProps(ghost, row.value)}
      className={s.optionRow}
      data-reveal-host=""
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenMenu(e.currentTarget)
      }}
    >
      <OptionRow {...row} />
    </LineRow>
  )
}

export function useOptionIconChoice(
  iconOf: (value: string) => string | undefined,
  commit: (value: string, icon: string) => void,
): {
  editing: boolean
  begin: (value: string, row: HTMLElement) => void
  picker: React.JSX.Element
} {
  const [value, setValue] = useState<string | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  return {
    editing: value !== null,
    begin: (next, row) => {
      anchor.current = row
      setValue(next)
    },
    picker: (
      <IconChoice
        open={value !== null}
        value={value === null ? undefined : iconOf(value)}
        onSelect={(icon) => {
          if (value !== null) commit(value, icon)
        }}
        onClose={() => setValue(null)}
        triggerRef={anchor}
      />
    ),
  }
}
