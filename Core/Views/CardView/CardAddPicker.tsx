import { type RefObject, useEffect, useState } from 'react'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { MenuItem, MenuTopRow } from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { propertyIcon, propertyTypeIconName } from '../../Properties/Cells/PropertyTypes'
import {
  PropertyOptionRows,
  pickSemantics,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
import type { ContextOption } from '../../Properties/contextOptions'
import { type AddEntry, orderAddableEntries } from '../cardValueInput'
import { displayPropertyName, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import './cards-view.css'

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
  const capitalize = useCapitalizeMetadata()
  const header = (
    <MenuTopRow
      label="Properties"
      current={displayPropertyName(def.name, capitalize)}
      onBack={onBack}
      className="card-add-top-flat"
    />
  )
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
                    <Icon
                      name={
                        e.def
                          ? propertyIcon(e.def)
                          : (propertyTypeIconName(e.type) ?? 'square-dashed')
                      }
                      size="body"
                    />
                  }
                  trailing={e.revealOnly ? undefined : <Icon name="chevron-right" />}
                  onClick={() => {
                    if (e.revealOnly) {
                      onReveal(e)
                      dismiss()
                    } else if (
                      e.type === 'datetime' ||
                      e.type === 'url' ||
                      e.type === 'number' ||
                      e.type === 'file'
                    )
                      onPickDependent(e)
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
