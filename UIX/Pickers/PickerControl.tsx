import { useRef, useState } from 'react'
import { EditableInput } from '../Fields/EditableInput'
import { clamp } from '../Utilities/clamp'
import { cx } from '../Utilities/cx'
import { Icon } from '../Symbols'
import * as s from './picker-control.css'
import { FACTOR, type NumberUnit, unitLabel, unitNumber } from './numberUnit'

export type PickerOption<T extends string> = {
  value: T
  label: string
  icon?: React.ComponentProps<typeof Icon>['name']
}

export type MenuDoor = (
  rows: { label: string; action: string; checked: boolean; icon?: string }[],
  trigger: HTMLElement,
  options?: { solid?: boolean; compact?: boolean },
) => Promise<string | null>

let door: MenuDoor | null = null

export const setMenuDoor = (next: MenuDoor): void => {
  door = next
}

const labelOf = <T extends string>(opts: readonly PickerOption<T>[], v: T): string =>
  opts.find((o) => o.value === v)?.label ?? opts[0].label

/** Admits an off-step current value so a hand-typed value still has a row to sit selected on. */
const stepsWith = (steps: readonly number[], current: number): number[] =>
  steps.some((f) => f === current) ? [...steps] : [...steps, current].sort((a, b) => a - b)

// Every stepped number control — a list of step rows, and the same field behind a right press; a typed value is divided back by `scale` and held within the steps' ends.
export function steppedPickerProps({
  steps,
  value,
  unit = FACTOR,
  onPick,
}: {
  steps: readonly number[]
  value: number
  unit?: NumberUnit
  onPick: (value: number) => void
}): {
  value: string
  options: PickerOption<string>[]
  onPick: (v: string) => void
  typeable: { text: string; suffix: string; onCommit: (written: string) => void }
} {
  return {
    value: String(value),
    options: stepsWith(steps, value).map((f) => ({
      value: String(f),
      label: unitLabel(f, unit),
    })),
    onPick: (v) => onPick(Number(v)),
    typeable: {
      text: unitNumber(value, unit),
      suffix: unit.suffix,
      onCommit: (written) => {
        const typed = Number.parseFloat(written)
        if (Number.isFinite(typed))
          onPick(clamp(typed / unit.scale, steps[0], steps[steps.length - 1]))
      },
    },
  }
}

export function PickerControl<T extends string>({
  ariaLabel,
  value,
  options,
  onPick,
  solid = false,
  chevronLead = false,
  typeable,
}: {
  ariaLabel: string
  value: T
  options: readonly PickerOption<T>[]
  onPick: (v: T) => void
  solid?: boolean
  chevronLead?: boolean
  /** A right press turns the trigger into a field instead of opening the list. */
  typeable?: { text: string; suffix?: string; onCommit: (typed: string) => void }
}): React.JSX.Element {
  const [typing, setTyping] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const isToggle = options.length === 2

  const onTrigger = (): void => {
    if (isToggle) {
      onPick((options.find((o) => o.value !== value) ?? options[0]).value)
      return
    }
    const el = ref.current
    if (!door || !el) return
    const rows = options.map((o) => ({
      label: o.label,
      action: o.value,
      checked: o.value === value,
      icon: o.icon,
    }))
    void door(rows, el, { solid, compact: true }).then((picked) => {
      // Resolved through the options rather than cast: the reply crosses as a bare string.
      const chosen = options.find((o) => o.value === picked)
      // Picking the value already shown is not a change, and a consumer that rebuilds on every pick would do it for nothing.
      if (chosen && chosen.value !== value) onPick(chosen.value)
    })
  }

  const chevron = <Icon name="chevrons-up-down" size="control" />
  return (
    <span ref={ref} className={s.host}>
      {typing && typeable ? (
        <span className={cx(s.trigger, s.value, chevronLead && s.chevronLead)}>
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
          className={cx(s.trigger, chevronLead && s.chevronLead)}
          aria-label={ariaLabel}
          onClick={onTrigger}
          // Reaches the trigger even when the menu took the left press.
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
}
