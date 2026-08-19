import { useRef, useState } from 'react'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import { tintAt, TINT_STEPS } from '@renderer/design-system/tokens/tint'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { ColorPicker } from './ColorPicker'
import { PickerControl } from './PickerControl'
import * as s from './settingsPane.css'

export type CheckboxLook = 'checkbox' | 'switch'

const STYLE_OPTIONS: { value: CheckboxLook; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
]

/** With no color of its own a checkbox follows the live app accent, so it resolves to whatever the
 *  accent currently paints rather than to a frozen palette entry. */
function resolveColor(
  color: string | undefined,
  accentName: ChipColorName,
): { name: ChipColorName; css: string } {
  if (!color) return { name: accentName, css: solidColorCss(undefined) }
  return { name: chipColorFor(color), css: solidColorCss(color) }
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
            aria-label="Color"
            onClick={() => setColoring((v) => !v)}
          >
            <span
              className={s.colorSwatch}
              style={{ '--sw': tintAt(chosen.css, TINT_STEPS.primary) } as React.CSSProperties}
            />
          </button>
          <ColorPicker
            greyscale={false}
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
