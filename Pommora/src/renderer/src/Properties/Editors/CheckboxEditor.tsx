import { resolveColor } from '@renderer/DesignSystem/Tokens/solidColor'
import { MenuIndex } from '@renderer/DesignSystem/Menus'
import * as s from '../../Frames/frames.css'

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
      <MenuIndex
        sections={[
          {
            rows: [
              {
                kind: 'item',
                label: 'Color',
                trailing: {
                  kind: 'color',
                  label: 'Color',
                  selected: chosen.name,
                  css: chosen.css,
                  onPick: onSetColor,
                },
              },
              {
                kind: 'item',
                label: 'Style',
                trailing: {
                  kind: 'picker',
                  ariaLabel: 'Checkbox style',
                  value: look,
                  options: STYLE_OPTIONS,
                  onPick: onSetStyle,
                },
              },
            ],
          },
        ]}
      />
    </div>
  )
}
