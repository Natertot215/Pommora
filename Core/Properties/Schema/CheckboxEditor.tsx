import { resolveColor } from '@pommora/uix/Theme/ramp'
import { MenuIndex } from '@pommora/uix/Menus'
import * as s from '@pommora/uix/Menus/frames.css'

export type CheckboxLook = 'checkbox' | 'switch'

const STYLE_OPTIONS: { value: CheckboxLook; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
]

/** Different scopes: Color → the property def (applies everywhere), Style → this view's `column_styles` alone. */
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
                inert: true,
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
                inert: true,
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
