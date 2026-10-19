import { useEffect, useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { useRenameKeys } from '@pommora/uix/Animations/useRenameKeys'
import type { LaneSlot } from '@pommora/uix/Interactions/reorderModel'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { Label } from '@pommora/uix/Labels/Label'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition } from '../properties'
import { OptionChip, type OptionChipData } from '../Cells/OptionChip'
import { warnOwed, write } from '../propertyWrite'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '../../Actions/optionMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { OptionEditPopup } from './OptionEditPopup'

export type OptionStyleControl = {
  current: ColumnStyle
  set: (key: keyof ColumnStyle & string, value: string) => void
}

export type OptionDef = Pick<PropertyDefinition, 'id' | 'type' | 'status_groups'>

type Editing = { row: string; label: string }
type Draft = { key: string; groupId: string; index?: number }

export type OptionEditApi = {
  rowKeyOf: (label: string) => string
  entering: (label: string) => boolean
  isOpen: (row: string) => boolean
  toggle: (label: string, anchor: HTMLElement | undefined) => void
  openMenu: (label: string, row: HTMLElement) => Promise<void>
  editOption: (edit: OptionEdit) => Promise<boolean>
  moves: (groups: readonly { id: string; options: readonly { label: string }[] }[]) => {
    laneOf: () => (label: string) => string | undefined
    commit: (label: string, slot: LaneSlot) => void
    chip: (label: string) => React.JSX.Element
  }
  draft: Draft | null
  beginDraft: (groupId: string, index?: number) => void
  commitDraft: (label: string) => void
  cancelDraft: () => void
  busy: boolean
  popup: React.JSX.Element | null
}

export function useOptionEdit({
  def,
  options,
  style,
  destructive = false,
}: {
  def: OptionDef
  options: readonly OptionChipData[]
  style?: OptionStyleControl
  destructive?: boolean
}): OptionEditApi {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const keys = useRenameKeys(
    options.map((o) => o.label),
    editing?.label,
  )
  const { rowKeyOf } = keys

  const editOption = (edit: OptionEdit): Promise<boolean> =>
    write(dialer().ask('property:editOption', def.id, edit))
  const enteringKey = useEntrance(options, (o) => rowKeyOf(o.label))
  const entering = (label: string): boolean =>
    rowKeyOf(label) !== draft?.key && enteringKey(rowKeyOf(label))
  const isOpen = (row: string): boolean =>
    editing !== null && rowKeyOf(row) === rowKeyOf(editing.row)
  const open = (label: string, el: HTMLElement | undefined): void => {
    anchor.current = el ?? null
    setEditing({ row: label, label })
  }
  const toggle = (label: string, el: HTMLElement | undefined): void =>
    isOpen(label) ? setEditing(null) : open(label, el)

  const rename = async (label: string): Promise<void> => {
    if (!editing || label === editing.label) return
    const { row, label: from } = editing
    setEditing((e) => (e && e.label === from ? { row: e.row, label } : e))
    const renamed = (): Promise<boolean> =>
      warnOwed(dialer().ask('property:renameOption', def.id, from, label))
    if (!(await keys.land(row, label, renamed)))
      setEditing((e) => (e && e.label === label ? { row: e.row, label: from } : e))
  }

  const openMenu = async (label: string, row: HTMLElement): Promise<void> => {
    const action = await popMenu(
      optionMenuModel({
        style: style && { type: def.type, current: style.current },
        destructive,
      }),
    )
    switch (action) {
      case null:
        return
      case 'option:edit':
        return open(label, row)
      case 'option:clear':
        if (await askClearOption(def.id, label))
          await write(dialer().ask('property:clearOption', def.id, label))
        return
      case 'option:remove':
        if (await askRemoveOption(def.id, label))
          await warnOwed(dialer().ask('property:removeOption', def.id, label))
        return
      default: {
        const picked = parseStyleAction(action)
        if (picked) style?.set(picked.key, picked.value)
      }
    }
  }

  const moves: OptionEditApi['moves'] = (groups) => ({
    laneOf: () => {
      const laneOf = new Map(groups.flatMap((g) => g.options.map((o) => [o.label, g.id] as const)))
      return (label) => laneOf.get(label)
    },
    commit: (label, slot) =>
      void editOption({ op: 'move', option: label, groupId: slot.lane, toIndex: slot.index }),
    chip: (label) => (
      <OptionChip
        type={def.type}
        look={style?.current.look}
        option={options.find((o) => o.label === label)}
        def={def}
      />
    ),
  })

  const commitDraft = (label: string): void => {
    if (!draft) return
    const add = (): Promise<boolean> =>
      editOption({ op: 'add', groupId: draft.groupId, label, atIndex: draft.index })
    void keys.land(draft.key, label, add).then((ok) => {
      if (ok) setDraft((d) => (d === draft ? null : d))
    })
  }
  const drafted = draft && !options.some((o) => rowKeyOf(o.label) === draft.key) ? draft : null

  const option = editing && options.find((o) => rowKeyOf(o.label) === rowKeyOf(editing.row))
  useEffect(() => {
    if (editing && !option) setEditing(null)
  }, [editing, option])
  const held = useHeld(editing && option ? { ...editing, option } : null, !!option)
  const popup = held ? (
    <OptionEditPopup
      open={!!option}
      contentKey={held.label}
      type={def.type}
      option={{ ...held.option, label: held.label }}
      def={def}
      triggerRef={anchor}
      onDismiss={() => setEditing(null)}
      onRename={(label) => void rename(label)}
      onPickIcon={(icon) => void editOption({ op: 'icon', option: held.label, icon })}
      onPickColor={(color) => void editOption({ op: 'recolor', option: held.label, color })}
      onPickAppearance={(appearance) =>
        void editOption({ op: 'appearance', option: held.label, appearance })
      }
    />
  ) : null

  return {
    rowKeyOf,
    entering,
    isOpen,
    toggle,
    openMenu,
    editOption,
    moves,
    draft: drafted,
    beginDraft: (groupId, index) => setDraft({ key: keys.mint(), groupId, index }),
    commitDraft,
    cancelDraft: () => setDraft(null),
    busy: editing !== null || draft !== null,
    popup,
  }
}

export function OptionDraft({
  edit,
  type,
  color,
}: {
  edit: OptionEditApi
  type: string
  color?: string
}): React.JSX.Element {
  return (
    <Reveal open enterOnMount fill>
      <Label shape={optionShapeFor(type)} color={colorNameFor(color)}>
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
