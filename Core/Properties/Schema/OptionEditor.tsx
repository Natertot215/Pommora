import { Fragment, useMemo, useRef, useState } from 'react'
import { fallbackTitle, type OptionEdit } from '@pommora/core/Properties/optionModel'
import {
  groupOptions,
  PROPERTY_TYPES,
  type PropertyType,
  type StatusGroup,
} from '@pommora/core/Properties/properties'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { cx } from '@pommora/uix/Utilities/cx'
import { GhostOptionChip, OptionNameCaret, useGhostOptionAnchor } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { LineGroup, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { text } from '@pommora/uix/Theme'
import { OptionSlot, type OptionStyle, useOptionIconChoice } from './OptionRow'
import { OptionChip } from '../Cells/OptionChip'
import * as s from '@pommora/uix/Menus/frames.css'
import { AccessoryButton, heading, menuDropLine } from '@pommora/uix/Menus'
import { labelColor, shape } from '@pommora/uix/Labels/label-base.css'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '@pommora/core/Actions/optionMenu'

export function OptionEditor({
  type,
  groups,
  look,
  onEdit,
  onRenameOption,
  onRemoveOption,
  onClearOption,
}: {
  type: PropertyType
  groups: StatusGroup[]
  look: OptionStyle
  onEdit: (edit: OptionEdit) => void
  onRenameOption: (oldValue: string, newTitle: string) => void
  onRemoveOption: (value: string) => void
  onClearOption: (value: string) => void
}): React.JSX.Element {
  const grouped = PROPERTY_TYPES[type].options === 'status'
  const [adding, setAdding] = useState<{ groupId: string; index: number } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ row: string; value: string } | null>(null)
  const editBtnRef = useRef<HTMLButtonElement>(null)
  const alias = useRef(new Map<string, string>())
  const options = useMemo(() => groups.flatMap(groupOptions), [groups])
  const values = useMemo(() => options.map((o) => o.value), [options])
  const keyOf = (value: string): string => {
    const key = alias.current.get(value)
    return key !== undefined && !values.includes(key) ? key : value
  }
  const isEditing = (row: string): boolean =>
    editing !== null &&
    (editing.value === row || (editing.row === row && !values.includes(editing.value)))
  const iconChoice = useOptionIconChoice(
    (value) => options.find((o) => o.value === value)?.icon,
    (value, icon) => onEdit({ op: 'icon', value, icon }),
  )
  const def = useMemo(() => ({ status_groups: groups }), [groups])
  const headingOf = (id: string): string =>
    grouped ? (groups.find((g) => g.id === id)?.label ?? id) : 'Options'
  const entering = useEntrance(options, (o) => keyOf(o.value))
  const ghostApi = useGhostOptionAnchor(
    adding !== null ||
      renaming !== null ||
      renamingGroup !== null ||
      editing !== null ||
      iconChoice.editing,
  )

  const commitAdd = (g: StatusGroup, raw: string, atIndex: number): void => {
    setAdding(null)
    onEdit({
      op: 'add',
      groupId: g.id,
      title: raw.trim() || fallbackTitle(values, g.label),
      atIndex,
    })
  }
  const commitGroupRename = (groupId: string, raw: string): void => {
    setRenamingGroup(null)
    const label = raw.trim()
    if (label) onEdit({ op: 'relabelGroup', groupId, label })
  }
  const commitRename = (row: string, raw: string, g: StatusGroup): void => {
    setRenaming(null)
    const from = isEditing(row) && editing ? editing.value : row
    const title =
      raw.trim() ||
      fallbackTitle(
        values.filter((v) => v !== from),
        g.label,
      )
    if (title === from) return
    if (title === row || !values.includes(title)) {
      alias.current.set(title, keyOf(row))
      setEditing((e) => (e && e.value === from ? { row: e.row, value: title } : e))
    }
    onRenameOption(from, title)
  }
  const openMenu = async (value: string, row: HTMLElement): Promise<void> => {
    const action = await popMenu(optionMenuModel())
    if (action === 'option:rename') setRenaming(value)
    else if (action === 'option:edit-icon') iconChoice.begin(value, row)
    else if (action === 'option:remove') {
      if (await askRemoveOption(value)) onRemoveOption(value)
    } else if (action === 'option:clear') {
      if (await askClearOption(value)) onClearOption(value)
    }
  }
  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    adding?.groupId === g.id && adding.index === index ? (
      <div className={s.optionRow}>
        <OptionNameCaret
          className={cx(shape[optionShapeFor(type)], labelColor[colorNameFor(g.color)])}
          onCommit={(raw) => commitAdd(g, raw, index)}
          onCancel={() => setAdding(null)}
        />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        shape={optionShapeFor(type)}
        onCreate={() => setAdding({ groupId: g.id, index })}
      />
    )

  return (
    <LineZone
      className={s.statusGroups}
      {...lineList({
        laneOf: () => {
          const laneOf = new Map(
            groups.flatMap((grp) => grp.options.map((o) => [o.value, grp.id] as const)),
          )
          return (v) => laneOf.get(v)
        },
        across: true,
        boxes: (g) => g.groups,
        commit: (value, slot) =>
          onEdit({ op: 'move', value, groupId: slot.lane, toIndex: slot.index }),
        line: menuDropLine,
        label: (value) => (values.includes(value) ? value : headingOf(value)),
        chip: (value) => <OptionChip type={type} option={options.find((o) => o.value === value)} />,
        watch: [groups],
      })}
    >
      {groups.map((g) => (
        <div key={g.id} className={s.statusGroup} data-reveal-host="">
          <div className={heading}>
            {grouped && renamingGroup === g.id ? (
              <OptionNameCaret
                className={text.footnote.emphasized}
                value={g.label}
                onCommit={(raw) => commitGroupRename(g.id, raw)}
                onCancel={() => setRenamingGroup(null)}
              />
            ) : (
              // biome-ignore lint/a11y/noStaticElementInteractions: a double-click affordance on a heading, not a control — the contents carry their own semantics
              <span onDoubleClick={grouped ? () => setRenamingGroup(g.id) : undefined}>
                {headingOf(g.id)}
              </span>
            )}
            <AccessoryButton
              icon="plus"
              size={s.ICON.optionsAdd}
              ariaLabel={grouped ? `Add to ${g.label}` : 'Add Option'}
              create
              reveal={grouped}
              onClick={() => setAdding({ groupId: g.id, index: g.options.length })}
            />
          </div>
          <LineGroup
            id={g.id}
            className={s.optionList}
            {...(g.options.length === 0 ? ghostAnchorProps(ghostApi, g.id) : {})}
          >
            {g.options.map((o, i) => (
              <Fragment key={keyOf(o.value)}>
                <Reveal open enterOnMount={entering(keyOf(o.value))} fill>
                  <OptionSlot
                    value={o.value}
                    ghost={ghostApi}
                    onOpenMenu={(row) => void openMenu(o.value, row)}
                    type={type}
                    look={look}
                    color={o.color ?? g.color}
                    icon={o.icon}
                    appearance={o.appearance}
                    def={def}
                    renaming={renaming === o.value}
                    editing={isEditing(o.value)}
                    editButtonRef={editBtnRef}
                    onCommitRename={(raw) => commitRename(o.value, raw, g)}
                    onCancelRename={() => setRenaming(null)}
                    onToggleEditing={() =>
                      setEditing(isEditing(o.value) ? null : { row: o.value, value: o.value })
                    }
                    onCloseEditing={() => setEditing(null)}
                    onPickColor={(color) =>
                      onEdit({ op: 'recolor', value: editing?.value ?? o.value, color })
                    }
                    onPickAppearance={(appearance) =>
                      onEdit({ op: 'appearance', value: editing?.value ?? o.value, appearance })
                    }
                    onEditIcon={(icon) =>
                      onEdit({ op: 'icon', value: editing?.value ?? o.value, icon })
                    }
                  />
                </Reveal>
                {slotAt(g, i + 1, o.value)}
              </Fragment>
            ))}
            {g.options.length === 0 ? slotAt(g, 0, g.id) : null}
          </LineGroup>
        </div>
      ))}
      {iconChoice.picker}
    </LineZone>
  )
}
