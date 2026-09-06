import type { CSSProperties } from 'react'
import { resolveColor } from '@pommora/uix/Theme/solidColor'
import type { LinkConfig, LinkDisplay } from '@pommora/core/Properties/properties'
import { MenuIndex } from '@pommora/uix/Menus'
import { LINK_FORMAT_OPTIONS } from './linkFormat'
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
              {
                kind: 'item',
                inert: true,
                label: 'Format',
                trailing: {
                  kind: 'picker',
                  ariaLabel: 'Link format',
                  value: display,
                  options: LINK_FORMAT_OPTIONS,
                  onPick: (v: LinkDisplay) => onSetConfig({ link_display: v }),
                },
              },
            ],
          },
        ]}
      />
    </div>
  )
}
