import type { CSSProperties } from 'react'
import { resolveColor } from '@renderer/DesignSystem/Tokens/solidColor'
import { DualSwitch } from '@renderer/DesignSystem/Components/Controls/Switches/DualSwitch'
import type { LinkConfig, LinkDisplay } from '@shared/properties'
import { ColorSwatch } from '@renderer/DesignSystem/Components/Controls/Switches/ColorSwatch'
import { PickerControl } from '@renderer/DesignSystem/Elements/PickerControl'
import { LINK_FORMAT_OPTIONS } from '../LinkFormat'
import * as s from '../../Components/Detail/settingsPane.css'

/**
 * The chosen color themes the pane's own Switches via a scoped `--accent`. The alias (a per-value
 * Rename) overrides the chosen format at render time — it's not configured here.
 */
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
      <div className={s.configRow}>
        <span className={s.configLabel}>Underline</span>
        <DualSwitch
          checked={underline}
          onChange={(v) => onSetConfig({ link_underline: v })}
          ariaLabel="Underline links"
        />
      </div>
      <div className={s.configRow}>
        <span className={s.configLabel}>Color</span>
        <ColorSwatch
          label="Color"
          selected={link.name}
          css={link.css}
          onPick={(next) => onSetConfig({ link_color: next })}
        />
      </div>
      <div className={s.configRow}>
        <span className={s.configLabel}>Format</span>
        <PickerControl
          ariaLabel="Link format"
          value={display}
          options={LINK_FORMAT_OPTIONS}
          onPick={(v) => onSetConfig({ link_display: v })}
        />
      </div>
    </div>
  )
}
