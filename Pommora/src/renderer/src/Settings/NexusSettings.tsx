import { useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { Slider } from '@renderer/design-system/components/Slider/Slider'
import { PreviewPane } from '@renderer/design-system/components/PreviewPane/PreviewPane'
import { Reveal } from '@renderer/design-system/components/Reveal'
import { PickerControl, type PickerChoice } from '@renderer/Components/Detail/PickerControl'
import { LINK_FORMAT_OPTIONS } from '@renderer/Components/Detail/LinkFormat'
import { DEFAULT_LINK_DISPLAY, type LinkDisplay } from '@shared/properties'
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

/** The personalization keys a given control can actually write. Without this a toggle row could name
 *  the linger, compile, and then render a number as an unchecked switch. */
type KeyOf<V> = {
  [K in keyof Personalization]-?: NonNullable<Personalization[K]> extends V ? K : never
}[keyof Personalization]

interface RowText {
  label: string
  hint: string
  /** Disclosed only while this boolean key is on. Every gating key so far is default-off, so the
   *  stored value is the whole answer; a default-on gate would have to say so. */
  when?: KeyOf<boolean>
}

/** A picker row, parameterized by the vocabulary it writes — a second one naming a different enum
 *  joins the union rather than widening this. */
type PickerRow<T extends string> = RowText & {
  kind: 'picker'
  key: KeyOf<T>
  options: PickerChoice<T>[]
  /** The value the picker shows when the key is absent, and the one that writes no key back. */
  fallback: T
}

/** A row in a leaf's section: the words, and the control that writes one key. */
type Row =
  | (RowText & {
      kind: 'toggle'
      key: KeyOf<boolean>
      /** Absent reads as ON for a few keys. */
      defaultOn?: boolean
    })
  | (RowText & {
      kind: 'slider'
      key: KeyOf<number>
      max: number
      format: (v: number) => string
    })
  | PickerRow<LinkDisplay>

/** What a leaf puts in the body. Most are a list of rows; a leaf may instead bring a surface,
 *  which owns its own layout, its own scroller and whatever state it fetches. */
type LeafBody =
  | { kind: 'rows'; rows: Row[] }
  | { kind: 'surface'; Body: () => React.JSX.Element }

const LEAVES: Record<CategoryKey, LeafBody> = {
  general: {
    kind: 'rows',
    rows: [
      {
        kind: 'toggle',
        key: 'hideChevrons',
        label: 'Hide Disclosure Chevrons',
        hint: "Collapse the sidebar's chevron gutter.",
      },
      {
        kind: 'toggle',
        key: 'outlinerLines',
        label: 'Outliner Lines',
        hint: 'Show indent rails on nested lists in the editor.',
      },
      {
        kind: 'toggle',
        key: 'navCloseOnSelect',
        label: 'Close Navigation On Select',
        hint: 'Picking an entity dismisses the Navigation window.',
        defaultOn: true,
      },
      {
        kind: 'toggle',
        key: 'connectionsOpenInPreview',
        label: 'Open Connections In Preview',
        hint: 'A [[Connection]] click opens the preview window instead of navigating.',
      },
      {
        kind: 'toggle',
        key: 'revealTabBarOnHover',
        label: 'Reveal Tab Bar On Hover',
        hint: 'Keep the tab bar hidden until the pointer nears it.',
      },
      {
        kind: 'toggle',
        key: 'permanentDelete',
        label: 'Permanently Delete Files',
        hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
      },
    ],
  },
  pages: {
    kind: 'rows',
    rows: [
      {
        kind: 'toggle',
        key: 'codeblockLineCount',
        label: 'Show Line Count In Code Blocks',
        hint: "Number a codeblock's lines — display chrome, never editable text.",
      },
      {
        kind: 'toggle',
        key: 'removeTitleOnLinkChange',
        label: 'Remove Title On Link Change',
        hint: 'Pointing a connection at another page drops the alias it was wearing.',
        defaultOn: true,
      },
      // `aliasPickerOnCommit` belongs here and is deliberately absent: this is intentionally invisible
      // because the language used to describe the toggle on the settings surface hasn't been decided
      // yet — do this sooner rather than later. It reads and writes like any other personalization key
      // in the meantime, so a hand-edited settings file turns it off.
      {
        kind: 'toggle',
        key: 'autoFormatPastedLinks',
        label: 'Automatically Format Pasted Links',
        hint: 'Write a pasted address as a link instead of plain text.',
      },
      {
        kind: 'picker',
        key: 'defaultLinkFormat',
        label: 'Default Format',
        hint: 'How a pasted link reads.',
        when: 'autoFormatPastedLinks',
        fallback: DEFAULT_LINK_DISPLAY,
        options: LINK_FORMAT_OPTIONS,
      },
      {
        kind: 'toggle',
        key: 'pasteLinkIntoText',
        label: 'Paste Link Into Text',
        hint: 'Pasting an address over selected text turns that text into the link, instead of replacing it.',
      },
      {
        kind: 'slider',
        key: 'hoverPreviewLinger',
        label: 'Hover Preview Linger',
        hint: "How long a connection's hover preview stays open after hovering off.",
        max: HOVER_LINGER_MAX,
        format: (v) => (v === 0 ? 'None' : `${v}s`),
      },
    ],
  },
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

/** A row leaf brings the panel's own heading and rhythm; a surface leaf brings everything,
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
        {leaf.rows.map((row) => (
          <LeafRow key={row.key} row={row} />
        ))}
      </div>
    </div>
  )
}

/** The words every row wears, whatever writes beside them. */
function SettingsRow({
  label,
  hint,
  children,
}: RowText & { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className={cx('settings-row-label', text.body.standard)}>{label}</span>
        <span className={cx('settings-row-hint', text.footnote.standard)}>{hint}</span>
      </div>
      {children}
    </div>
  )
}

function LeafRow({ row }: { row: Row }): React.JSX.Element {
  const gate = row.when
  const disclosed = useSession((s) => (gate ? s.personalization[gate] === true : true))
  const body = <RowControl row={row} />
  // A dependent row folds rather than vanishing, and Reveal keeps its subtree out of the DOM while
  // collapsed — so a hidden picker holds no store subscription.
  return gate ? (
    <Reveal open={disclosed} fill>
      {body}
    </Reveal>
  ) : (
    body
  )
}

function RowControl({ row }: { row: Row }): React.JSX.Element {
  switch (row.kind) {
    case 'toggle':
      return <ToggleRow row={row} />
    case 'slider':
      return <SliderRow row={row} />
    case 'picker':
      return <PickerRow row={row} />
  }
}

function ToggleRow({ row }: { row: Extract<Row, { kind: 'toggle' }> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  const on = value ?? row.defaultOn ?? false

  return (
    <SettingsRow label={row.label} hint={row.hint}>
      <Switch
        checked={on}
        ariaLabel={row.label}
        // Stores only the OFF state — an untouched nexus keeps a clean file (no-empties discipline).
        onChange={(next) => setPersonalization(row.key, row.defaultOn && next ? undefined : next)}
      />
    </SettingsRow>
  )
}

function PickerRow({ row }: { row: Extract<Row, { kind: 'picker' }> }): React.JSX.Element {
  const stored = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <SettingsRow label={row.label} hint={row.hint}>
      <PickerControl
        ariaLabel={row.label}
        value={stored ?? row.fallback}
        options={row.options}
        // The default stores no key — the clean-file discipline every row follows.
        onPick={(v) => setPersonalization(row.key, v === row.fallback ? undefined : v)}
      />
    </SettingsRow>
  )
}

function SliderRow({ row }: { row: Extract<Row, { kind: 'slider' }> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key] ?? 0)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <SettingsRow label={row.label} hint={row.hint}>
      <Slider
        value={value}
        min={0}
        max={row.max}
        step={1}
        ariaLabel={row.label}
        format={row.format}
        // Zero stores no key — the clean-file discipline every default-valued row follows.
        onCommit={(v) => setPersonalization(row.key, v > 0 ? Math.round(v) : undefined)}
      />
    </SettingsRow>
  )
}
