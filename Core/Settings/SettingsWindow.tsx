import { applyPersonalizationKey } from './applyPersonalization'
import { value as pickerValue } from '@pommora/uix/Pickers/picker-control.css'
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
import { WindowBase } from '@pommora/uix/Windows/WindowBase'
import { SETTINGS_RAIL, SETTINGS_WIN } from '@pommora/uix/Windows/windowBounds'
import { steppedPickerProps } from '@pommora/uix/Pickers/PickerControl'
import { resolveColor } from '@pommora/uix/Theme/ramp'
import { SETTING_DEFAULTS, SETTING_RANGES } from '@pommora/core/Settings/personalization'
import type { SteppedRange } from '@pommora/uix/Utilities/clamp'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { useSession, useSetting } from '../Session/store'
import { useExperimental } from './experimental'
import { AssetDirectoryRow } from './AssetDirectoryRow'
import { interfaceScaleOf } from './devicePrefs'
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
  '.settings-rail-list, .settings-section, .settings-heading, .trash-frame, .trash-head, .trash-head-name, .trash-head-date'

const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({
  kind: 'item',
  label: row.label,
  caption: row.hint,
  trailing,
})

export function SettingsWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.settingsOpen)
  const { mounted, closing } = useExitPresence(open, 'fast')
  if (!mounted) return null
  return <NexusSettingsBody closing={closing} />
}

function NexusSettingsBody({ closing }: { closing: boolean }): React.JSX.Element {
  const closeSettings = useSession((s) => s.closeSettings)
  const [category, setCategory] = useState<CategoryKey>('general')
  const geometry = useWindowGeometry('settings')
  const experimental = useExperimental()
  const shown = FRAMES.filter((l) => experimental || !l.experimental)
  // The gate can close from a sync merge or a hand-edited settings file while this window sits on a frame it hides.
  const active = shown.some((l) => l.key === category) ? category : 'general'

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
            <Menu className="settings-rail-list scroll-fade">
              {shown
                .filter((l) => !l.foot)
                .map((l) => (
                  <RailTab key={l.key} frame={l} active={active} onPick={setCategory} />
                ))}
            </Menu>
            {shown
              .filter((l) => l.foot)
              .map((l) => (
                <Menu key={l.key} className="settings-rail-foot">
                  <MenuSeparator />
                  <RailTab frame={l} active={active} onPick={setCategory} />
                </Menu>
              ))}
          </>
        ),
      }}
    >
      <FrameBody category={active} />
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
    <div className="window-body settings-body scroll-fade">
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
    case 'deviceZoom':
      return <DeviceZoomRow row={row} />
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
  const value = useSetting(row.key)
  const setPersonalization = useSession((s) => s.setPersonalization)

  const { name, css } = resolveColor(
    value === SETTING_DEFAULTS[row.key] ? undefined : value,
    row.clearedVar,
  )

  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'color',
        label: row.label,
        selected: name,
        css,
        greyscale: row.greyscale,
        onPick: (next) => setPersonalization(row.key, next as never),
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
  const on = useSetting(row.key)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return switchRow(row, on, (next) => setPersonalization(row.key, next))
}

function DeviceRow({ row }: { row: RowOf<'device'> }): React.JSX.Element {
  const on = useSession((s) => s.devicePrefs[row.key] ?? false)
  const setDevicePref = useSession((s) => s.setDevicePref)
  return switchRow(row, on, (next) => setDevicePref(row.key, next || undefined))
}

const zoomRow = (
  row: RowOf<'zoom' | 'deviceZoom'>,
  range: SteppedRange,
  value: number,
  onPick: (next: number) => void,
): React.JSX.Element => (
  <MenuRowView
    row={settingsRow(row, {
      kind: 'picker',
      ariaLabel: row.label,
      ...steppedPickerProps({ range, value, unit: row.unit ?? PERCENT, onPick }),
    })}
  />
)

function ZoomRow({ row }: { row: RowOf<'zoom'> }): React.JSX.Element {
  const value = useSetting(row.key)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return zoomRow(row, SETTING_RANGES[row.key], value, (next) => setPersonalization(row.key, next))
}

function DeviceZoomRow({ row }: { row: RowOf<'deviceZoom'> }): React.JSX.Element {
  const value = useSession((s) => interfaceScaleOf(s.devicePrefs))
  const setDevicePref = useSession((s) => s.setDevicePref)
  return zoomRow(row, row.range, value, (next) =>
    setDevicePref(row.key, next === row.range.default ? undefined : next),
  )
}

function PickerControlRow({ row }: { row: RowOf<'picker'> }): React.JSX.Element {
  const value = useSetting(row.key)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'picker',
        ariaLabel: row.label,
        value,
        options: row.options,
        onPick: (v: typeof value) => setPersonalization(row.key, v),
      })}
    />
  )
}

function SliderRow({ row }: { row: RowOf<'slider'> }): React.JSX.Element {
  const value = useSetting(row.key)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'slider',
        value,
        min: row.min,
        max: row.max,
        step: row.step,
        ariaLabel: row.label,
        format: row.format,
        readoutClassName: pickerValue,
        onInput: (v) => applyPersonalizationKey(row.key, v),
        onCommit: (v) => setPersonalization(row.key, v),
      })}
    />
  )
}
