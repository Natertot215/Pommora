import { useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { Icon } from '@renderer/DesignSystem/Symbols'
import {
  Menu,
  MenuCaption,
  MenuItem,
  MenuRowView,
  MenuSeparator,
  type MenuRow,
  type Trailing,
} from '@renderer/DesignSystem/Menus'
import { text } from '@renderer/DesignSystem/Tokens'
import { WindowBase } from '@renderer/Windows/window-base'
import type { FloatingBounds } from '@renderer/DesignSystem/Interactions/FloatingWindow'
import type { SidePaneBounds } from '@renderer/DesignSystem/SidePane/SidePane'
import type { DevicePrefs } from '@shared/devicePrefs'
import { stepsWith, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { solidColorCss } from '@renderer/DesignSystem/Tokens/solidColor'
import { LINK_FORMAT_OPTIONS } from '@renderer/Properties/linkFormat'
import { DEFAULT_LINK_DISPLAY, type LinkDisplay } from '@shared/properties'
import {
  DEFAULT_TIME_FORMAT,
  HISTORY_DAY_STEPS,
  HISTORY_DAYS,
  HISTORY_INTERVAL,
  HISTORY_INTERVAL_STEPS,
  HOVER_LINGER_MAX,
  TIME_FORMAT_LABELS,
  TIME_FORMAT_SETTINGS,
  EDITOR_SCALE_DEFAULT,
  EMBED_SCALE_DEFAULT,
  SCALE_STEPS,
  INTERFACE_SCALE_DEFAULT,
  INTERFACE_SCALE_STEPS,
  WEB_ZOOM_DEFAULT,
  type ColorSetting,
  type Personalization,
  type PickerSelection,
  type TabOpenBehavior,
  type TimeFormatSetting,
} from '@shared/types'
import { DATE_FORMAT_LABELS, DATE_FORMATS, type DateFormat } from '@shared/columnStyles'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import { useSession } from '../store'
import { TrashFrame } from './TrashFrame'
import { AssetDirectoryRow } from './AssetDirectoryRow'
import { ExcludedDirectoriesRow } from './ExcludedDirectoriesRow'
import { ClearActionRow } from './ClearActionRow'
import { askClearExclusions, askClearHistory } from '@renderer/Windows/confirmations'
import './settings-window.css'

// KNOB — the window's opening size and its resize floor. The floor is what a frame carrying a
// surface has to fit in: a title, a breadcrumb and the date lane, side by side. Exported so the
// showcase's replica wears the real shell instead of a copy of its numbers.
export const SETTINGS_WIN: FloatingBounds = { minW: 620, minH: 420, defW: 850, defH: 600 }
export const SETTINGS_RAIL: SidePaneBounds = { min: 130, def: 170, max: 240 }

const DRAG_SURFACES =
  '.settings-body, .settings-rail-list, .settings-section, .settings-heading, .trash-frame, .trash-head, .trash-head-name, .trash-head-date'

type KeyOf<V> = {
  [K in keyof Personalization]-?: NonNullable<Personalization[K]> extends V ? K : never
}[keyof Personalization]

interface RowText {
  label: string
  hint?: string
  when?: (p: Personalization) => boolean
}

type PickerRow<T extends string> = RowText & {
  kind: 'picker'
  key: KeyOf<T>
  options: readonly PickerChoice<T>[]
  fallback: T
}

type InheritSentinel = 'system' | 'accent' | 'default'

type Row =
  | (RowText & {
      kind: 'toggle'
      key: KeyOf<boolean>
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
      kind: 'path'
    })
  | (RowText & {
      kind: 'exclusions'
    })
  | (RowText & {
      kind: 'clear'
      /** Asks, acts, and answers whether a clear ran — the row reads Cleared only then. */
      clear: () => Promise<boolean>
    })
  | (RowText & {
      kind: 'color'
      key: KeyOf<ColorSetting<InheritSentinel>>
      inherits: InheritSentinel
      inheritsVar: string
      greyscale?: boolean
    })
  | PickerRow<LinkDisplay>
  | PickerRow<DateFormat>
  | PickerRow<TimeFormatSetting>
  | PickerRow<PickerSelection>
  | PickerRow<TabOpenBehavior>
  | (RowText & {
      kind: 'zoom'
      key: KeyOf<number>
      fallback: number
      steps?: readonly number[]
      unit?: NumberUnit
    })

type RowOf<K extends Row['kind']> = Extract<Row, { kind: K }>

/** How a numeric row shows its stored value: `scale` turns the stored number into the shown one,
 *  and `suffix` follows the digits as written. */
type NumberUnit = { scale: number; suffix: string }
const PERCENT: NumberUnit = { scale: 100, suffix: '%' }
const DAYS: NumberUnit = { scale: 1, suffix: ' Days' }
const MINUTES: NumberUnit = { scale: 1, suffix: ' Min' }
const PIXELS: NumberUnit = { scale: 1, suffix: 'px' }

const clearExclusions = async (): Promise<boolean> => {
  const count = await window.nexus.countExclusions()
  if (!count.ok) {
    window.nexus.showError(count.error.message)
    return false
  }
  if (count.value === 0 || !(await askClearExclusions(count.value))) return false
  const r = await window.nexus.clearExclusions()
  if (!r.ok) window.nexus.showError(r.error.message)
  return r.ok && r.value !== null
}

const clearHistory = async (): Promise<boolean> => {
  if (!(await askClearHistory())) return false
  const r = await window.nexus.clearHistory()
  if (!r.ok) window.nexus.showError(r.error.message)
  return r.ok
}

const settingsRow = (row: RowText, trailing: Trailing, reveal?: boolean): MenuRow => ({
  kind: 'item',
  label: row.label,
  caption: row.hint,
  trailing,
  reveal,
})

interface Section {
  title?: string
  rows: readonly Row[]
}

type Frame = {
  key: string
  label: string
  icon: string
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

const roster = <const T extends readonly Frame[]>(
  leaves: T,
): readonly (Frame & { key: T[number]['key'] })[] => leaves

const FRAMES = roster([
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
            kind: 'toggle',
            key: 'nativeHighlight',
            label: 'Use Native Highlighting',
            hint: "Selected text uses the system's own highlight instead of Pommora's.",
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
            key: 'interfaceScale',
            label: 'Interface Scale',
            hint: 'The scaling factor applied to the entire interface; additional scaling preferences compound this value.',
            fallback: INTERFACE_SCALE_DEFAULT,
            steps: INTERFACE_SCALE_STEPS,
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
      {
        title: 'Tabs',
        rows: [
          {
            kind: 'picker',
            key: 'tabOpenBehavior',
            label: 'Default Opening Behavior',
            fallback: 'overtake',
            options: [
              { value: 'overtake', label: 'Overtake' },
              { value: 'newtab', label: 'New Tab' },
            ],
          },
          {
            kind: 'toggle',
            key: 'tabTakeFocus',
            label: 'Take Focus',
            defaultOn: true,
            when: (p) => p.tabOpenBehavior === 'newtab',
          },
          {
            kind: 'zoom',
            key: 'tabMinWidth',
            label: 'Minimum Tab Width',
            fallback: 70,
            steps: [50, 60, 70, 80, 90, 100],
            unit: PIXELS,
          },
          {
            kind: 'zoom',
            key: 'tabMaxWidth',
            label: 'Maximum Tab Width',
            fallback: 250,
            steps: [150, 175, 200, 225, 250, 275, 300, 325, 350],
            unit: PIXELS,
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
        title: 'Assets',
        rows: [
          {
            kind: 'path',
            label: 'Default Asset Directory',
            hint: 'Where inherited assets, images, and other file types will be stored.',
          },
        ],
      },
      {
        title: 'Exclusions',
        rows: [
          {
            kind: 'exclusions',
            label: 'Excluded Directories',
            hint: 'Excluded folders will not be recognized by the app; removing a folder from exclusion will re-index.',
          },
          {
            kind: 'clear',
            label: 'Clear Exclusion Cache',
            hint: 'Remove existing app data that may have been written onto previously indexed folders.',
            clear: clearExclusions,
          },
        ],
      },
      {
        title: 'Deletion',
        rows: [
          {
            kind: 'toggle',
            key: 'confirmDeletion',
            label: 'Confirm Before Deletion',
            defaultOn: true,
            hint: 'Ask before deleting a page, a block, or a folder that carries no schema. Collections, Sets, views and properties always ask.',
          },
          {
            kind: 'toggle',
            key: 'permanentDelete',
            label: 'Permanently Delete Files',
            hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
          },
        ],
      },
      {
        title: 'File History',
        rows: [
          {
            kind: 'toggle',
            key: 'fileHistory',
            label: 'File History',
            hint: 'Stores recoverable snapshots of device-local file history.',
            defaultOn: true,
          },
          {
            kind: 'zoom',
            key: 'historyDays',
            label: 'History Timeframe',
            hint: '',
            fallback: HISTORY_DAYS.default,
            steps: HISTORY_DAY_STEPS,
            unit: DAYS,
          },
          {
            kind: 'zoom',
            key: 'historyInterval',
            label: 'Snapshot Interval',
            hint: '',
            fallback: HISTORY_INTERVAL.default,
            steps: HISTORY_INTERVAL_STEPS,
            unit: MINUTES,
          },
          {
            kind: 'clear',
            label: 'Clear History',
            hint: 'Permanently delete stored snapshots for all files; this cannot be undone.',
            clear: clearHistory,
          },
        ],
      },
    ],
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: 'server',
    sections: [
      {
        title: 'Metadata',
        rows: [
          {
            kind: 'toggle',
            key: 'repairOnOpen',
            label: 'Repair Properties On Open',
            hint: 'Canonicalize drifted property and Context values on the pages changed since the last open.',
          },
          {
            kind: 'toggle',
            key: 'capitalizeMetadata',
            label: 'Capitalize All Metadata',
            hint: 'Present all Markdown frontmatter as capitalized; useful when working in a shared directory with specific metadata standards.',
          },
        ],
      },
    ],
  },
  {
    key: 'pages',
    label: 'Pages & Editor',
    icon: 'file-pen',
    sections: [
      {
        rows: [
          {
            kind: 'zoom',
            key: 'editorScale',
            label: 'Editor Scale',
            hint: 'How large a page reads — its text, its title, and the chrome around them. An embedded page keeps its own scale.',
            fallback: EDITOR_SCALE_DEFAULT,
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
        title: 'Highlights',
        rows: [
          {
            kind: 'color',
            key: 'highlightColor',
            label: 'Highlight Color',
            hint: 'The wash behind highlighted text. Cleared follows the accent.',
            inherits: 'accent',
            inheritsVar: 'var(--accent)',
          },
        ],
      },
      {
        title: 'Code',
        rows: [
          {
            kind: 'color',
            key: 'codeColor',
            label: 'Code Color',
            hint: 'Inline `code` and the wash behind it. Cleared reads red.',
            inherits: 'default',
            inheritsVar: 'var(--code)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'codeblockLineCount',
            label: 'Show Line Count In Code Blocks',
            hint: "Number a codeblock's lines — display chrome, never editable text.",
          },
        ],
      },
      {
        title: 'Checkboxes',
        rows: [
          {
            kind: 'color',
            key: 'checkboxColor',
            label: 'Checkbox Color',
            hint: 'The color a task checkbox fills and checks with. Cleared follows the accent.',
            inherits: 'accent',
            inheritsVar: 'var(--accent)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'muteCheckedItems',
            label: 'Mute Checked Items',
            hint: 'A checked task reads as done — its words dimmed and struck through.',
          },
        ],
      },
      {
        title: 'Links',
        rows: [
          {
            kind: 'toggle',
            key: 'plainUnresolvedLinks',
            label: 'Display Unresolved Links As Plain Syntax',
            hint: 'A link leading nowhere reads as the prose it is written as, instead of dimmed with its syntax showing.',
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
    foot: true,
    Surface: TrashFrame,
  },
])

type CategoryKey = (typeof FRAMES)[number]['key']

const frameFor = (key: CategoryKey): Frame => FRAMES.find((l) => l.key === key) ?? FRAMES[0]

export function SettingsWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.settingsOpen)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <NexusSettingsBody closing={closing} />
}

function NexusSettingsBody({ closing }: { closing: boolean }): React.JSX.Element {
  const closeSettings = useSession((s) => s.closeSettings)
  const [category, setCategory] = useState<CategoryKey>('general')

  return (
    <WindowBase
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
  const personalization = useSession((s) => s.personalization)
  const frame = frameFor(category)
  if (frame.Surface) return <frame.Surface />
  const { sections } = frame
  return (
    <div className="window-body settings-body over-scroll">
      <h2 className={cx('settings-heading', text.headline.emphasized)}>
        <Icon name={frame.icon} className="settings-heading-icon" />
        {frame.label}
      </h2>
      {sections.length === 0 ? (
        <MenuCaption>Nothing to set here yet.</MenuCaption>
      ) : (
        sections.map((section, i) => (
          <div key={section.title ?? i} className="settings-section">
            {section.title && (
              <MenuRowView row={{ kind: 'heading', label: section.title, caps: true }} />
            )}
            {section.rows.map((row) => (
              // Keyed on the label: the one row writing a top-level settings key has no
              // personalization key to be identified by, and a label is unique within a section.
              <RowControl key={row.label} row={row} reveal={row.when?.(personalization)} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}

function RowControl({ row, reveal }: { row: Row; reveal?: boolean }): React.JSX.Element {
  switch (row.kind) {
    case 'toggle':
      return <ToggleRow row={row} reveal={reveal} />
    case 'slider':
      return <SliderRow row={row} reveal={reveal} />
    case 'picker':
      return <PickerRow row={row} reveal={reveal} />
    case 'zoom':
      return <ZoomRow row={row} reveal={reveal} />
    case 'device':
      return <DeviceRow row={row} reveal={reveal} />
    case 'path':
      return <AssetDirectoryRow label={row.label} hint={row.hint} />
    case 'exclusions':
      return <ExcludedDirectoriesRow label={row.label} hint={row.hint} />
    case 'clear':
      return <ClearActionRow label={row.label} hint={row.hint} clear={row.clear} />
    case 'color':
      return <ColorRow row={row} reveal={reveal} />
  }
}

function ColorRow({ row, reveal }: { row: RowOf<'color'>; reveal?: boolean }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key]) as string | undefined
  const setPersonalization = useSession((s) => s.setPersonalization)

  const inheriting = !value || value === row.inherits

  return (
    <MenuRowView
      row={settingsRow(
        row,
        {
          kind: 'color',
          label: row.label,
          selected: inheriting ? 'default' : labelColorFor(value),
          css: inheriting ? row.inheritsVar : solidColorCss(value),
          greyscale: row.greyscale,
          onPick: (next) => setPersonalization(row.key, (next ?? row.inherits) as never),
        },
        reveal,
      )}
    />
  )
}

function ToggleRow({ row, reveal }: { row: RowOf<'toggle'>; reveal?: boolean }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  const on = value ?? row.defaultOn ?? false

  return (
    <MenuRowView
      row={settingsRow(
        row,
        {
          kind: 'switch',
          checked: on,
          ariaLabel: row.label,
          onChange: (next) => setPersonalization(row.key, row.defaultOn && next ? undefined : next),
        },
        reveal,
      )}
    />
  )
}

function DeviceRow({ row, reveal }: { row: RowOf<'device'>; reveal?: boolean }): React.JSX.Element {
  const on = useSession((s) => s.devicePrefs[row.key] ?? false)
  const setDevicePref = useSession((s) => s.setDevicePref)
  return (
    <MenuRowView
      row={settingsRow(
        row,
        {
          kind: 'switch',
          checked: on,
          ariaLabel: row.label,
          onChange: (next) => setDevicePref(row.key, next || undefined),
        },
        reveal,
      )}
    />
  )
}

function ZoomRow({ row, reveal }: { row: RowOf<'zoom'>; reveal?: boolean }): React.JSX.Element {
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
      row={settingsRow(
        row,
        {
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
                commit(Math.min(steps[steps.length - 1], Math.max(steps[0], typed / unit.scale)))
            },
          },
        },
        reveal,
      )}
    />
  )
}

function PickerRow({ row, reveal }: { row: RowOf<'picker'>; reveal?: boolean }): React.JSX.Element {
  const stored = useSession((s) => s.personalization[row.key])
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(
        row,
        {
          kind: 'picker',
          ariaLabel: row.label,
          value: stored ?? row.fallback,
          options: row.options,
          onPick: (v: typeof row.fallback) =>
            setPersonalization(row.key, v === row.fallback ? undefined : v),
        },
        reveal,
      )}
    />
  )
}

function SliderRow({ row, reveal }: { row: RowOf<'slider'>; reveal?: boolean }): React.JSX.Element {
  const value = useSession((s) => s.personalization[row.key] ?? 0)
  const setPersonalization = useSession((s) => s.setPersonalization)
  return (
    <MenuRowView
      row={settingsRow(
        row,
        {
          kind: 'slider',
          value,
          min: 0,
          max: row.max,
          step: 1,
          ariaLabel: row.label,
          format: row.format,
          onCommit: (v) => setPersonalization(row.key, v > 0 ? Math.round(v) : undefined),
        },
        reveal,
      )}
    />
  )
}
