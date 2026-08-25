import { Fragment, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import {
  addOption,
  recolorOption,
  reorderOption,
  setOptionIcon,
  fallbackTitle,
  type Option,
} from '@shared/optionModel'
import type { PropertyType } from '@shared/properties'
import { cx } from '@renderer/DesignSystem/Util/cx'
import {
  GhostOptionChip,
  OptionNameCaret,
  ghostAnchorProps,
  useGhostOptionAnchor,
} from './GhostOptionChip'
import { DragGhost } from '@renderer/DesignSystem/Interactions/DragGhost'
import { DropLine } from '@renderer/DesignSystem/Interactions/DropLine'
import { OptionSlot, OptionStyleRow, type OptionStyle } from './OptionRow'
import { useOptionReorder } from './useOptionReorder'
import * as s from './settingsPane.css'
import { labelColor, optionShapeFor, shape } from '@renderer/DesignSystem/Labels'

/** A flat property owns one list, so its anchor needs no identity beyond being the only one. */
const LIST_ANCHOR = 'options'

/** The caller owns persistence: each callback maps to a `property.*Option` write (+ error
 *  surface + reload). Status layers grouping on top. */
export function OptionEditor({
  type,
  options,
  look,
  onSetOptions,
  onSetStyle,
  onRenameOption,
  onRemoveOption,
  onClearOption,
}: {
  type: PropertyType
  options: Option[]
  look: OptionStyle
  onSetOptions: (next: Option[]) => void
  onSetStyle: (look: OptionStyle) => void
  onRenameOption: (oldValue: string, newTitle: string) => void
  onRemoveOption: (value: string) => void
  onClearOption: (value: string) => void
}): React.JSX.Element {
  // The seat a new option is being named in — the index it will occupy, so it lands where the ghost
  // that opened it stood rather than at the end.
  const [adding, setAdding] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [coloring, setColoring] = useState<string | null>(null)
  const [iconEditing, setIconEditing] = useState<string | null>(null)
  // The open row's recolor button — the ColorPicker measures + dismiss-exempts it (only one is open).
  const paletteBtnRef = useRef<HTMLButtonElement>(null)
  // Identity-stable across the hook's own re-renders — its list-change invalidation keys on this.
  const optionOrder = useMemo(() => options.map((o) => o.value), [options])
  const reorder = useOptionReorder(optionOrder, (value, toIndex) =>
    onSetOptions(reorderOption(options, value, toIndex)),
  )
  // Each option is its own anchor, so the slot opens under whichever chip the pointer rests on; an
  // empty list has no chip to anchor to, so the list itself stands in for the first one.
  const ghostApi = useGhostOptionAnchor(
    adding !== null || renaming !== null || coloring !== null || iconEditing !== null,
  )

  const commitAdd = (raw: string, at: number): void => {
    setAdding(null)
    onSetOptions(addOption(options, raw.trim() || fallbackTitle(type), undefined, at))
  }
  /** The naming chip in its seat, or the ghost standing in that seat, or nothing. */
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
    const title = raw.trim() || fallbackTitle(type)
    if (title !== oldValue) onRenameOption(oldValue, title)
  }
  const openMenu = async (o: Option): Promise<void> => {
    const action = await window.nexus.optionMenu({ name: o.label, canEditIcon: true })
    if (action === 'option:rename') setRenaming(o.value)
    else if (action === 'option:edit-icon') setIconEditing(o.value)
    else if (action === 'option:remove') onRemoveOption(o.value)
    else if (action === 'option:clear') onClearOption(o.value)
  }
  const pickColor = (o: Option, color: string | undefined): void => {
    setColoring(null)
    onSetOptions(recolorOption(options, o.value, color))
  }
  const pickIcon = (o: Option, icon: string | undefined): void => {
    setIconEditing(null)
    onSetOptions(setOptionIcon(options, o.value, icon))
  }

  return (
    <div className={s.optionEditor}>
      <OptionStyleRow look={look} onSetStyle={onSetStyle} />
      <div className={s.optionsRow}>
        <span className={s.optionsLabel}>Options</span>
        <Button
          size="button-inline"
          paddingX="0"
          icon="plus"
          iconSize={s.ICON.optionsAdd}
          className={s.optionsAdd}
          data-create
          aria-label="Add Option"
          onClick={() => setAdding(options.length)}
        />
      </div>
      <div
        className={cx('drop-line-host', s.optionList)}
        ref={reorder.containerRef}
        {...(options.length === 0 ? ghostAnchorProps(ghostApi, LIST_ANCHOR) : {})}
      >
        <DragGhost
          x={reorder.ghost?.x ?? null}
          y={reorder.ghost?.y ?? null}
          label={
            reorder.dragging
              ? (options.find((o) => o.value === reorder.dragging)?.label ?? reorder.dragging)
              : null
          }
        />
        {options.map((o, i) => {
          const isColoring = coloring === o.value
          return (
            <Fragment key={o.value}>
              <OptionSlot
                value={o.value}
                drag={reorder}
                ghost={ghostApi}
                onOpenMenu={() => void openMenu(o)}
                type={type}
                label={o.label}
                color={labelColorFor(o.color)}
                icon={o.icon}
                renaming={renaming === o.value}
                coloring={isColoring}
                iconEditing={iconEditing === o.value}
                paletteRef={paletteBtnRef}
                onCommitRename={(raw) => commitRename(o.value, raw)}
                onCancelRename={() => setRenaming(null)}
                onToggleColoring={() => setColoring((v) => (v === o.value ? null : o.value))}
                onCloseColoring={() => setColoring(null)}
                onPickColor={(color) => pickColor(o, color)}
                onEditIcon={(icon) => pickIcon(o, icon)}
                onCloseIcon={() => setIconEditing(null)}
              />
              {slotAt(i + 1, o.value)}
            </Fragment>
          )
        })}
        {options.length === 0 ? slotAt(0, LIST_ANCHOR) : null}
        {reorder.lineTop !== null ? <DropLine style={{ top: reorder.lineTop }} /> : null}
      </div>
    </div>
  )
}
