import { useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { Icon } from '@renderer/design-system/symbols'
import { text } from '@renderer/design-system/tokens'
import { Switch } from '@renderer/design-system/components/Switches/Switch'
import { Slider } from '@renderer/design-system/components/Slider/Slider'
import { PreviewPane } from '@renderer/design-system/components/PreviewPane/PreviewPane'
import type { FloatingBounds } from '@renderer/design-system/interactions/FloatingWindow'
import type { SidePaneBounds } from '@renderer/design-system/components/SidePane/SidePane'
import type { DevicePrefs } from '@shared/devicePrefs'
import { PickerControl, type PickerChoice } from '@renderer/Components/Detail/PickerControl'
import { value as pickerValue } from '@renderer/Components/Detail/pickerControl.css'
import { EditableInput } from '@renderer/Components/EditableInput'
import { ColorSwatchField } from '@renderer/Components/Detail/ColorPicker'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { solidColorCss } from '@renderer/Detail/Views/Table/solidColor'
import { LINK_FORMAT_OPTIONS } from '@renderer/Components/Detail/LinkFormat'
import { DEFAULT_LINK_DISPLAY, type LinkDisplay } from '@shared/properties'
import {
  DEFAULT_TIME_FORMAT,
  HOVER_LINGER_MAX,
  TIME_FORMAT_LABELS,
  TIME_FORMAT_SETTINGS,
  EMBED_SCALE_DEFAULT,
  SCALE_STEPS,
  WEB_ZOOM_DEFAULT,
  coerceScale,
  type ColorSetting,
  type Personalization,
  type PickerSelection,
  type TimeFormatSetting,
} from '@shared/types'
import { DATE_FORMAT_LABELS, DATE_FORMATS, type DateFormat } from '@shared/columnStyles'
import { useExitPresence } from '../design-system/useExitPresence'
import { useSession } from '../store'
import { TrashLeaf } from './TrashLeaf'
import { SettingsRow, type RowText } from './SettingsRow'
import './nexusSettings.css'

// KNOB — the window's opening size and its resize floor. The floor is what a leaf carrying a
// surface has to fit in: a title, a breadcrumb and the date lane, side by side. Exported so the
// showcase's replica wears the real shell instead of a copy of its numbers.
export const SETTINGS_WIN: FloatingBounds = { minW: 620, minH: 420, defW: 850, defH: 600 }
export const SETTINGS_RAIL: SidePaneBounds = { min: 130, def: 170, max: 240 }

// Matched against the press target itself, so a row, a control or a list never arms a window move.
// A leaf carrying a surface brings its own chrome, and that chrome drags the window as a toggle
// panel's body does — its list and its empty state deliberately do not.
const DRAG_SURFACES =
  '.settings-body, .settings-rail-list, .settings-section, .settings-heading, .trash-leaf, .trash-head, .trash-head-name, .trash-head-date'

/** The personalization keys a given control can actually write. Without this a toggle row could name
 *  the linger, compile, and then render a number as an unchecked switch. */
type KeyOf<V> = {
  [K in keyof Personalization]-?: NonNullable<Personalization[K]> extends V ? K : never
}[keyof Personalization]

/** A picker row, parameterized by the vocabulary it writes — a second one naming a different enum
 *  joins the union rather than widening this. */
type PickerRow<T extends string> = RowText & {
  kind: 'picker'
  key: KeyOf<T>
  options: readonly PickerChoice<T>[]
  /** The value the picker shows when the key is absent, and the one that writes no key back. */
  fallback: T
}

/** Every sentinel a color setting can defer to. Keeping it a closed union is what stops a color row
 *  from naming an unrelated string key — `ColorSetting<string>` widens to plain `string`. */
type InheritSentinel = 'system' | 'accent'

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
  | (RowText & {
      kind: 'device'
      key: keyof DevicePrefs
    })
  | (RowText & {
      kind: 'color'
      key: KeyOf<ColorSetting<InheritSentinel>>
      /** Written when the user clears the swatch — the sentinel naming what this color inherits. */
      inherits: InheritSentinel
      /** The CSS var the cleared state resolves to, so the swatch shows what it is actually wearing. */
      inheritsVar: string
    })
  | PickerRow<LinkDisplay>
  | PickerRow<DateFormat>
  | PickerRow<TimeFormatSetting>
  | PickerRow<PickerSelection>
  | (RowText & {
      /** A scale factor offered through the percent vocabulary, stepping the shared ramp. */
      kind: 'zoom'
      key: KeyOf<number>
      /** The factor the control clears back to — stored as no key at all. */
      fallback: number
    })

type RowOf<K extends Row['kind']> = Extract<Row, { kind: K }>

/** A named group of rows inside a leaf. A section with no title renders as a plain list, which is
 *  what a leaf holding a single group wants; a titled one is how a leaf stays legible as it fills. */
interface Section {
  title?: string
  rows: readonly Row[]
}

/** One panel: how the rail names it and what fills it. New panels register here and nowhere else —
 *  the rail reads this roster rather than a second list keyed by the same name. A leaf fills with
 *  sections of rows, or brings a `Surface` that owns its own layout, scroller and fetched state —
 *  never both — the `never` on each arm is what makes a leaf naming both fail to compile. */
type Leaf = {
  key: string
  label: string
  icon: string
  /** Sits below the rail's separator rather than in the scrolling list. */
  foot?: boolean
} & (
  | { sections: readonly Section[]; Surface?: never }
  | { Surface: () => React.JSX.Element; sections?: never }
)

const pickerSelectionOptions: readonly PickerChoice<PickerSelection>[] = [
  { value: 'outlined', label: 'Outlined' },
  { value: 'checked', label: 'Checked' },
]

const dateFormatOptions: readonly PickerChoice<DateFormat>[] = DATE_FORMATS.map((value) => ({
  value,
  label: DATE_FORMAT_LABELS[value],
}))
const timeFormatOptions: readonly PickerChoice<TimeFormatSetting>[] = TIME_FORMAT_SETTINGS.map(
  (value) => ({ value, label: TIME_FORMAT_LABELS[value] }),
)

/** Keeps the rail's keys literal while reading every leaf back as the wider `Leaf` — so an untitled
 *  section still has a `title` to ask about, and a leaf that declares no foot still has one to test. */
const roster = <const T extends readonly Leaf[]>(
  leaves: T,
): readonly (Leaf & { key: T[number]['key'] })[] => leaves

const LEAVES = roster([
  {
    key: 'general',
    label: 'General',
    icon: 'cog',
    sections: [
      {
        rows: [
          {
            kind: 'picker',
            key: 'dateFormat',
            label: 'Date Format',
            hint: 'How a date reads wherever a column has not chosen its own form.',
            fallback: 'full',
            options: dateFormatOptions,
          },
          {
            kind: 'picker',
            key: 'timeFormat',
            label: 'Time Format',
            hint: "The nexus's clock — twelve-hour segments or a flat twenty-four-hour time.",
            fallback: DEFAULT_TIME_FORMAT,
            options: timeFormatOptions,
          },
        ],
      },
    ],
  },
  {
    key: 'interface',
    label: 'Interface',
    icon: 'laptop',
    sections: [
      {
        rows: [
          {
            kind: 'toggle',
            key: 'hideChevrons',
            label: 'Hide Disclosure Chevrons',
            hint: "Collapse the sidebar's chevron gutter.",
          },
          {
            kind: 'toggle',
            key: 'revealTabBarOnHover',
            label: 'Reveal Tab Bar On Hover',
            hint: 'Keep the tab bar hidden until the pointer nears it.',
          },
          {
            kind: 'device',
            key: 'nativeMenus',
            label: 'Use Native Menus',
            hint: 'Menus that are plain lists open as system menus. Belongs to this computer rather than to the nexus.',
          },
          {
            kind: 'picker',
            key: 'pickerSelection',
            label: 'Show Selection In Pickers As',
            hint: 'How every picker marks the row you are on.',
            fallback: 'outlined',
            options: pickerSelectionOptions,
          },
          {
            kind: 'zoom',
            key: 'embedScale',
            label: 'Embed Scale',
            hint: "The scale embedded pages and views start at; a block's own toggle compounds it.",
            fallback: EMBED_SCALE_DEFAULT,
          },
        ],
      },
      {
        title: 'Webpages',
        rows: [
          {
            kind: 'toggle',
            key: 'openLinksInApp',
            label: 'Open Links In Pommora',
            hint: 'External links open the floating browser instead of the system one.',
          },
          {
            kind: 'zoom',
            key: 'webZoomFactor',
            label: 'Webpage Zoom',
            hint: 'How embedded webpages scale, relative to the window.',
            fallback: WEB_ZOOM_DEFAULT,
          },
        ],
      },
    ],
  },
  {
    key: 'navigation',
    label: 'Navigation',
    icon: 'map',
    sections: [
      {
        rows: [
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
            kind: 'slider',
            key: 'hoverPreviewLinger',
            label: 'Hover Preview Linger',
            hint: "How long a connection's hover preview stays open after hovering off.",
            max: HOVER_LINGER_MAX,
            format: (v: number) => (v === 0 ? 'None' : `${v}s`),
          },
        ],
      },
    ],
  },
  {
    key: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    sections: [
      {
        title: 'Color',
        rows: [
          {
            kind: 'color',
            key: 'accent',
            label: 'Accent Color',
            hint: 'The color every accented surface derives from. Cleared follows the system accent.',
            inherits: 'system',
            inheritsVar: 'var(--system-accent)',
          },
          {
            kind: 'color',
            key: 'connectionColor',
            label: 'Internal Link Color',
            hint: 'Connections to other pages. Cleared follows the accent.',
            inherits: 'accent',
            inheritsVar: 'var(--accent)',
          },
          {
            kind: 'color',
            key: 'externalLinkColor',
            label: 'External Link Color',
            hint: 'Links out to the web. Cleared follows the system accent.',
            inherits: 'system',
            inheritsVar: 'var(--system-accent)',
          },
        ],
      },
    ],
  },
  {
    key: 'files',
    label: 'Files & Links',
    icon: 'folder-tree',
    sections: [
      {
        title: 'Pasted Links',
        rows: [
          {
            kind: 'picker',
            key: 'defaultLinkFormat',
            label: 'Default Format',
            hint: 'How a pasted link reads.',
            fallback: DEFAULT_LINK_DISPLAY,
            options: LINK_FORMAT_OPTIONS,
          },
          {
            kind: 'toggle',
            key: 'pasteLinkIntoText',
            label: 'Paste Link Into Text',
            hint: 'Pasting an address over selected text turns that text into the link, instead of replacing it.',
          },
        ],
      },
      {
        title: 'Connections',
        rows: [
          {
            kind: 'toggle',
            key: 'removeTitleOnLinkChange',
            label: 'Remove Title On Link Change',
            hint: 'Pointing a connection at another page drops the alias it was wearing.',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'aliasPickerOnCommit',
            label: 'Automatically Suggest Existing Aliases When Linking A Page',
            hint: 'Accepting a page from the connection picker offers the names it already carries.',
            defaultOn: true,
          },
        ],
      },
      {
        title: 'Deletion',
        rows: [
          {
            kind: 'toggle',
            key: 'permanentDelete',
            label: 'Permanently Delete Files',
            hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
          },
        ],
      },
    ],
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: 'server',
    sections: [],
  },
  {
    key: 'pages',
    label: 'Pages & Editor',
    icon: 'file-pen',
    sections: [
      {
        rows: [
          {
            kind: 'toggle',
            key: 'codeblockLineCount',
            label: 'Show Line Count In Code Blocks',
            hint: "Number a codeblock's lines — display chrome, never editable text.",
          },
          {
            kind: 'toggle',
            key: 'outlinerLines',
            label: 'Outliner Lines',
            hint: 'Show indent rails on nested lists in the editor.',
          },
        ],
      },
      {
        title: 'Footnotes',
        rows: [
          {
            kind: 'toggle',
            key: 'citationsShown',
            label: 'Show Footnotes By Default',
            hint: 'Open a page with its footnotes section showing. Each page can be set on its own.',
          },
          {
            kind: 'toggle',
            key: 'jumpToCitation',
            label: 'Jump To Citation On Creation',
            hint: 'Writing a footnote carries the caret down to the citation it just made.',
            defaultOn: true,
          },
        ],
      },
    ],
  },
  {
    key: 'automations',
    label: 'Automations',
    icon: 'zap',
    sections: [],
  },
  {
    key: 'shortcuts',
    label: 'Shortcuts',
    icon: 'command',
    sections: [],
  },
  {
    key: 'trash',
    label: 'Trash',
    icon: 'trash',
    // Anchored: the rail's list takes the height, so the foot sits at the bottom for free.
    foot: true,
    Surface: TrashLeaf,
  },
])

type CategoryKey = (typeof LEAVES)[number]['key']

const leafFor = (key: CategoryKey): Leaf => LEAVES.find((l) => l.key === key) ?? LEAVES[0]

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
      bounds={SETTINGS_WIN}
      dragSurfaces={DRAG_SURFACES}
      toolbar="floating"
      className="settings-window"
      ariaLabel="Settings"
      left={{
        windowId: 'settings-rail',
        bounds: SETTINGS_RAIL,
        mode: 'inflow',
        className: 'settings-rail',
        children: (
          <>
            <div
              className="settings-rail-list edge-fade"
              role="tablist"
              aria-label="Settings categories"
            >
              {LEAVES.filter((l) => !l.foot).map((l) => (
                <RailTab key={l.key} leaf={l} active={category} onPick={setCategory} />
              ))}
            </div>
            {LEAVES.filter((l) => l.foot).map((l) => (
              <div key={l.key} className="settings-rail-foot">
                <RailTab leaf={l} active={category} onPick={setCategory} />
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
  leaf,
  active,
  onPick,
}: {
  leaf: (typeof LEAVES)[number]
  active: CategoryKey
  onPick: (key: CategoryKey) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === leaf.key}
      className={cx('settings-cat', text.body.standard, active === leaf.key && 'is-active')}
      onClick={() => onPick(leaf.key)}
    >
      <Icon name={leaf.icon} size="body" />
      <span>{leaf.label}</span>
    </button>
  )
}

/** A sections leaf brings the panel's own heading and rhythm; a surface leaf brings everything,
 *  because the pane hands its children no wrapper, no padding and no scroller. */
function LeafBodyView({ category }: { category: CategoryKey }): React.JSX.Element {
  const leaf = leafFor(category)
  if (leaf.Surface) return <leaf.Surface />
  const { sections } = leaf
  return (
    <div className="settings-body edge-fade">
      <h2 className={cx('settings-heading', text.title3.emphasized)}>
        <Icon name={leaf.icon} className="settings-heading-icon" />
        {leaf.label}
      </h2>
      {sections.length === 0 ? (
        <p className={cx('settings-empty', text.body.standard)}>Nothing to set here yet.</p>
      ) : (
        sections.map((section, i) => (
          <div key={section.title ?? i} className="settings-section">
            {section.title && (
              <h3 className={cx('settings-section-title', text.footnote.emphasized)}>
                {section.title}
              </h3>
            )}
            {section.rows.map((row) => (
              <RowControl key={row.key} row={row} />
            ))}
          </div>
        ))
      )}
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
      return <PickerRow row={row} />
    case 'zoom':
      return <ZoomRow row={row} />
    case 'device':
      return <DeviceRow row={row} />
    case 'color':
      return <ColorRow row={row} />
  }
}

/** A color row: the ramp grid, minus its greyscale families — a link or the accent painted from the
 *  window substrate would be invisible against it. Clearing the swatch writes the row's own
 *  inheritance sentinel rather than deleting the key, since absent and "follow the OS" differ. */
function ColorRow({ row }: { row: RowOf<'color'> }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key]) as string | undefined
  const setPersonalization = useSession((s) => s.setPersonalization)

  const inheriting = !value || value === row.inherits

  return (
    <SettingsRow label={row.label} hint={row.hint}>
      <ColorSwatchField
        label={row.label}
        selected={inheriting ? 'default' : chipColorFor(value)}
        css={inheriting ? row.inheritsVar : solidColorCss(value)}
        onPick={(next) => setPersonalization(row.key, (next ?? row.inherits) as never)}
      />
    </SettingsRow>
  )
}

function ToggleRow({ row }: { row: RowOf<'toggle'> }): React.JSX.Element {
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

/** A machine-local row — same switch, a different store. It writes to nexus.db rather than to the
 *  nexus's own personalization, so one nexus can read differently on a different computer. */
function DeviceRow({ row }: { row: RowOf<'device'> }): React.JSX.Element {
  const on = useSession((s) => s.devicePrefs[row.key] ?? false)
  const setDevicePref = useSession((s) => s.setDevicePref)
  return (
    <SettingsRow label={row.label} hint={row.hint}>
      <Switch
        checked={on}
        ariaLabel={row.label}
        // Off stores no key — the clean-file discipline every row follows.
        onChange={(next) => setDevicePref(row.key, next || undefined)}
      />
    </SettingsRow>
  )
}

/** The web-guest scale through the shared picker: numeric factors worn as percents, with the steps
 *  as the offered set and any scale typeable on a second press. The default stores no key. */
const zoomPercent = (f: number): string => `${Math.round(f * 100)}%`
const zoomChoice = (f: number): PickerChoice<string> => ({
  value: String(f),
  label: zoomPercent(f),
})
const scaleChoices = SCALE_STEPS.map(zoomChoice)
function ZoomRow({ row }: { row: RowOf<'zoom'> }): React.JSX.Element {
  const stored = useSession((s) => s.personalization[row.key]) ?? row.fallback
  const setPersonalization = useSession((s) => s.setPersonalization)
  const [editing, setEditing] = useState(false)
  const commit = (factor: number): void =>
    setPersonalization(row.key, factor === row.fallback ? undefined : factor)
  // A typed scale keeps its own place among the steps, so the control reads the real value rather
  // than the step nearest it.
  const choices = SCALE_STEPS.some((f) => f === stored)
    ? scaleChoices
    : [...SCALE_STEPS, stored].sort((a, b) => a - b).map(zoomChoice)
  return (
    <SettingsRow label={row.label} hint={row.hint}>
      {editing ? (
        <EditableInput
          value={zoomPercent(stored)}
          className={pickerValue}
          caretAtEnd
          autoSize
          onCommit={(typed) => {
            const percent = Number.parseFloat(typed.replace('%', '').trim())
            if (Number.isFinite(percent)) commit(coerceScale(percent / 100, row.fallback))
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <PickerControl
          ariaLabel={row.label}
          value={String(stored)}
          options={choices}
          onPick={(v) => commit(Number(v))}
          onDoubleClick={() => setEditing(true)}
        />
      )}
    </SettingsRow>
  )
}

function PickerRow({ row }: { row: RowOf<'picker'> }): React.JSX.Element {
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

function SliderRow({ row }: { row: RowOf<'slider'> }): React.JSX.Element {
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
