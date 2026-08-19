import { useRef, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { PickerMenu, PickerOption } from '../../design-system/components/PickerMenu'
import { detail } from '../../design-system/components/menu/menu.css'
import { popRowMenu, useNativeMenus } from '../../nativeMenus'
import * as s from './pickerControl.css'

export type PickerChoice<T extends string> = {
  value: T
  label: string
  icon?: React.ComponentProps<typeof Icon>['name']
}

export const labelOf = <T extends string>(opts: readonly PickerChoice<T>[], v: T): string =>
  opts.find((o) => o.value === v)?.label ?? opts[0].label

/** Two options toggle in place — a dual-option control is always a toggleable double-chevron, never
 *  a dropdown; three+ pop a centered PickerMenu, the house surface for a fixed option set. */
export function PickerControl<T extends string>({
  ariaLabel,
  value,
  options,
  onPick,
  onDoubleClick,
  solid = false,
  footing = false,
}: {
  ariaLabel: string
  value: T
  options: readonly PickerChoice<T>[]
  onPick: (v: T) => void
  /** A second press on the trigger, for a control whose value is also typeable. The menu the first
   *  press opened closes through its own state, so it still plays its exit. */
  onDoubleClick?: () => void
  /** Opaque menu surface — for pickers that open over another pane (the block Scale idiom). */
  solid?: boolean
  /** Pinned-footer tone — the value reads `detail`, sitting level with the Style row's label. */
  footing?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
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

  const trigger = (
    <button
      ref={ref}
      type="button"
      className={s.trigger}
      aria-label={ariaLabel}
      onClick={onTrigger}
      onDoubleClick={
        onDoubleClick
          ? () => {
              setOpen(false)
              onDoubleClick()
            }
          : undefined
      }
    >
      <span className={footing ? detail : s.value}>{labelOf(options, value)}</span>
      <Icon name="chevrons-up-down" size="control" />
    </button>
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
            }}
          >
            {o.label}
          </PickerOption>
        ))}
      </PickerMenu>
    </>
  )
}
