import { Fragment, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import {
  addStatusOption,
  recolorStatusOption,
  relabelStatusGroup,
  moveStatusOption,
  fallbackTitle,
} from '@shared/optionModel'
import type { StatusGroup } from '@shared/properties'
import { cx } from '@renderer/DesignSystem/Util/cx'
import {
  GhostOptionChip,
  OptionNameCaret,
  ghostAnchorProps,
  useGhostOptionAnchor,
} from '../GhostOptionChip'
import { OptionSlot, type OptionStyle } from '../OptionRow'
import { useStatusReorder } from '../useStatusReorder'
import * as s from '../../Frames/frames.css'
import { heading } from '@renderer/DesignSystem/Menus'
import { text } from '@renderer/DesignSystem/Tokens'
import { labelColor, shape } from '@renderer/DesignSystem/Labels'

export function StatusEditor({
  groups,
  look,
  onSetGroups,
  onRenameOption,
  onRemoveOption,
  onClearOption,
}: {
  groups: StatusGroup[]
  look: OptionStyle
  onSetGroups: (next: StatusGroup[]) => void
  onRenameOption: (oldValue: string, newTitle: string) => void
  onRemoveOption: (value: string) => void
  onClearOption: (value: string) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState<{ groupId: string; index: number } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [coloring, setColoring] = useState<string | null>(null)
  const paletteBtnRef = useRef<HTMLButtonElement>(null)
  const def = useMemo(() => ({ status_groups: groups }), [groups])
  const statusOrder = useMemo(
    () => groups.map((g) => ({ id: g.id, values: g.options.map((o) => o.value) })),
    [groups],
  )
  const reorder = useStatusReorder(
    statusOrder,
    (value) => groups.flatMap((g) => g.options).find((o) => o.value === value)?.label ?? value,
    (value, toGroupId, toIndex) => onSetGroups(moveStatusOption(groups, value, toGroupId, toIndex)),
  )
  // One anchor per group — the shared mechanism holds a single ghost, so crossing into another
  // group's list moves the slot rather than standing two of them up.
  const ghostApi = useGhostOptionAnchor(
    adding !== null || renaming !== null || renamingGroup !== null || coloring !== null,
  )

  const commitAdd = (groupId: string, raw: string, at: number): void => {
    setAdding(null)
    const g = groups.find((x) => x.id === groupId)
    onSetGroups(
      addStatusOption(groups, groupId, raw.trim() || fallbackTitle('status', g?.label), at),
    )
  }
  const commitGroupRename = (groupId: string, raw: string): void => {
    setRenamingGroup(null)
    const title = raw.trim()
    if (title) onSetGroups(relabelStatusGroup(groups, groupId, title))
  }
  const commitRename = (oldValue: string, raw: string, groupLabel: string): void => {
    setRenaming(null)
    const title = raw.trim() || fallbackTitle('status', groupLabel)
    if (title !== oldValue) onRenameOption(oldValue, title)
  }
  const openMenu = async (value: string, name: string): Promise<void> => {
    const action = await window.nexus.optionMenu({ name })
    if (action === 'option:rename') setRenaming(value)
    else if (action === 'option:remove') onRemoveOption(value)
    else if (action === 'option:clear') onClearOption(value)
  }
  const pickColor = (value: string, color: string | undefined): void => {
    setColoring(null)
    onSetGroups(recolorStatusOption(groups, value, color))
  }

  const slotAt = (g: StatusGroup, index: number, anchorId: string): React.JSX.Element | null =>
    adding?.groupId === g.id && adding.index === index ? (
      <div className={s.optionRow}>
        <OptionNameCaret
          className={cx(shape.pill, labelColor[labelColorFor(g.color)])}
          onCommit={(raw) => commitAdd(g.id, raw, index)}
          onCancel={() => setAdding(null)}
        />
      </div>
    ) : (
      <GhostOptionChip
        api={ghostApi}
        anchorId={anchorId}
        shape="pill"
        onCreate={() => setAdding({ groupId: g.id, index })}
      />
    )

  return (
    <div className={s.statusGroups} ref={reorder.containerRef}>
      {reorder.ghost}
      {groups.map((g) => (
        <div key={g.id} className={s.statusGroup}>
          <div className={heading}>
            {renamingGroup === g.id ? (
              <OptionNameCaret
                className={text.footnote.emphasized}
                value={g.label}
                onCommit={(raw) => commitGroupRename(g.id, raw)}
                onCancel={() => setRenamingGroup(null)}
              />
            ) : (
              // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
              <span onDoubleClick={() => setRenamingGroup(g.id)}>{g.label}</span>
            )}
            <Button
              size="button-inline"
              paddingX="0"
              icon="plus"
              iconSize={s.ICON.optionsAdd}
              className={s.groupAdd}
              data-create
              aria-label={`Add to ${g.label}`}
              onClick={() => setAdding({ groupId: g.id, index: g.options.length })}
            />
          </div>
          <div
            className={cx('drop-line-host', s.optionList)}
            ref={(el) => reorder.registerGroup(g.id, el)}
            {...(g.options.length === 0 ? ghostAnchorProps(ghostApi, g.id) : {})}
          >
            {g.options.map((o, i) => {
              const isColoring = coloring === o.value
              return (
                <Fragment key={o.value}>
                  <OptionSlot
                    value={o.value}
                    drag={reorder}
                    ghost={ghostApi}
                    onOpenMenu={() => void openMenu(o.value, o.label)}
                    type="status"
                    look={look}
                    label={o.label}
                    color={o.color ?? g.color}
                    def={def}
                    renaming={renaming === o.value}
                    coloring={isColoring}
                    paletteRef={paletteBtnRef}
                    onCommitRename={(raw) => commitRename(o.value, raw, g.label)}
                    onCancelRename={() => setRenaming(null)}
                    onToggleColoring={() => setColoring((v) => (v === o.value ? null : o.value))}
                    onCloseColoring={() => setColoring(null)}
                    onPickColor={(color) => pickColor(o.value, color)}
                  />
                  {slotAt(g, i + 1, o.value)}
                </Fragment>
              )
            })}
            {g.options.length === 0 ? slotAt(g, 0, g.id) : null}
            {reorder.drop?.groupId === g.id ? <DropLine style={{ top: reorder.drop.top }} /> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
