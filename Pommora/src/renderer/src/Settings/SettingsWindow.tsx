import { useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { Slider } from '@renderer/design-system/components/Slider/Slider'
import { PreviewPane } from '@renderer/design-system/components/PreviewPane/PreviewPane'
import { HOVER_LINGER_MAX, type Personalization } from '@shared/types'
import { useExitPresence } from '../design-system/useExitPresence'
import { useSession } from '../store'
import './settingsWindow.css'

const WIN = { minW: 460, minH: 340, defW: 720, defH: 520 }
const RAIL = { min: 130, def: 170, max: 240 }

const DRAG_SURFACES = '.settings-body, .settings-rail-list, .settings-section, .settings-heading'

/** New panels register here, with their toggle list keyed alongside. */
const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'sliders-horizontal' },
  { key: 'pages', label: 'Pages', icon: 'file-text' },
] as const
type CategoryKey = (typeof CATEGORIES)[number]['key']

interface Toggle {
  key: keyof Personalization
  label: string
  hint: string
  /** Absent reads as ON for a few keys. */
  defaultOn?: boolean
}

const TOGGLES: Record<CategoryKey, Toggle[]> = {
  general: [
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
  ],
  pages: [
    {
      key: 'codeblockLineCount',
      label: 'Show Line Count In Code Blocks',
      hint: "Number a codeblock's lines — display chrome, never editable text.",
    },
  ],
}

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
          {TOGGLES[category].map((t) => (
            <ToggleRow key={t.key} toggle={t} />
          ))}
          {category === 'pages' && <LingerRow />}
        </div>
      </div>
    </PreviewPane>
  )
}

// A bespoke row rather than a row-kind union: the schema generalizes when a second non-toggle
// row exists to shape it.
function LingerRow(): React.JSX.Element {
  const value = useSession((s) => s.personalization.hoverPreviewLinger ?? 0)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className={cx('settings-row-label', text.body.standard)}>Hover Preview Linger</span>
        <span className={cx('settings-row-hint', text.footnote.standard)}>
          How long a connection's hover preview stays open after hovering off.
        </span>
      </div>
      <Slider
        value={value}
        min={0}
        max={HOVER_LINGER_MAX}
        step={1}
        ariaLabel="Hover Preview Linger"
        format={(v) => (v === 0 ? 'None' : `${v}s`)}
        // None stores no key — the clean-file discipline every default-valued row follows.
        onCommit={(v) => setPersonalization('hoverPreviewLinger', v > 0 ? Math.round(v) : undefined)}
      />
    </div>
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
        // Stores only the OFF state — an untouched nexus keeps a clean file (no-empties discipline).
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
