import { useState } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { DualSwitch } from '@pommora/uix/Controls/Switches/DualSwitch'
import { Menu, MenuItem, heading, headingCaps } from '@pommora/uix/Menus'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { WindowBase, WINDOW_BASE_PANEL } from '@pommora/uix/Windows/window-base'
import { SETTINGS_RAIL, SETTINGS_WIN } from '@pommora/uix/Windows/bounds'
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
          className="panes-window"
          left={{
            windowId: 'showcase-settings-rail',
            bounds: SETTINGS_RAIL,
            mode: 'inflow',
            open: railOpen,
            className: 'panes-rail',
            children: (
              <Menu className="panes-rail-list over-scroll">
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
            className: 'panes-rail',
            children: (
              <div className="window-body panes-body panes-inspector">
                <h3 className={cx(heading, headingCaps)}>Inspector</h3>
                <span className={cx(text.body.standard, 'panes-dim')}>dateFormat</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Full Date</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Nexus-wide</span>
              </div>
            ),
          }}
        >
          <div className="window-body panes-body over-scroll">
            <h2 className={cx('panes-heading', text.headline.emphasized)}>General</h2>
            <div className="panes-section">
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
