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
import { TrashLeaf } from './TrashLeaf'
import './nexusSettings.css'

// KNOB — the window's opening size and its resize floor. The floor is what a leaf carrying a
// surface has to fit in: a title, a breadcrumb and the date lane, side by side.
const WIN = { minW: 620, minH: 420, defW: 850, defH: 600 }
const RAIL = { min: 130, def: 170, max: 240 }

// Matched against the press target itself, so a row, a control or a list never arms a window move.
// A leaf carrying a surface brings its own chrome, and that chrome drags the window as a toggle
// panel's body does — its list and its empty state deliberately do not.
const DRAG_SURFACES =
  '.settings-body, .settings-rail-list, .settings-section, .settings-heading, .trash-leaf, .trash-head, .trash-head-name, .trash-head-date'

/** New panels register here. A leaf is either a list of personalization toggles or a surface of
 *  its own — a component rather than a render call, so its hooks belong to the leaf and not to
 *  this host, which is what lets one hold fetched rows and a selection. */
const CATEGORIES = [
  { key: 'general', label: 'General', icon: 'sliders-horizontal' },
  { key: 'pages', label: 'Pages', icon: 'file-text' },
  // Anchored: the rail's list takes the height, so a sibling appended after it sinks to the foot.
  { key: 'trash', label: 'Trash', icon: 'trash', anchored: true },
] as const
type CategoryKey = (typeof CATEGORIES)[number]['key']

interface Toggle {
  key: keyof Personalization
  label: string
  hint: string
  /** Absent reads as ON for a few keys. */
  defaultOn?: boolean
}

/** What a leaf puts in the body. Most are a list of toggles; a leaf may instead bring a surface,
 *  which owns its own layout, its own scroller and whatever state it fetches. */
type LeafBody =
  | { kind: 'toggles'; toggles: Toggle[] }
  | { kind: 'surface'; Body: () => React.JSX.Element }

const LEAVES: Record<CategoryKey, LeafBody> = {
  general: { kind: 'toggles', toggles: [
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
    {
      key: 'permanentDelete',
      label: 'Permanently Delete Files',
      hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
    },
  ] },
  pages: { kind: 'toggles', toggles: [
    {
      key: 'codeblockLineCount',
      label: 'Show Line Count In Code Blocks',
      hint: "Number a codeblock's lines — display chrome, never editable text.",
    },
    {
      key: 'removeTitleOnLinkChange',
      label: 'Remove Title On Link Change',
      hint: 'Pointing a connection at another page drops the alias it was wearing.',
      defaultOn: true,
    },
    // `aliasPickerOnCommit` belongs here and is deliberately absent: this is intentionally invisible
    // because the language used to describe the toggle on the settings surface hasn't been decided
    // yet — do this sooner rather than later. It reads and writes like any other personalization key
    // in the meantime, so a hand-edited settings file turns it off.
  ] },
  trash: { kind: 'surface', Body: TrashLeaf },
}

export function NexusSettings(): React.JSX.Element | null {
  const open = useSession((s) => s.settingsOpen)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <NexusSettingsBody closing={closing} />
}

function NexusSettingsBody({ closing }: { closing: boolean }): React.JSX.Element {
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
          <>
            <div
              className="settings-rail-list edge-fade"
              role="tablist"
              aria-label="Settings categories"
            >
              {CATEGORIES.filter((c) => !('anchored' in c)).map((c) => (
                <RailTab key={c.key} cat={c} active={category} onPick={setCategory} />
              ))}
            </div>
            {CATEGORIES.filter((c) => 'anchored' in c).map((c) => (
              <div key={c.key} className="settings-rail-foot">
                <RailTab cat={c} active={category} onPick={setCategory} />
              </div>
            ))}
          </>
        ),
      }}
    >
      <LeafBodyView category={category} />
    </PreviewPane>
  )
}

function RailTab({
  cat,
  active,
  onPick,
}: {
  cat: (typeof CATEGORIES)[number]
  active: CategoryKey
  onPick: (key: CategoryKey) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === cat.key}
      className={cx('settings-cat', text.body.standard, active === cat.key && 'is-active')}
      onClick={() => onPick(cat.key)}
    >
      <Icon name={cat.icon} size={14} />
      <span>{cat.label}</span>
    </button>
  )
}

/** A toggle leaf brings the panel's own heading and rhythm; a surface leaf brings everything,
 *  because the pane hands its children no wrapper, no padding and no scroller. */
function LeafBodyView({ category }: { category: CategoryKey }): React.JSX.Element {
  const leaf = LEAVES[category]
  if (leaf.kind === 'surface') return <leaf.Body />
  return (
    <div className="settings-body edge-fade">
      <h2 className={cx('settings-heading', text.title3.emphasized)}>
        {CATEGORIES.find((c) => c.key === category)?.label}
      </h2>
      <div className="settings-section">
        {leaf.toggles.map((t) => (
          <ToggleRow key={t.key} toggle={t} />
        ))}
        {category === 'pages' && <LingerRow />}
      </div>
    </div>
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
