import { type RefObject, useEffect, useState } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { MenuItem, MenuTopRow } from '@renderer/DesignSystem/Menus'
import { topRowFlat } from './cardAddPicker.css'
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
  contextOptions?: ContextOption[] | null
  onCommit: (value: PropertyValue | null) => void
  onDone: () => void
  onBack: () => void
}): React.JSX.Element {
  const header = (
    <MenuTopRow label="Properties" current={def.name} onBack={onBack} className={topRowFlat} />
  )
  if (def.type === 'number') {
    return (
      <>
        {header}
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
      {header}
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
  onPickDependent: (entry: AddEntry) => void
  onDismiss: () => void
}): React.JSX.Element {
  const [picked, setPicked] = useState<AddEntry | null>(initialEntry ?? null)
  useEffect(() => {
    if (open) setPicked(initialEntry ?? null)
  }, [open, initialEntry])
  const dismiss = (): void => {
    setPicked(null)
    onDismiss()
  }
  return (
    <PickerMenu open={open} onDismiss={dismiss} triggerRef={anchorRef} solid>
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
