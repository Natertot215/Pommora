import { useRef, useState } from 'react'
import { EditableInput } from '../../Fields'
import { cx } from '../../Util/cx'
import { Icon } from '../../Symbols'
import { PickerMenu, PickerOption } from '../../Pickers/picker-base'
import { popRowMenu, useNativeMenus } from '@renderer/Actions/nativeMenus'
import * as s from './picker-control.css'

export type PickerChoice<T extends string> = {
  value: T
  label: string
  icon?: React.ComponentProps<typeof Icon>['name']
}

export const labelOf = <T extends string>(opts: readonly PickerChoice<T>[], v: T): string =>
  opts.find((o) => o.value === v)?.label ?? opts[0].label

export const factorChoice = (f: number): PickerChoice<string> => ({
  value: String(f),
  label: `${f.toFixed(2)}x`,
})

/** The steps a scale picker offers, admitting an off-step current value so a hand-typed factor
 *  still has a row to sit selected on. */
export const stepsWith = (steps: readonly number[], current: number): number[] =>
  steps.some((f) => f === current) ? [...steps] : [...steps, current].sort((a, b) => a - b)

/** Two options toggle in place — a dual-option control is always a toggleable double-chevron, never
 *  a menu; three+ pop a centered PickerMenu, the house surface for a fixed option set. */
export function PickerControl<T extends string>({
  ariaLabel,
  value,
  options,
  onPick,
  typeable,
  solid = false,
}: {
  ariaLabel: string
  value: T
  options: readonly PickerChoice<T>[]
  onPick: (v: T) => void
  /** A control whose value can also be written out. A right press turns the trigger's value into a
   *  field holding `text`, selected and ready to overwrite, without opening the list at all. A value
   *  worn with a unit hands that unit over as `suffix`: it stays drawn beside the field, so the mark
   *  never leaves and the digits stay where they were read. */
  typeable?: { text: string; suffix?: string; onCommit: (typed: string) => void }
  /** Opaque menu surface — for pickers that open over another pane (the block Scale idiom). */
  solid?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const native = useNativeMenus()
  const isToggle = options.length === 2

  // The OS draws the same list from the same options — no leading glyph, since a system menu draws
  // its own marks and there is no honest way to hand it one; the chosen row reads as a checkmark
  // instead.
  const popNative = (): void => {
    const items = options.map((o) => ({
      label: o.label,
      action: o.value,
      checked: o.value === value,
    }))
    void popRowMenu(items, ref.current).then((picked) => {
      // Resolved back through the options rather than cast: the reply is a bare string by the
      // time it crosses, and only a value this control actually offered may be committed.
      const chosen = options.find((o) => o.value === picked)
      if (chosen) onPick(chosen.value)
    })
  }

  const onTrigger = (): void => {
    if (isToggle) onPick((options.find((o) => o.value !== value) ?? options[0]).value)
    else if (native) popNative()
    else setOpen(true)
  }

  const chevron = <Icon name="chevrons-up-down" size="control" />
  // The host span outlives the swap below, so the menu keeps measuring one box while the button it
  // holds becomes a field and back.
  const trigger = (
    <span ref={ref} className={s.host}>
      {typing && typeable ? (
        <span className={cx(s.trigger, s.value)}>
          <span className={s.written}>
            <EditableInput
              value={typeable.text}
              className={cx(s.value, s.caretShape)}
              autoSize
              onCommit={(typed) => {
                setTyping(false)
                typeable.onCommit(typed)
              }}
              onCancel={() => setTyping(false)}
            />
            {typeable.suffix && (
              // A press on the mark would otherwise pull focus out of the field and commit the edit.
              <span aria-hidden onMouseDown={(e) => e.preventDefault()}>
                {typeable.suffix}
              </span>
            )}
          </span>
          {chevron}
        </span>
      ) : (
        <button
          type="button"
          className={s.trigger}
          aria-label={ariaLabel}
          onClick={onTrigger}
          // The right press is the door: it opens the field outright, without the list, and reaches
          // the trigger whether or not a native list would have taken the left one.
          onContextMenu={
            typeable
              ? (e) => {
                  e.preventDefault()
                  setTyping(true)
                }
              : undefined
          }
        >
          <span className={s.value}>{labelOf(options, value)}</span>
          {chevron}
        </button>
      )}
    </span>
  )
  if (isToggle || native) return trigger
  return (
    <>
      {trigger}
      <PickerMenu
        open={open}
        onDismiss={() => setOpen(false)}
        triggerRef={ref}
        origin="center"
        solid={solid}
      >
        {options.map((o) => (
          <PickerOption
            key={o.value}
            selected={o.value === value}
            ring
            leading={o.icon ? <Icon name={o.icon} size="body" /> : undefined}
            onClick={() => {
              onPick(o.value)
              setOpen(false)
              setTyping(false)
            }}
          >
            {o.label}
          </PickerOption>
        ))}
      </PickerMenu>
    </>
  )
}
