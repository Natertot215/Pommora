import { Fragment, useMemo, useState } from 'react'
import { groupOptions, PROPERTY_TYPES, type PropertyType, type StatusGroup } from '../properties'
import { cx } from '@pommora/uix/Utilities/cx'
import { GhostOptionChip, useGhostOptionAnchor } from './GhostOptionChip'
import { ghostAnchorProps } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { LineGroup, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { text } from '@pommora/uix/Theme'
import { OptionSlot } from './OptionRow'
import { OptionDraft, type OptionStyleControl, useOptionEdit } from './useOptionEdit'
import { OptionChip } from '../Cells/OptionChip'
import * as s from '@pommora/uix/Menus/frames.css'
import { AccessoryButton, heading, menuDropLine } from '@pommora/uix/Menus'

export function OptionEditor({
  propertyId,
  type,
  groups,
  style,
}: {
  propertyId: string
  type: PropertyType
  groups: StatusGroup[]
  style: OptionStyleControl
}): React.JSX.Element {
  const grouped = PROPERTY_TYPES[type].options === 'status'
  const look = style.current.look
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const options = useMemo(() => groups.flatMap(groupOptions), [groups])
  const def = useMemo(
    () => ({ id: propertyId, type, status_groups: groups }),
    [propertyId, type, groups],
  )
  const edit = useOptionEdit({ def, options, style, destructive: true })
  const headingOf = (id: string): string =>
    grouped ? (groups.find((g) => g.id === id)?.label ?? id) : 'Options'
  const ghostApi = useGhostOptionAnchor(renamingGroup !== null || edit.busy)

  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    edit.draft?.groupId === g.id && edit.draft.index === index ? (
      <div className={s.optionRow}>
        <OptionDraft edit={edit} type={type} color={g.color} />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        type={type}
        onCreate={() => edit.beginDraft(g.id, index)}
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
          void edit.editOption({ op: 'move', value, groupId: slot.lane, toIndex: slot.index }),
        line: menuDropLine,
        label: (value) => (options.some((o) => o.value === value) ? value : headingOf(value)),
        chip: (value) => (
          <OptionChip
            type={type}
            look={look}
            option={options.find((o) => o.value === value)}
            def={def}
          />
        ),
        watch: [groups],
      })}
    >
      {groups.map((g) => (
        <div key={g.id} className={s.statusGroup} data-reveal-host="">
          <div className={heading}>
            <RenamableLabel
              renames="title"
              editing={renamingGroup === g.id}
              value={g.label}
              className={cx(base, text.footnote.emphasized)}
              autoSize
              onBegin={grouped ? () => setRenamingGroup(g.id) : undefined}
              onCommit={(label) => {
                setRenamingGroup(null)
                void edit.editOption({ op: 'relabelGroup', groupId: g.id, label })
              }}
              onCancel={() => setRenamingGroup(null)}
            >
              {headingOf(g.id)}
            </RenamableLabel>
            <AccessoryButton
              icon="plus"
              size={s.ICON.optionsAdd}
              ariaLabel={grouped ? `Add to ${g.label}` : 'Add Option'}
              create
              reveal={grouped}
              onClick={() => edit.beginDraft(g.id, g.options.length)}
            />
          </div>
          <LineGroup
            id={g.id}
            className={s.optionList}
            {...(g.options.length === 0 ? ghostAnchorProps(ghostApi, g.id) : {})}
          >
            {groupOptions(g).map((o, i) => (
              <Fragment key={edit.keyOf(o.value)}>
                <Reveal open enterOnMount={edit.entering(o.value)} fill>
                  <OptionSlot
                    option={o}
                    type={type}
                    look={look}
                    def={def}
                    editing={edit.isOpen(o.value)}
                    ghost={ghostApi}
                    onToggleEditing={(el) => edit.toggle(o.value, el)}
                    onOpenMenu={(row) => void edit.openMenu(o.value, row)}
                  />
                </Reveal>
                {slotAt(g, i + 1, o.value)}
              </Fragment>
            ))}
            {g.options.length === 0 ? slotAt(g, 0, g.id) : null}
          </LineGroup>
        </div>
      ))}
      {edit.popup}
    </LineZone>
  )
}
