import { useRef, useState } from 'react'
import { chipColorFor, colorLabel } from '@renderer/design-system/tokens/colorMap'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { Chip } from '../Chip'
import { ColorPicker } from './ColorPicker'
import { PickerControl } from './PickerControl'
import * as s from './settingsPane.css'

export type CheckboxLook = 'checkbox' | 'switch'

const STYLE_OPTIONS: { value: CheckboxLook; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
]

/** The accent is a live user config, so it's always labeled "Accent," never frozen to a palette name. */
function resolveColor(
  color: string | undefined,
  accentName: ChipColorName,
): { name: ChipColorName; label: string } {
  if (!color) return { name: accentName, label: 'Accent' }
  const name = chipColorFor(color)
  return { name, label: name === accentName ? 'Accent' : colorLabel(name) }
}

/** The two controls write to different scopes: Colour → the property def (`setCheckboxColor`,
 *  applies everywhere), Style → this view's `column_styles` alone. */
export function CheckboxEditor({
  color,
  look,
  accent,
  onSetColor,
  onSetStyle,
}: {
  color: string | undefined
  look: CheckboxLook
  accent: string | undefined
  onSetColor: (color: string | undefined) => void
  onSetStyle: (look: CheckboxLook) => void
}): React.JSX.Element {
  const [coloring, setColoring] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const chosen = resolveColor(color, accent ? chipColorFor(accent) : 'accent')

  return (
    <div className={s.configEditor}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Color</span>
        <span className={s.colorCluster}>
          <button
            ref={chipRef}
            type="button"
            className={s.colorChip}
            onClick={() => setColoring((v) => !v)}
          >
            <Chip shape="label" color={chosen.name} label={chosen.label} />
          </button>
          <ColorPicker
            open={coloring}
            selected={chosen.name}
            onPick={(next) => {
              onSetColor(next)
              setColoring(false)
            }}
            onDismiss={() => setColoring(false)}
            triggerRef={chipRef}
          />
        </span>
      </div>
      <div className={s.configRow}>
        <span className={s.configLabel}>Style</span>
        <PickerControl
          ariaLabel="Checkbox style"
          value={look}
          options={STYLE_OPTIONS}
          onPick={onSetStyle}
        />
      </div>
    </div>
  )
}
