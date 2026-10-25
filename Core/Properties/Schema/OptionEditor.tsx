import { Fragment, useMemo, useState } from 'react'
import {
  groupOptions,
  optionGroupsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type StatusGroup,
} from '../properties'
import { cx } from '@pommora/uix/Utilities/cx'
import { FLUSH_GHOST, GhostOptionChip } from './GhostOptionChip'
import { ghostAnchorProps, useGhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { LineGroup, LineZone, lineList } from '@pommora/uix/Interactions/drag'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { text } from '@pommora/uix/Theme'
import { OptionDraft, OptionSlot } from './OptionSlot'
import { type OptionStyleControl, useOptionEdit } from './useOptionEdit'
import * as s from '@pommora/uix/Menus/frames.css'
import { AccessoryButton, heading, menuDropLine } from '@pommora/uix/Menus'

export function OptionEditor({
  def,
  style,
}: {
  def: PropertyDefinition
  style: OptionStyleControl
}): React.JSX.Element {
  const grouped = PROPERTY_TYPES[def.type].options === 'status'
  const look = style.current.look
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const groups = useMemo(() => optionGroupsOf(def), [def])
  const options = useMemo(() => groups.flatMap(groupOptions), [groups])
  const edit = useOptionEdit({ def, options, style, destructive: true })
  const headingOf = (id: string): string =>
    grouped ? (groups.find((g) => g.id === id)?.label ?? id) : 'Options'
  const ghostApi = useGhostAnchor({
    ...FLUSH_GHOST,
    suppressed: () => renamingGroup !== null || edit.busy,
  })

  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    edit.draft?.groupId === g.id && edit.draft.index === index ? (
      <div className={s.optionRow}>
        <OptionDraft edit={edit} type={def.type} color={g.color} />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        type={def.type}
        onCreate={() => edit.beginDraft(g.id, index)}
      />
    )

  return (
    <LineZone
      className={s.statusGroups}
      {...lineList({
        ...edit.moves(groups),
        across: true,
        boxes: (g) => g.groups,
        line: menuDropLine,
        label: (value) => options.find((o) => o.id === value)?.label ?? headingOf(value),
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
              <Fragment key={o.id}>
                <Reveal open enterOnMount={edit.entering(o.id)} fill>
                  <OptionSlot
                    option={o}
                    look={look}
                    def={def}
                    editing={edit.isOpen(o.id)}
                    ghost={ghostApi}
                    onToggleEditing={(el) => edit.toggle(o.id, el)}
                    onOpenMenu={(row) => void edit.openMenu(o.id, row)}
                  />
                </Reveal>
                {slotAt(g, i + 1, o.id)}
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
