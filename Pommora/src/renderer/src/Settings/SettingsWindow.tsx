import { useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { PreviewPane } from '@renderer/design-system/components/PreviewPane/PreviewPane'
import type { Personalization } from '@shared/types'
import { useExitPresence } from '../design-system/useExitPresence'
import { useSession } from '../store'
import './settingsWindow.css'

// KNOB — a settings sheet opens smaller than a content window, and its rail bounds.
const WIN = { minW: 460, minH: 340, defW: 720, defH: 520 }
const RAIL = { min: 130, def: 170, max: 240 }

// The bare backgrounds a window-move may start from, beyond the pane's own.
const DRAG_SURFACES = '.settings-body, .settings-rail-list, .settings-section, .settings-heading'

/** The category rail. One entry for now; the roster is where new panels register. */
const CATEGORIES = [{ key: 'general', label: 'General', icon: 'sliders-horizontal' }] as const
type CategoryKey = (typeof CATEGORIES)[number]['key']

/** A per-nexus boolean knob: label, the key it writes, and whether absent reads as on. */
interface Toggle {
  key: keyof Personalization
  label: string
  hint: string
  /** Absent means ON for a few keys (the default is the enabled behaviour). */
  defaultOn?: boolean
}

const GENERAL_TOGGLES: Toggle[] = [
  {
    key: 'hideChevrons',
    label: 'Hide Disclosure Chevrons',
    hint: "Collapse the sidebar's chevron gutter.",
  },
  {
    key: 'outlinerLines',
    label: 'Outliner Lines',
    hint: 'Show indent rails on nested lists in the editor.',
  },
  {
    key: 'navCloseOnSelect',
    label: 'Close Navigation On Select',
    hint: 'Picking an entity dismisses the Navigation window.',
    defaultOn: true,
  },
  {
    key: 'connectionsOpenInPreview',
    label: 'Open Connections In Preview',
    hint: 'A [[Connection]] click opens the preview window instead of navigating.',
  },
  {
    key: 'revealTabBarOnHover',
    label: 'Reveal Tab Bar On Hover',
    hint: 'Keep the tab bar hidden until the pointer nears it.',
  },
]

export function SettingsWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.settingsOpen)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <SettingsWindowBody closing={closing} />
}

function SettingsWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const closeSettings = useSession((s) => s.closeSettings)
  const [category, setCategory] = useState<CategoryKey>('general')

  return (
    <PreviewPane
      id="settings"
      closing={closing}
      onClose={closeSettings}
      bounds={WIN}
      dragSurfaces={DRAG_SURFACES}
      // No toolbar band: the category rail runs the window's full height, so only the × sits above it.
      toolbar="floating"
      className="settings-window"
      ariaLabel="Settings"
      tintOpacity={90}
      left={{
        windowId: 'settings-rail',
        bounds: RAIL,
        mode: 'inflow',
        className: 'settings-rail',
        children: (
          <div
            className="settings-rail-list edge-fade"
            role="tablist"
            aria-label="Settings categories"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={category === c.key}
                className={cx(
                  'settings-cat',
                  text.body.standard,
                  category === c.key && 'is-active',
                )}
                onClick={() => setCategory(c.key)}
              >
                <Icon name={c.icon} size={14} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        ),
      }}
    >
      <div className="settings-body edge-fade">
        <h2 className={cx('settings-heading', text.title3.emphasized)}>
          {CATEGORIES.find((c) => c.key === category)?.label}
        </h2>
        <div className="settings-section">
          {GENERAL_TOGGLES.map((t) => (
            <ToggleRow key={t.key} toggle={t} />
          ))}
        </div>
      </div>
    </PreviewPane>
  )
}

function ToggleRow({ toggle }: { toggle: Toggle }): React.JSX.Element {
  const value = useSession((s) => s.personalization[toggle.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  const on = value === undefined ? toggle.defaultOn === true : value === true

  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className={cx('settings-row-label', text.body.standard)}>{toggle.label}</span>
        <span className={cx('settings-row-hint', text.footnote.standard)}>{toggle.hint}</span>
      </div>
      <Switch
        checked={on}
        ariaLabel={toggle.label}
        // A knob whose default is ON stores only the OFF state, so an untouched nexus keeps a
        // clean settings file — the no-empties discipline the rest of the block follows.
        onChange={(next) =>
          setPersonalization(
            toggle.key,
            (toggle.defaultOn && next ? undefined : next) as Personalization[typeof toggle.key],
          )
        }
      />
    </div>
  )
}
