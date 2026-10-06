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
import { optionShapeFor } from '@pommora/uix/Labels/recipes'

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
  const [adding, setAdding] = useState<{ groupId: string; index: number } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const options = useMemo(() => groups.flatMap(groupOptions), [groups])
  const def = useMemo(() => ({ status_groups: groups }), [groups])
  const edit = useOptionEdit({ propertyId, type, def, options, style })
  const headingOf = (id: string): string =>
    grouped ? (groups.find((g) => g.id === id)?.label ?? id) : 'Options'
  const ghostApi = useGhostOptionAnchor(adding !== null || renamingGroup !== null || edit.busy)

  const commitAdd = (g: StatusGroup, title: string, atIndex: number): void => {
    setAdding(null)
    void edit.editOption({ op: 'add', groupId: g.id, title, atIndex })
  }
  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    adding?.groupId === g.id && adding.index === index ? (
      <div className={s.optionRow}>
        <OptionDraft
          onCommit={(title) => commitAdd(g, title, index)}
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
          void edit.editOption({ op: 'move', value, groupId: slot.lane, toIndex: slot.index }),
        line: menuDropLine,
        label: (value) => (options.some((o) => o.value === value) ? value : headingOf(value)),
        chip: (value) => <OptionChip type={type} option={options.find((o) => o.value === value)} />,
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
              onClick={() => setAdding({ groupId: g.id, index: g.options.length })}
            />
          </div>
          <LineGroup
            id={g.id}
            className={s.optionList}
            {...(g.options.length === 0 ? ghostAnchorProps(ghostApi, g.id) : {})}
          >
            {groupOptions(g).map((o, i) => (
              <Fragment key={edit.keyOf(o.value)}>
                <Reveal open enterOnMount={edit.entering(edit.keyOf(o.value))} fill>
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
