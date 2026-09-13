import type { DevicePrefs } from '@pommora/core/Settings/devicePrefs'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { LINK_FORMAT_OPTIONS } from '../Properties/Schema/linkFormatOptions'
import { DEFAULT_LINK_DISPLAY, type LinkDisplay } from '@pommora/core/Properties/properties'
import {
  DEFAULT_TIME_FORMAT,
  HISTORY_DAY_STEPS,
  HISTORY_DAYS,
  HISTORY_INTERVAL,
  HISTORY_INTERVAL_STEPS,
  TAB_CACHE,
  TAB_CACHE_STEPS,
  TAB_MAX_WIDTH,
  TAB_MAX_WIDTH_STEPS,
  TAB_MIN_WIDTH,
  TAB_MIN_WIDTH_STEPS,
  PREVIEW_PERSISTENCE_DEFAULT,
  TIME_FORMAT_LABELS,
  TIME_FORMAT_SETTINGS,
  EDITOR_SCALE_DEFAULT,
  EMBED_SCALE_DEFAULT,
  WEB_ZOOM_DEFAULT,
  type Personalization,
  type PickerSelection,
  type PreviewPersistence,
  type TabOpenBehavior,
  type TimeFormatSetting,
  INTERFACE_SCALE_DEFAULT,
  INTERFACE_SCALE_STEPS,
} from '@pommora/core/Settings/personalization'
import type { ColorSetting } from '@pommora/uix/Theme/colors'
import {
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  type DateFormat,
} from '@pommora/core/Properties/columnStyles'
import { TrashFrame } from './TrashFrame'
import { askClearExclusions, askClearHistory } from '../Interface/Confirm/confirmations'
import { host } from '../Platform/dialer'

type KeyOf<V, R = Personalization> = {
  [K in keyof R]-?: NonNullable<R[K]> extends V ? K : never
}[keyof R]

export interface RowText {
  label: string
  hint?: string
}

type PickerControlRow<T extends string> = RowText & {
  kind: 'picker'
  key: KeyOf<T>
  options: readonly PickerOption<T>[]
  fallback: T
}

type InheritSentinel = 'system' | 'accent' | 'default'

export type Row =
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
      key: KeyOf<boolean, DevicePrefs>
    })
  | (RowText & {
      kind: 'path'
    })
  | (RowText & {
      kind: 'exclusions'
    })
  | (RowText & {
      kind: 'clear'
      clear: () => Promise<boolean>
    })
  | (RowText & {
      kind: 'color'
      key: KeyOf<ColorSetting<InheritSentinel>>
      inherits: InheritSentinel
      inheritsVar: string
      greyscale?: boolean
    })
  | PickerControlRow<LinkDisplay>
  | PickerControlRow<DateFormat>
  | PickerControlRow<TimeFormatSetting>
  | PickerControlRow<PickerSelection>
  | PickerControlRow<PreviewPersistence>
  | PickerControlRow<TabOpenBehavior>
  | (RowText & {
      kind: 'nexus'
    })
  | (RowText & {
      kind: 'zoom'
      key: KeyOf<number>
      fallback: number
      steps?: readonly number[]
      unit?: NumberUnit
    })

export type RowOf<K extends Row['kind']> = Extract<Row, { kind: K }>

type NumberUnit = { scale: number; suffix: string }
export const PERCENT: NumberUnit = { scale: 100, suffix: '%' }
const DAYS: NumberUnit = { scale: 1, suffix: ' Days' }
const MINUTES: NumberUnit = { scale: 1, suffix: ' Min' }
const PIXELS: NumberUnit = { scale: 1, suffix: 'px' }
const TABS: NumberUnit = { scale: 1, suffix: ' Tabs' }

const clearExclusions = async (): Promise<boolean> => {
  const count = await host().ask('exclusions:count')
  if (!count.ok) {
    host().ask('error:show', count.error.message)
    return false
  }
  if (count.value === 0 || !(await askClearExclusions(count.value))) return false
  const r = await host().ask('exclusions:clear')
  if (!r.ok) host().ask('error:show', r.error.message)
  return r.ok && r.value !== null
}

const clearHistory = async (): Promise<boolean> => {
  if (!(await askClearHistory())) return false
  const r = await host().ask('history:clear')
  if (!r.ok) host().ask('error:show', r.error.message)
  return r.ok
}

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

const pickerSelectionOptions: readonly PickerOption<PickerSelection>[] = [
  { value: 'outlined', label: 'Outlined' },
  { value: 'checked', label: 'Checked' },
]

const dateFormatOptions: readonly PickerOption<DateFormat>[] = DATE_FORMATS.map((value) => ({
  value,
  label: DATE_FORMAT_LABELS[value],
}))
const timeFormatOptions: readonly PickerOption<TimeFormatSetting>[] = TIME_FORMAT_SETTINGS.map(
  (value) => ({ value, label: TIME_FORMAT_LABELS[value] }),
)

const roster = <const T extends readonly Frame[]>(
  leaves: T,
): readonly (Frame & { key: T[number]['key'] })[] => leaves

export const FRAMES = roster([
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
      {
        title: 'Nexus',
        rows: [{ kind: 'nexus', label: 'Nexus' }],
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
            hint: "The scale embedded pages and views start at; a tile's own toggle compounds it.",
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
            kind: 'picker',
            key: 'previewPersistence',
            label: 'Hover Previews',
            hint: 'Show a preview when resting on a page; how long it lingers after hovering off.',
            fallback: PREVIEW_PERSISTENCE_DEFAULT,
            options: [
              { value: 'off', label: 'Off' },
              { value: '1s', label: '1 Second' },
              { value: '5s', label: '5 Seconds' },
              { value: '10s', label: '10 Seconds' },
              { value: 'always', label: 'Until Closed' },
            ],
          },
          {
            kind: 'toggle',
            key: 'dismissPreviewOnPointer',
            label: 'Dismiss Preview On Pointer Actions',
            hint: 'A click outside the preview dismisses it; a locked preview stays.',
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
            label: 'Focus New Tabs',
            defaultOn: true,
          },
          {
            kind: 'zoom',
            key: 'tabMinWidth',
            label: 'Minimum Tab Width',
            fallback: TAB_MIN_WIDTH.default,
            steps: TAB_MIN_WIDTH_STEPS,
            unit: PIXELS,
          },
          {
            kind: 'zoom',
            key: 'tabMaxWidth',
            label: 'Maximum Tab Width',
            fallback: TAB_MAX_WIDTH.default,
            steps: TAB_MAX_WIDTH_STEPS,
            unit: PIXELS,
          },
          {
            kind: 'zoom',
            key: 'tabCache',
            label: 'Active Tab Cache',
            hint: 'Maximum amount of open tabs kept active before switching to on-demand loading.',
            fallback: TAB_CACHE.default,
            steps: TAB_CACHE_STEPS,
            unit: TABS,
          },
          {
            kind: 'toggle',
            key: 'pauseMediaOnTabSwitch',
            label: 'Pause Media on Tab Switch',
            hint: 'Automatically pause video and audio playback from an open tab when no longer in the main view.',
            defaultOn: true,
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
            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, views and properties always ask.',
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
            fallback: HISTORY_DAYS.default,
            steps: HISTORY_DAY_STEPS,
            unit: DAYS,
          },
          {
            kind: 'zoom',
            key: 'historyInterval',
            label: 'Snapshot Interval',
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
    label: 'Pages & Writing',
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
        title: 'Transformations',
        rows: [
          {
            kind: 'toggle',
            key: 'transformDashes',
            label: 'Dashes',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'transformArrows',
            label: 'Arrows',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'transformEquations',
            label: 'Equations',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'transformEllipses',
            label: 'Ellipses',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'transformCallouts',
            label: 'Callout',
            defaultOn: true,
          },
        ],
      },
      {
        title: 'Autopairing',
        rows: [
          {
            kind: 'toggle',
            key: 'pairBrackets',
            label: 'Brackets',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'pairMarkers',
            label: 'Markers',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'pairQuotes',
            label: 'Quotes',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'deletePairsTogether',
            label: 'Delete Pairs Together',
            hint: 'Backspace inside an empty pair removes both halves.',
            defaultOn: true,
          },
          {
            kind: 'toggle',
            key: 'exitPairsOnEnter',
            label: 'Exit On Enter',
            hint: 'Enter moves the caret past the closer of an open pair.',
            defaultOn: true,
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

export type CategoryKey = (typeof FRAMES)[number]['key']

export const frameFor = (key: CategoryKey): Frame => FRAMES.find((l) => l.key === key) ?? FRAMES[0]
