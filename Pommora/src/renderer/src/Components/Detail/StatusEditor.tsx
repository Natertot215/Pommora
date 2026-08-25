import { Fragment, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { DragGhost } from '@renderer/DesignSystem/Interactions/DragGhost'
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
} from './GhostOptionChip'
import { OptionSlot, OptionStyleRow, type OptionStyle } from './OptionRow'
import { useStatusReorder } from './useStatusReorder'
import * as s from './settingsPane.css'
import { labelColor, shape } from '@renderer/DesignSystem/Labels'

/**
 * Double-click a group heading to rename its label. The id underneath never changes — a calendar
 * bridge maps groups by id, and every stored value references one. Remove/Clear
 * cascade pages. Registry-only edits ride setStatusGroups, the page-touching ops their own IPC.
 */
export function StatusEditor({
  groups,
  look,
  onSetGroups,
  onSetStyle,
  onRenameOption,
  onRemoveOption,
  onClearOption,
}: {
  groups: StatusGroup[]
  look: OptionStyle
  onSetGroups: (next: StatusGroup[]) => void
  onSetStyle: (look: OptionStyle) => void
  onRenameOption: (oldValue: string, newTitle: string) => void
  onRemoveOption: (value: string) => void
  onClearOption: (value: string) => void
}): React.JSX.Element {
  // The seat a new option is being named in: which group, and the index it will occupy — so it lands
  // where the ghost that opened it stood rather than at the group's end.
  const [adding, setAdding] = useState<{ groupId: string; index: number } | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null) // the group id being relabeled
  const [renaming, setRenaming] = useState<string | null>(null) // the option value being renamed
  const [coloring, setColoring] = useState<string | null>(null) // the option value being recolored
  const paletteBtnRef = useRef<HTMLButtonElement>(null)
  // Identity-stable across the hook's own re-renders — its list-change invalidation keys on this.
  const statusOrder = useMemo(
    () => groups.map((g) => ({ id: g.id, values: g.options.map((o) => o.value) })),
    [groups],
  )
  const reorder = useStatusReorder(statusOrder, (value, toGroupId, toIndex) =>
    onSetGroups(moveStatusOption(groups, value, toGroupId, toIndex)),
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

  /** The naming chip in its seat, or the ghost standing in that seat. A status option names itself in
   *  its group's color, the way it will wear it once it exists. */
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

  const draggedLabel = (): string | null => {
    if (!reorder.dragging) return null
    for (const g of groups) {
      const hit = g.options.find((o) => o.value === reorder.dragging)
      if (hit) return hit.label
    }
    return reorder.dragging
  }
  return (
    <>
      <OptionStyleRow look={look} onSetStyle={onSetStyle} />
      <div className={s.statusGroups} ref={reorder.containerRef}>
        <DragGhost
          x={reorder.ghost?.x ?? null}
          y={reorder.ghost?.y ?? null}
          label={draggedLabel()}
        />
        {groups.map((g) => (
          <div key={g.id} className={s.statusGroup}>
            <div className={s.optionsRow}>
              {renamingGroup === g.id ? (
                <OptionNameCaret
                  className={s.optionsLabel}
                  value={g.label}
                  onCommit={(raw) => commitGroupRename(g.id, raw)}
                  onCancel={() => setRenamingGroup(null)}
                />
              ) : (
                // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
                <span className={s.optionsLabel} onDoubleClick={() => setRenamingGroup(g.id)}>
                  {g.label}
                </span>
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
                      label={o.label}
                      color={labelColorFor(o.color ?? g.color)}
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
              {reorder.drop?.groupId === g.id ? (
                <DropLine style={{ top: reorder.drop.top }} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
