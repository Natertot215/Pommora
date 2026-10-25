import { useEffect, useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import type { LaneSlot } from '@pommora/uix/Interactions/reorderModel'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition, SelectOption } from '../properties'
import { OptionChip } from '../Cells/OptionChip'
import { mintOptionId } from '../../Nexus/ids'
import { useSession } from '../../Session/store'
import type { MutateRequest } from '../../Nexus/mutateRequest'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '../../Actions/optionMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { askClearOption, askDeleteOption, askRewrite } from '../../Interface/Confirm/confirmations'
import { OptionEditPopup } from './OptionEditPopup'

export type OptionStyleControl = {
  current: ColumnStyle
  set: (key: keyof ColumnStyle & string, value: string) => void
}

type OptionDef = Pick<PropertyDefinition, 'id' | 'type' | 'status_groups'>

/** The open option's id, and the label a rename in flight shows until the host answers. */
type Editing = { id: string; label?: string }
type Draft = { id: string; groupId: string; index?: number }

type OptionEditApi = {
  entering: (id: string) => boolean
  isOpen: (id: string) => boolean
  toggle: (id: string, anchor: HTMLElement | undefined) => void
  openMenu: (id: string, row: HTMLElement) => Promise<void>
  editOption: (edit: OptionEdit) => Promise<boolean>
  moves: (groups: readonly { id: string; options: readonly { id: string }[] }[]) => {
    laneOf: () => (id: string) => string | undefined
    commit: (id: string, slot: LaneSlot) => void
    chip: (id: string) => React.JSX.Element
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
  options: readonly SelectOption[]
  style?: OptionStyleControl
  destructive?: boolean
}): OptionEditApi {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const mutate = useSession((st) => st.mutate)
  const landed = async (req: MutateRequest): Promise<boolean> => (await mutate(req)) !== null

  const editOption = (edit: OptionEdit): Promise<boolean> =>
    landed({ op: 'editOption', propertyId: def.id, edit })
  const enteringKey = useEntrance(options, (o) => o.id)
  const entering = (id: string): boolean => id !== draft?.id && enteringKey(id)
  const isOpen = (id: string): boolean => editing?.id === id
  const open = (id: string, el: HTMLElement | undefined): void => {
    anchor.current = el ?? null
    setEditing({ id })
  }
  const toggle = (id: string, el: HTMLElement | undefined): void =>
    isOpen(id) ? setEditing(null) : open(id, el)
  const opened = editing && options.find((o) => o.id === editing.id)

  const rename = async (label: string): Promise<void> => {
    if (!opened || label === (editing?.label ?? opened.label)) return
    const { id } = opened
    if (!(await askRewrite(def.id, { of: 'rename', label, optionId: id }))) return
    setEditing((e) => (e?.id === id ? { id, label } : e))
    if (!(await landed({ op: 'renameOption', propertyId: def.id, optionId: id, label })))
      setEditing((e) => (e?.id === id && e.label === label ? { id } : e))
  }

  const openMenu = async (id: string, row: HTMLElement): Promise<void> => {
    const option = options.find((o) => o.id === id)
    if (!option) return
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
        return open(id, row)
      case 'option:clear':
        if (await askClearOption(def.id, option))
          await mutate({ op: 'clearOption', propertyId: def.id, optionId: id })
        return
      case 'option:delete':
        if (await askDeleteOption(def.id, option))
          await mutate({ op: 'deleteOption', propertyId: def.id, optionId: id })
        return
      default: {
        const picked = parseStyleAction(action)
        if (picked) style?.set(picked.key, picked.value)
      }
    }
  }

  const moves: OptionEditApi['moves'] = (groups) => ({
    laneOf: () => {
      const laneOf = new Map(groups.flatMap((g) => g.options.map((o) => [o.id, g.id] as const)))
      return (id) => laneOf.get(id)
    },
    commit: (id, slot) =>
      void editOption({ op: 'move', optionId: id, groupId: slot.lane, toIndex: slot.index }),
    chip: (id) => (
      <OptionChip
        type={def.type}
        look={style?.current.look}
        option={options.find((o) => o.id === id)}
        def={def}
      />
    ),
  })

  const commitDraft = (label: string): void => {
    if (!draft) return
    const { id, groupId, index } = draft
    void editOption({ op: 'add', groupId, id, label, atIndex: index }).then((ok) => {
      if (ok) setDraft((d) => (d === draft ? null : d))
    })
  }
  const drafted = draft && !options.some((o) => o.id === draft.id) ? draft : null

  useEffect(() => {
    if (editing && !opened) setEditing(null)
  }, [editing, opened])
  const held = useHeld(
    opened ? { option: opened, label: editing?.label ?? opened.label } : null,
    !!opened,
  )
  const popup = held ? (
    <OptionEditPopup
      open={!!opened}
      contentKey={held.option.id}
      type={def.type}
      option={{ ...held.option, label: held.label }}
      def={def}
      triggerRef={anchor}
      onDismiss={() => setEditing(null)}
      onRename={(label) => void rename(label)}
      onPickIcon={(icon) => void editOption({ op: 'icon', optionId: held.option.id, icon })}
      onPickColor={(color) => void editOption({ op: 'recolor', optionId: held.option.id, color })}
      onPickAppearance={(appearance) =>
        void editOption({ op: 'appearance', optionId: held.option.id, appearance })
      }
    />
  ) : null

  return {
    entering,
    isOpen,
    toggle,
    openMenu,
    editOption,
    moves,
    draft: drafted,
    beginDraft: (groupId, index) => setDraft({ id: mintOptionId(), groupId, index }),
    commitDraft,
    cancelDraft: () => setDraft(null),
    busy: editing !== null || draft !== null,
    popup,
  }
}
