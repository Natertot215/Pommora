import { resolveColor } from '@renderer/Views/TableView/solidColor'
import { ColorSwatch } from '@renderer/DesignSystem/Components/Controls/Switches/ColorSwatch'
import { PickerControl } from '@renderer/DesignSystem/Elements/PickerControl'
import * as s from '../../Components/Detail/settingsPane.css'

export type CheckboxLook = 'checkbox' | 'switch'

const STYLE_OPTIONS: { value: CheckboxLook; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
]

/** The two controls write to different scopes: Color → the property def (`setCheckboxColor`,
 *  applies everywhere), Style → this view's `column_styles` alone. */
export function CheckboxEditor({
  color,
  look,
  onSetColor,
  onSetStyle,
}: {
  color: string | undefined
  look: CheckboxLook
  onSetColor: (color: string | undefined) => void
  onSetStyle: (look: CheckboxLook) => void
}): React.JSX.Element {
  const chosen = resolveColor(color, 'var(--accent)')

  return (
    <div className={s.configEditor}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Color</span>
        <ColorSwatch label="Color" selected={chosen.name} css={chosen.css} onPick={onSetColor} />
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
