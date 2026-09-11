import { clamp } from '@pommora/uix/Utilities/clamp'
import { useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { Icon } from '@pommora/uix/Symbols'
import {
  Menu,
  MenuItem,
  MenuRowView,
  MenuSeparator,
  type MenuRow,
  type Trailing,
} from '@pommora/uix/Menus'
import { text } from '@pommora/uix/Theme'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { SETTINGS_RAIL, SETTINGS_WIN } from '@pommora/uix/Windows/windowBounds'
import { stepsWith } from '@pommora/uix/Pickers/PickerControl'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { SCALE_STEPS } from '@pommora/core/Settings/personalization'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useSession } from '../Session/store'
import { AssetDirectoryRow } from './AssetDirectoryRow'
import { ExcludedDirectoriesRow } from './ExcludedDirectoriesRow'
import { ClearActionRow } from './ClearActionRow'
import { NexusRows } from './NexusRows'
import { useWindowGeometry } from '../Interface/Windows/useWindowGeometry'
import {
  type CategoryKey,
  FRAMES,
  frameFor,
  PERCENT,
  type Row,
  type RowOf,
  type RowText,
} from './frames'
import './settings-window.css'

const DRAG_SURFACES =
  '.settings-body, .settings-rail-list, .settings-section, .settings-heading, .trash-frame, .trash-head, .trash-head-name, .trash-head-date'

const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({
  kind: 'item',
  label: row.label,
  caption: row.hint,
  trailing,
})

export function SettingsWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.settingsOpen)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <NexusSettingsBody closing={closing} />
}

function NexusSettingsBody({ closing }: { closing: boolean }): React.JSX.Element {
  const closeSettings = useSession((s) => s.closeSettings)
  const [category, setCategory] = useState<CategoryKey>('general')
  const geometry = useWindowGeometry('settings')

  return (
    <WindowBase
      {...geometry}
      closing={closing}
      onClose={closeSettings}
      bounds={SETTINGS_WIN}
      dragSurfaces={DRAG_SURFACES}
      className="settings-window"
      ariaLabel="Settings"
      left={{
        windowId: 'settings-rail',
        bounds: SETTINGS_RAIL,
        mode: 'inflow',
        className: 'settings-rail',
        children: (
          <>
            <Menu className="settings-rail-list over-scroll">
              {FRAMES.filter((l) => !l.foot).map((l) => (
                <RailTab key={l.key} frame={l} active={category} onPick={setCategory} />
              ))}
            </Menu>
            {FRAMES.filter((l) => l.foot).map((l) => (
              <Menu key={l.key} className="settings-rail-foot">
                <MenuSeparator />
                <RailTab frame={l} active={category} onPick={setCategory} />
              </Menu>
            ))}
          </>
        ),
      }}
    >
      <FrameBody category={category} />
    </WindowBase>
  )
}

function RailTab({
  frame,
  active,
  onPick,
}: {
  frame: (typeof FRAMES)[number]
  active: CategoryKey
  onPick: (key: CategoryKey) => void
}): React.JSX.Element {
  return (
    <MenuItem
      selected={active === frame.key}
      leading={<Icon name={frame.icon} size="body" />}
      onClick={() => onPick(frame.key)}
    >
      {frame.label}
    </MenuItem>
  )
}

function FrameBody({ category }: { category: CategoryKey }): React.JSX.Element {
  const frame = frameFor(category)
  if (frame.Surface) return <frame.Surface />
  const { sections } = frame
  return (
    <div className="window-body settings-body over-scroll">
      <h2 className={cx('settings-heading', text.headline.emphasized)}>
        <Icon name={frame.icon} className="settings-heading-icon" />
        {frame.label}
      </h2>
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="settings-section">
          {section.title && (
            <MenuRowView row={{ kind: 'heading', label: section.title, caps: true }} />
          )}
          {section.rows.map((row) => (
            // Keyed on the label: the one row writing a top-level settings key has no personalization key to be identified by, and a label is unique within a section.
            <RowControl key={row.label} row={row} />
          ))}
        </div>
      ))}
    </div>
  )
}

function RowControl({ row }: { row: Row }): React.JSX.Element {
  switch (row.kind) {
    case 'toggle':
      return <ToggleRow row={row} />
    case 'slider':
      return <SliderRow row={row} />
    case 'picker':
      return <PickerControlRow row={row} />
    case 'zoom':
      return <ZoomRow row={row} />
    case 'device':
      return <DeviceRow row={row} />
    case 'path':
      return <AssetDirectoryRow label={row.label} hint={row.hint} />
    case 'exclusions':
      return <ExcludedDirectoriesRow label={row.label} hint={row.hint} />
    case 'clear':
      return <ClearActionRow label={row.label} hint={row.hint} clear={row.clear} />
    case 'color':
      return <ColorRow row={row} />
    case 'nexus':
      return <NexusRows />
  }
}

function ColorRow({ row }: { row: RowOf<'color'> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key]) as string | undefined
  const setPersonalization = useSession((s) => s.setPersonalization)

  const inheriting = !value || value === row.inherits

  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'color',
        label: row.label,
        selected: inheriting ? 'default' : labelColorFor(value),
        css: inheriting ? row.inheritsVar : solidColorCss(value),
        greyscale: row.greyscale,
        onPick: (next) => setPersonalization(row.key, (next ?? row.inherits) as never),
      })}
    />
  )
}

const switchRow = (
  row: RowText,
  checked: boolean,
  onChange: (next: boolean) => void,
): React.JSX.Element => (
  <MenuRowView
    row={settingsRow(row, { kind: 'switch', checked, ariaLabel: row.label, onChange })}
  />
)

function ToggleRow({ row }: { row: RowOf<'toggle'> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  const on = value ?? row.defaultOn ?? false
  return switchRow(row, on, (next) =>
    setPersonalization(row.key, row.defaultOn && next ? undefined : next),
  )
}

function DeviceRow({ row }: { row: RowOf<'device'> }): React.JSX.Element {
  const on = useSession((s) => s.devicePrefs[row.key] ?? false)
  const setDevicePref = useSession((s) => s.setDevicePref)
  return switchRow(row, on, (next) => setDevicePref(row.key, next || undefined))
}

function ZoomRow({ row }: { row: RowOf<'zoom'> }): React.JSX.Element {
  const stored = useSession((s) => s.personalization[row.key]) ?? row.fallback
  const setPersonalization = useSession((s) => s.setPersonalization)
  const steps = row.steps ?? SCALE_STEPS
  const unit = row.unit ?? PERCENT
  const shown = (value: number): number => Math.round(value * unit.scale)
  const commit = (value: number): void =>
    setPersonalization(row.key, value === row.fallback ? undefined : value)
  const choices = stepsWith(steps, stored).map((f) => ({
    value: String(f),
    label: `${shown(f)}${unit.suffix}`,
  }))
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'picker',
        ariaLabel: row.label,
        value: String(stored),
        options: choices,
        onPick: (v) => commit(Number(v)),
        typeable: {
          text: String(shown(stored)),
          suffix: unit.suffix,
          onCommit: (written) => {
            const typed = Number.parseFloat(written.replace(unit.suffix, '').trim())
            if (Number.isFinite(typed))
              commit(clamp(typed / unit.scale, steps[0], steps[steps.length - 1]))
          },
        },
      })}
    />
  )
}

function PickerControlRow({ row }: { row: RowOf<'picker'> }): React.JSX.Element {
  const stored = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'picker',
        ariaLabel: row.label,
        value: stored ?? row.fallback,
        options: row.options,
        onPick: (v: typeof row.fallback) =>
          setPersonalization(row.key, v === row.fallback ? undefined : v),
      })}
    />
  )
}

function SliderRow({ row }: { row: RowOf<'slider'> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key] ?? 0)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'slider',
        value,
        min: 0,
        max: row.max,
        step: 1,
        ariaLabel: row.label,
        format: row.format,
        onCommit: (v) => setPersonalization(row.key, v > 0 ? Math.round(v) : undefined),
      })}
    />
  )
}
