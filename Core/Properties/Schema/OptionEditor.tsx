import { Fragment, useMemo, useRef, useState } from 'react'
import {
  addOption,
  recolorOption,
  reorderOption,
  setOptionAppearance,
  setOptionIcon,
  fallbackTitle,
  type Option,
} from '@pommora/core/Properties/optionModel'
import type { PropertyType } from '@pommora/core/Properties/properties'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { cx } from '@pommora/uix/Utilities/cx'
import { GhostOptionChip, OptionNameCaret, useGhostOptionAnchor } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { DropLine } from '@pommora/uix/Interactions/DropLine'
import { OptionSlot, type OptionStyle, useOptionIconChoice } from './OptionRow'
import { useOptionReorder } from './useOptionReorder'
import * as s from '@pommora/uix/Menus/frames.css'
import { AccessoryButton, heading, rowDropLine } from '@pommora/uix/Menus'
import { labelColor, shape } from '@pommora/uix/Labels/label-base.css'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '@pommora/core/Actions/optionMenu'

const LIST_ANCHOR = 'options'

export function OptionEditor({
  type,
  options,
  look,
  onSetOptions,
  onRenameOption,
  onRemoveOption,
  onClearOption,
}: {
  type: PropertyType
  options: Option[]
  look: OptionStyle
  onSetOptions: (next: Option[]) => void
  onRenameOption: (oldValue: string, newTitle: string) => void
  onRemoveOption: (value: string) => void
  onClearOption: (value: string) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const editBtnRef = useRef<HTMLButtonElement>(null)
  const iconChoice = useOptionIconChoice(
    (value) => options.find((o) => o.value === value)?.icon,
    (value, icon) => onSetOptions(setOptionIcon(options, value, icon)),
  )
  const optionOrder = useMemo(() => options.map((o) => o.value), [options])
  const entering = useEntrance(options, (o) => o.value)
  const reorder = useOptionReorder(
    optionOrder,
    (value) => options.find((o) => o.value === value)?.label ?? value,
    (value, toIndex) => onSetOptions(reorderOption(options, value, toIndex)),
  )
  // Each option is its own anchor; an empty list has no chip to anchor to, so the list itself stands in for the first one.
  const ghostApi = useGhostOptionAnchor(
    adding !== null || renaming !== null || editing !== null || iconChoice.editing,
  )

  const commitAdd = (raw: string, at: number): void => {
    setAdding(null)
    onSetOptions(addOption(options, raw.trim() || fallbackTitle(optionOrder), undefined, at))
  }
  const slotAt = (index: number, anchorId: string): React.JSX.Element | null =>
    adding === index ? (
      <div className={s.optionRow}>
        <OptionNameCaret
          className={cx(shape.tag, labelColor.default)}
          onCommit={(raw) => commitAdd(raw, index)}
          onCancel={() => setAdding(null)}
        />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        shape={optionShapeFor(type)}
        onCreate={() => setAdding(index)}
      />
    )
  const commitRename = (oldValue: string, raw: string): void => {
    setRenaming(null)
    const title = raw.trim() || fallbackTitle(optionOrder.filter((v) => v !== oldValue))
    if (title !== oldValue) onRenameOption(oldValue, title)
  }
  const openMenu = async (o: Option, row: HTMLElement): Promise<void> => {
    const action = await popMenu(optionMenuModel())
    if (action === 'option:rename') setRenaming(o.value)
    else if (action === 'option:edit-icon') iconChoice.begin(o.value, row)
    else if (action === 'option:remove') {
      if (await askRemoveOption(o.label)) onRemoveOption(o.value)
    } else if (action === 'option:clear') {
      if (await askClearOption(o.label)) onClearOption(o.value)
    }
  }

  return (
    <div className={s.optionEditor}>
      <div className={heading}>
        <span>Options</span>
        <AccessoryButton
          icon="plus"
          size={s.ICON.optionsAdd}
          ariaLabel="Add Option"
          create
          onClick={() => setAdding(options.length)}
        />
      </div>
      <div
        className={cx('drop-line-host', s.optionList)}
        ref={reorder.containerRef}
        {...(options.length === 0 ? ghostAnchorProps(ghostApi, LIST_ANCHOR) : {})}
      >
        {reorder.ghost}
        {options.map((o, i) => {
          const isEditing = editing === o.value
          return (
            <Fragment key={o.value}>
              <Reveal open enterOnMount={entering(o.value)} fill>
                <OptionSlot
                  value={o.value}
                  drag={reorder}
                  ghost={ghostApi}
                  onOpenMenu={(row) => void openMenu(o, row)}
                  type={type}
                  look={look}
                  label={o.label}
                  color={o.color}
                  icon={o.icon}
                  appearance={o.appearance}
                  renaming={renaming === o.value}
                  editing={isEditing}
                  editButtonRef={editBtnRef}
                  onCommitRename={(raw) => commitRename(o.value, raw)}
                  onCancelRename={() => setRenaming(null)}
                  onToggleEditing={() => setEditing((v) => (v === o.value ? null : o.value))}
                  onCloseEditing={() => setEditing(null)}
                  onPickColor={(color) => onSetOptions(recolorOption(options, o.value, color))}
                  onPickAppearance={(a) => onSetOptions(setOptionAppearance(options, o.value, a))}
                  onEditIcon={(icon) => onSetOptions(setOptionIcon(options, o.value, icon))}
                />
              </Reveal>
              {slotAt(i + 1, o.value)}
            </Fragment>
          )
        })}
        {options.length === 0 ? slotAt(0, LIST_ANCHOR) : null}
        {reorder.lineTop !== null ? (
          <DropLine style={{ top: reorder.lineTop, ...rowDropLine() }} />
        ) : null}
      </div>
      {iconChoice.picker}
    </div>
  )
}
