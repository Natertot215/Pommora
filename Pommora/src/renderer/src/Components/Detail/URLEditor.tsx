import { useRef, useState, type CSSProperties } from 'react'
import { chipColorFor, colorLabel } from '@renderer/design-system/tokens/colorMap'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import type { LinkConfig, LinkDisplay } from '@shared/properties'
import { Chip } from '../Chip'
import { ColorPicker } from './ColorPicker'
import { PickerControl } from './PickerControl'
import { LINK_FORMAT_OPTIONS } from './LinkFormat'
import * as s from './settingsPane.css'

/** Shared with the URL cell's own render via solidColorCss, so the two stay in sync. */
function resolveLinkColor(color: string | undefined): {
  name: ChipColorName
  label: string
  css: string
} {
  if (!color) return { name: 'accent', label: 'Default', css: solidColorCss(undefined) }
  const name = chipColorFor(color)
  return { name, label: colorLabel(name), css: solidColorCss(color) }
}

/**
 * The chosen colour themes the pane's own Switches via a scoped `--accent`. The alias (a per-value
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
  const [coloring, setColoring] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const link = resolveLinkColor(color)

  return (
    <div className={s.configEditor} style={{ '--accent': link.css } as CSSProperties}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Underline</span>
        <span className={s.switchScale}>
          <Switch
            checked={underline}
            onChange={(v) => onSetConfig({ link_underline: v })}
            ariaLabel="Underline links"
          />
        </span>
      </div>
      <div className={s.configRow}>
        <span className={s.configLabel}>Color</span>
        <span className={s.colorCluster}>
          <button
            ref={chipRef}
            type="button"
            className={s.colorChip}
            onClick={() => setColoring((v) => !v)}
          >
            <Chip shape="label" color={link.name} label={link.label} />
          </button>
          <ColorPicker
            open={coloring}
            selected={link.name}
            onPick={(next) => {
              onSetConfig({ link_color: next })
              setColoring(false)
            }}
            onDismiss={() => setColoring(false)}
            triggerRef={chipRef}
          />
        </span>
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
