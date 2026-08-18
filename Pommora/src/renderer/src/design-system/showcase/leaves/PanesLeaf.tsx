import { useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import {
  PreviewPane,
  PREVIEW_PANE_INSPECTOR,
} from '@renderer/design-system/components/PreviewPane/PreviewPane'
import { SETTINGS_RAIL, SETTINGS_WIN } from '@renderer/Settings/NexusSettings'
import '@renderer/Settings/nexusSettings.css'
import './panesLeaf.css'

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

/** Both sides in flow at once on the real Settings shell — the rail it ships with, and the
 *  inspector a filling settings surface will want beside it. Opening a side widens the window by
 *  that pane's width, so the panel between them holds the width it had. */
export function PanesLeaf(): React.JSX.Element {
  const [railOpen, setRailOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  return (
    <div className="panes-leaf">
      <div className="panes-knobs">
        <span className="panes-knob">
          <Switch checked={railOpen} ariaLabel="Left pane" onChange={setRailOpen} />
          <span className={text.body.standard}>Category rail</span>
        </span>
        <span className="panes-knob">
          <Switch checked={inspectorOpen} ariaLabel="Right pane" onChange={setInspectorOpen} />
          <span className={text.body.standard}>Inspector</span>
        </span>
      </div>

      <div className="panes-stage">
        <PreviewPane
          id="showcase-settings"
          closing={false}
          onClose={() => undefined}
          bounds={SETTINGS_WIN}
          ariaLabel="Settings"
          toolbar="floating"
          className="settings-window"
          left={{
            windowId: 'showcase-settings-rail',
            bounds: SETTINGS_RAIL,
            mode: 'inflow',
            open: railOpen,
            className: 'settings-rail',
            children: (
              <div className="settings-rail-list edge-fade">
                {CATEGORIES.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cx('settings-cat', text.body.standard, i === 0 && 'is-active')}
                  >
                    <Icon name={c.icon} size={14} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            ),
          }}
          right={{
            windowId: 'showcase-settings-inspector',
            bounds: PREVIEW_PANE_INSPECTOR,
            mode: 'inflow',
            open: inspectorOpen,
            className: 'settings-rail',
            children: (
              <div className="settings-body panes-inspector">
                <h3 className={cx('settings-section-title', text.footnote.emphasized)}>
                  Inspector
                </h3>
                <span className={cx(text.body.standard, 'panes-dim')}>dateFormat</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Full Date</span>
                <span className={cx(text.body.standard, 'panes-dim')}>Nexus-wide</span>
              </div>
            ),
          }}
        >
          <div className="settings-body edge-fade">
            <h2 className={cx('settings-heading', text.title3.emphasized)}>General</h2>
            <div className="settings-section">
              {ROWS.map(([label, hint]) => (
                <div key={label} className="settings-row">
                  <div className="settings-row-text">
                    <span className={cx('settings-row-label', text.body.standard)}>{label}</span>
                    <span className={cx('settings-row-hint', text.footnote.standard)}>{hint}</span>
                  </div>
                  <span className={cx('settings-row-hint', text.body.standard)}>Full Date</span>
                </div>
              ))}
            </div>
          </div>
        </PreviewPane>
      </div>
    </div>
  )
}
