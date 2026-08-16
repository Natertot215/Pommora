import { useRef, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { PickerMenu, MenuOption } from '../../design-system/components/PickerMenu'
import * as s from './pickerControl.css'

export type PickerChoice<T extends string> = {
  value: T
  label: string
  icon?: React.ComponentProps<typeof Icon>['name']
}

export const labelOf = <T extends string>(opts: PickerChoice<T>[], v: T): string =>
  opts.find((o) => o.value === v)?.label ?? opts[0].label

/** Two options toggle in place — a dual-option control is always a toggleable double-chevron, never
 *  a dropdown; three+ pop a centered PickerMenu, the house surface for a fixed option set. */
export function PickerControl<T extends string>({
  ariaLabel,
  value,
  options,
  onPick,
  solid = false,
}: {
  ariaLabel: string
  value: T
  options: PickerChoice<T>[]
  onPick: (v: T) => void
  /** Opaque menu surface — for pickers that open over another pane (the block Scale idiom). */
  solid?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const isToggle = options.length === 2
  const trigger = (
    <button
      ref={ref}
      type="button"
      className={s.trigger}
      aria-label={ariaLabel}
      onClick={
        isToggle
          ? () => onPick((options.find((o) => o.value !== value) ?? options[0]).value)
          : () => setOpen(true)
      }
    >
      <span className={s.value}>{labelOf(options, value)}</span>
      <Icon name="chevrons-up-down" size={12} />
    </button>
  )
  if (isToggle) return trigger
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
          <MenuOption
            key={o.value}
            selected={o.value === value}
            leading={o.icon ? <Icon name={o.icon} size={13} /> : undefined}
            onClick={() => {
              onPick(o.value)
              setOpen(false)
            }}
          >
            {o.label}
          </MenuOption>
        ))}
      </PickerMenu>
    </>
  )
}
