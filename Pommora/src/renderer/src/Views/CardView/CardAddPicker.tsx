import { type CSSProperties, type RefObject, useEffect, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Components/Pickers/PickerMenu/PickerMenu'
import { MenuItem, MenuFrameTopRow } from '@renderer/DesignSystem/Menus'
import { flushTrailing } from '@renderer/DesignSystem/Menus/menu-base.css'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import { propertyTypeIconName } from '@renderer/Properties/PropertyTypes'
import {
  PropertyOptionRows,
  pickSemantics,
  syntheticContextDef,
} from '@renderer/Properties/Editing/PropertyPicker'
import type { ContextOption } from '@renderer/Properties/contextOptions'
import { PropertyEditor } from '@renderer/Properties/Editing/PropertyEditor'
import {
  type AddEntry,
  orderAddableEntries,
  parseEditorValue,
} from '@renderer/Properties/Editing/cardValueInput'
import { compactRow } from './cardAddPicker.css'
import { cx } from '@renderer/DesignSystem/Util/cx'

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
  const topRow = <MenuFrameTopRow label="Properties" current={def.name} onBack={onBack} />
  // datetime/url never frame — they're DEPENDENT menus (onPickDependent exits to the calendar /
  // link menu); only number keeps an in-frame editor, chip kinds their option rows.
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

/** The card's two-stage add-property menu: a pane entry (a blank addable-type prop) slides into a
 *  value pane to set a value; a reveal-only entry just unhides on pick. */
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
  contextOptionsOf: (entry: AddEntry) => ContextOption[] | null
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  initialEntry?: AddEntry | null
  onCommit: (entry: AddEntry, value: PropertyValue | null) => void
  onReveal: (entry: AddEntry) => void
  /** A dependent-menu kind (datetime/url) picked in the list — the host exits this menu and
   *  opens the value's own picker at the same anchor. */
  onPickDependent: (entry: AddEntry) => void
  onDismiss: () => void
}): React.JSX.Element {
  const [picked, setPicked] = useState<AddEntry | null>(initialEntry ?? null)
  // The picker mounts persistently (so the Bloom-out plays); each OPEN re-seeds the frame from
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
      // Tighten the "Properties" pane header for the add-picker's compact density.
      style={{ '--top-row-block': '0px' } as CSSProperties}
    >
      <FrameSlide
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
                    <Icon name={propertyTypeIconName(e.type) ?? 'square-dashed'} size="body" />
                  }
                  trailing={e.revealOnly ? undefined : <Icon name="chevron-right" />}
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
