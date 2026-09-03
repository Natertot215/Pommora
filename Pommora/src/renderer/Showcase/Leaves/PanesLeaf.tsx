import { useState } from 'react'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { DualSwitch } from '@renderer/DesignSystem/Controls/Switches/DualSwitch'
import { Menu, MenuItem, heading, headingCaps } from '@renderer/DesignSystem/Menus'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens'
import { WindowBase, WINDOW_BASE_PANEL } from '@renderer/Windows/window-base'
import { SETTINGS_RAIL, SETTINGS_WIN } from '@renderer/Settings/SettingsWindow'
import '@renderer/Settings/settings-window.css'
import './panes-leaf.css'

const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'cog' },
  { key: 'interface', label: 'Interface', icon: 'laptop' },
  { key: 'navigation', label: 'Navigation', icon: 'map' },
  { key: 'appearance', label: 'Appearance', icon: 'palette' },
  { key: 'files', label: 'Files & Links', icon: 'folder-tree' },
  { key: 'properties', label: 'Properties', icon: 'server' },
  { key: 'pages', label: 'Pages & Editor', icon: 'file-pen' },
  { key: 'automations', label: 'Automations', icon: 'zap' },
  { key: 'shortcuts', label: 'Shortcuts', icon: 'command' },
]

const ROWS = [
  ['Date Format', 'The date form every column without one of its own takes.'],
  ['Time Format', "The Nexus's clock, wherever a time renders."],
]

export function PanesLeaf(): React.JSX.Element {
  const [railOpen, setRailOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  return (
    <div className="panes-leaf">
      <div className="panes-knobs">
        <span className="panes-knob">
          <DualSwitch checked={railOpen} ariaLabel="Left pane" onChange={setRailOpen} />
          <span className={text.body.standard}>Category rail</span>
        </span>
        <span className="panes-knob">
          <DualSwitch checked={inspectorOpen} ariaLabel="Right pane" onChange={setInspectorOpen} />
          <span className={text.body.standard}>Inspector</span>
        </span>
      </div>

      <div className="panes-stage">
        <WindowBase
          id="showcase-settings"
          closing={false}
          onClose={() => undefined}
          bounds={SETTINGS_WIN}
          ariaLabel="Settings"
          className="settings-window"
          left={{
            windowId: 'showcase-settings-rail',
            bounds: SETTINGS_RAIL,
            mode: 'inflow',
            open: railOpen,
            className: 'settings-rail',
            children: (
              <Menu className="settings-rail-list over-scroll">
                {CATEGORIES.map((c, i) => (
                  <MenuItem
                    key={c.key}
                    selected={i === 0}
                    leading={<Icon name={c.icon} size="body" />}
                  >
                    {c.label}
                  </MenuItem>
                ))}
              </Menu>
            ),
          }}
          right={{
            windowId: 'showcase-settings-inspector',
            bounds: WINDOW_BASE_PANEL,
            mode: 'inflow',
            open: inspectorOpen,
            className: 'settings-rail',
            children: (
              <div className="window-body settings-body panes-inspector">
                <h3 className={cx(heading, headingCaps)}>Inspector</h3>
                <span className={cx(text.body.standard, 'panes-dim')}>dateFormat</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Full Date</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Nexus-wide</span>
              </div>
            ),
          }}
        >
          <div className="window-body settings-body over-scroll">
            <h2 className={cx('settings-heading', text.headline.emphasized)}>General</h2>
            <div className="settings-section">
              {ROWS.map(([label, hint]) => (
                <MenuItem key={label} subLabel={hint} detail="Full Date">
                  {label}
                </MenuItem>
              ))}
            </div>
          </div>
        </WindowBase>
      </div>
    </div>
  )
}
