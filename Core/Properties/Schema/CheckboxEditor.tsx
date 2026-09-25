import { CHECKBOX_LOOKS, lookOptions } from '@pommora/core/Properties/columnStyles'
import { resolveColor } from '@pommora/uix/Theme/ramp'
import { MenuIndex, pickerRow } from '@pommora/uix/Menus'
import * as s from '@pommora/uix/Menus/frames.css'

export type CheckboxLook = (typeof CHECKBOX_LOOKS)[number]

const STYLE_OPTIONS = lookOptions(CHECKBOX_LOOKS)

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
  const chosen = resolveColor(color, 'var(--checkbox-base)')

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
              pickerRow(undefined, 'Style', look, STYLE_OPTIONS, onSetStyle, {
                ariaLabel: 'Checkbox style',
                inert: true,
              }),
            ],
          },
        ]}
      />
    </div>
  )
}
