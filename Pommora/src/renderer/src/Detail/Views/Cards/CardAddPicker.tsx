import { type CSSProperties, type RefObject, useEffect, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { Icon } from '@renderer/design-system/symbols'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { MenuItem, MenuPaneTopRow } from '@renderer/design-system/components/menu'
import { flushTrailing } from '@renderer/design-system/components/menu/menu.css'
import { PaneSlider } from '@renderer/Components/Detail/PaneSlider'
import { propertyTypeIconName } from '@renderer/Components/Detail/PropertyTypes'
import {
  PropertyOptionRows,
  pickSemantics,
  syntheticContextDef,
} from '../PropertyEditing/PropertyPicker'
import type { ContextOption } from '../pipeline/contextOptions'
import { PropertyEditor } from '../PropertyEditing/PropertyEditor'
import { type AddEntry, orderAddableEntries, parseEditorValue } from './cardValueInput'
import { compactRow } from './cardAddPicker.css'
import { cx } from '@renderer/design-system/cx'

/** The value pane — routes the picked def to its editing surface (chip options, the calendar, or the
 *  text editor). pickSemantics is pure, so the branch is safe. */
function ValuePane({
  def,
  current,
  contextOptions,
  onCommit,
  onDone,
  onBack,
}: {
  def: PropertyDefinition
  current: PropertyValue | null
  /** Context entries: the pickable contexts — flips pickSemantics into context mode. */
  contextOptions?: ContextOption[] | null
  onCommit: (value: PropertyValue | null) => void
  onDone: () => void
  onBack: () => void
}): React.JSX.Element {
  const topRow = <MenuPaneTopRow label="Properties" current={def.name} onBack={onBack} />
  // datetime/url never pane — they're DEPENDENT dropdowns (onPickDependent exits to the calendar /
  // link dropdown); only number keeps an in-pane editor, chip kinds their option rows.
  if (def.type === 'number') {
    return (
      <>
        {topRow}
        <PropertyEditor
          initial=""
          numeric
          onCommit={(raw) => {
            // Empty input in the ADD flow means "never mind" — committing null would still fire the
            // reveal and surface a blank property the user never asked for. Skip both, just close.
            const parsed = parseEditorValue(def.type, raw)
            if (parsed !== undefined && parsed !== null) onCommit(parsed)
            onDone()
          }}
          onCancel={onBack}
        />
      </>
    )
  }
  const { options, selected, pick } = pickSemantics(
    def,
    current,
    onCommit,
    onDone,
    contextOptions ?? undefined,
  )
  return (
    <>
      {topRow}
      <PropertyOptionRows
        def={def}
        contextOptions={contextOptions ?? undefined}
        options={options}
        selected={selected}
        onPick={pick}
      />
    </>
  )
}

/**
 * The card's two-stage add-property menu: the list is everything NOT currently shown (hidden props,
 * Context columns, and blank addable props). A pane entry (a blank addable-type prop) slides into a value pane
 * to set a value; a reveal-only entry (a hidden Context column, a hidden-but-filled prop, a checkbox)
 * just unhides on pick. One PickerMenu hosting a PaneSlider, the SurfacePM multi-pane idiom.
 */
export function CardAddPicker({
  entries,
  currentOf,
  contextOptionsOf,
  open,
  anchorRef,
  initialEntry,
  onCommit,
  onReveal,
  onPickDependent,
  onDismiss,
}: {
  entries: AddEntry[]
  currentOf: (entry: AddEntry) => PropertyValue | null
  /** The pickable contexts for a Context entry (null for every other kind). */
  contextOptionsOf: (entry: AddEntry) => ContextOption[] | null
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  /** Jump straight to this entry's value pane (the native Add Property ▸ pick on a pane entry). */
  initialEntry?: AddEntry | null
  onCommit: (entry: AddEntry, value: PropertyValue | null) => void
  onReveal: (entry: AddEntry) => void
  /** A dependent-dropdown kind (datetime/url) picked in the list — the host exits this menu and
   *  opens the value's own picker at the same anchor. */
  onPickDependent: (entry: AddEntry) => void
  onDismiss: () => void
}): React.JSX.Element {
  const [picked, setPicked] = useState<AddEntry | null>(initialEntry ?? null)
  // The picker mounts persistently (so the Bloom-out plays); each OPEN re-seeds the pane from
  // initialEntry — the native Add Property ▸ jump — instead of relying on a fresh mount's initializer.
  useEffect(() => {
    if (open) setPicked(initialEntry ?? null)
  }, [open, initialEntry])
  const dismiss = (): void => {
    setPicked(null)
    onDismiss()
  }
  return (
    <PickerMenu
      open={open}
      onDismiss={dismiss}
      triggerRef={anchorRef}
      solid
      // Tighten the "Properties" pane header for the add-picker's compact density (the shared
      // --top-row-block rhythm knob — paddingBlock + separator gap).
      style={{ '--top-row-block': '0px' } as CSSProperties}
    >
      <PaneSlider
        open={picked !== null}
        root={
          entries.length === 0 ? (
            <div style={{ minWidth: 96, height: 24 }} />
          ) : (
            <div>
              {orderAddableEntries(entries).map((e) => (
                <MenuItem
                  key={e.id}
                  className={cx(flushTrailing, compactRow)}
                  leading={
                    <Icon name={propertyTypeIconName(e.type) ?? 'square-dashed'} size={14} />
                  }
                  trailing={e.revealOnly ? undefined : <Icon name="chevron-right" size={14} />}
                  onClick={() => {
                    if (e.revealOnly) {
                      onReveal(e)
                      dismiss()
                    } else if (e.type === 'datetime' || e.type === 'url') onPickDependent(e)
                    else setPicked(e)
                  }}
                >
                  {e.name}
                </MenuItem>
              ))}
            </div>
          )
        }
        detail={
          picked && (
            <div>
              <ValuePane
                def={picked.def ?? syntheticContextDef(picked.id)}
                current={currentOf(picked)}
                contextOptions={contextOptionsOf(picked)}
                onCommit={(v) => onCommit(picked, v)}
                onDone={dismiss}
                onBack={() => setPicked(null)}
              />
            </div>
          )
        }
        minWidth={120}
        minHeight={0}
      />
    </PickerMenu>
  )
}
