import type { CSSProperties } from 'react'
import { resolveColor } from '@pommora/uix/Theme/ramp'
import type { LinkConfig, LinkDisplay } from '@pommora/core/Properties/properties'
import { MenuIndex, pickerRow } from '@pommora/uix/Menus'
import { LINK_FORMAT_OPTIONS } from './linkFormatOptions'
import * as s from '@pommora/uix/Menus/frames.css'

export function URLEditor({
  underline,
  display,
  color,
  onSetConfig,
}: {
  underline: boolean
  display: LinkDisplay
  color: string | undefined
  onSetConfig: (patch: LinkConfig) => void
}): React.JSX.Element {
  const link = resolveColor(color, 'var(--system-accent)')

  return (
    <div className={s.configEditor} style={{ '--accent': link.css } as CSSProperties}>
      <MenuIndex
        sections={[
          {
            rows: [
              {
                kind: 'item',
                inert: true,
                label: 'Underline',
                trailing: {
                  kind: 'switch',
                  checked: underline,
                  onChange: (v) => onSetConfig({ link_underline: v }),
                  ariaLabel: 'Underline links',
                },
              },
              {
                kind: 'item',
                inert: true,
                label: 'Color',
                trailing: {
                  kind: 'color',
                  label: 'Color',
                  selected: link.name,
                  css: link.css,
                  onPick: (next) => onSetConfig({ link_color: next }),
                },
              },
              pickerRow(
                undefined,
                'Format',
                display,
                LINK_FORMAT_OPTIONS,
                (v: LinkDisplay) => onSetConfig({ link_display: v }),
                { ariaLabel: 'Link format', inert: true },
              ),
            ],
          },
        ]}
      />
    </div>
  )
}
