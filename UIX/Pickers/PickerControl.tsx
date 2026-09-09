import { createContext, useContext, useRef, useState } from 'react'
import { EditableInput } from '../Fields/EditableInput'
import { cx } from '../Utilities/cx'
import { Icon } from '../Symbols'
import * as s from './picker-control.css'

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

export const MenuDoorContext = createContext<MenuDoor | null>(null)

export const labelOf = <T extends string>(opts: readonly PickerOption<T>[], v: T): string =>
  opts.find((o) => o.value === v)?.label ?? opts[0].label

export const factorChoice = (f: number): PickerOption<string> => ({
  value: String(f),
  label: `${f.toFixed(2)}x`,
})

/** Admits an off-step current value so a hand-typed factor still has a row to sit selected on. */
export const stepsWith = (steps: readonly number[], current: number): number[] =>
  steps.some((f) => f === current) ? [...steps] : [...steps, current].sort((a, b) => a - b)

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
  const door = useContext(MenuDoorContext)
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
      if (chosen) onPick(chosen.value)
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
