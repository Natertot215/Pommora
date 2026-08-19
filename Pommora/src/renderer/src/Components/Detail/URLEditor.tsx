import type { CSSProperties } from 'react'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import type { LinkConfig, LinkDisplay } from '@shared/properties'
import { ColorSwatchField } from './ColorPicker'
import { PickerControl } from './PickerControl'
import { LINK_FORMAT_OPTIONS } from './LinkFormat'
import * as s from './settingsPane.css'

/** Shared with the URL cell's own render via solidColorCss, so the two stay in sync. */
function resolveLinkColor(color: string | undefined): { name: ChipColorName; css: string } {
  if (!color) return { name: 'accent', css: solidColorCss(undefined) }
  return { name: chipColorFor(color), css: solidColorCss(color) }
}

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
  const link = resolveLinkColor(color)

  return (
    <div className={s.configEditor} style={{ '--accent': link.css } as CSSProperties}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Underline</span>
        <Switch
          checked={underline}
          onChange={(v) => onSetConfig({ link_underline: v })}
          ariaLabel="Underline links"
        />
      </div>
      <div className={s.configRow}>
        <span className={s.configLabel}>Color</span>
        <ColorSwatchField
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
