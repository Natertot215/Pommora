import { reportRefusal } from '../Interface/Notifications/notifications'
import {
  type DEVICE_RANGES,
  type DeviceDefaultKey,
  type DevicePrefs,
  devicePref,
  type ScrollbarPresence,
  type ScrollbarReveal,
} from './devicePrefs'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { type NumberUnit, unitLabel } from '@pommora/uix/Pickers/numberUnit'
import type { NumberRange } from '@pommora/uix/Utilities/clamp'
import { LINK_FORMAT_OPTIONS } from '../Properties/Schema/linkFormatOptions'
import type { LinkDisplay } from '../Properties/properties'
import {
  HEADING_LINK_STYLE_LABELS,
  HEADING_LINK_STYLES,
  HEADING_SIZE_KEYS,
  HEADING_SIZE,
  IN_PAGE_HEADING_RESOLUTION_LABELS,
  IN_PAGE_HEADING_RESOLUTIONS,
  TIME_FORMAT_SETTINGS,
  type HeadingLinkStyle,
  type InPageHeadingResolution,
  type MatrixOpenIn,
  type Placement,
  type PreviewPersistence,
  type TabOpenBehavior,
  type TimeFormatSetting,
  type SteppedKey,
  SETTING_DEFAULTS,
  type SettingKey,
  type SettingValue,
} from './personalization'
import type { ColorSetting } from '@pommora/uix/Theme/colors'
import {
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_LABELS,
  type DateFormat,
} from '../Properties/columnStyles'
import { TrashFrame } from './TrashFrame'
import { askClearExclusions, askClearHistory } from '../Interface/Confirm/confirmations'
import { dialer } from '../Platform/dialer'
import type { SessionState } from '../Session/sessionState'
import { useSession } from '../Session/store'

const PLACEMENT_OPTIONS: readonly PickerOption<Placement>[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
]
const SCROLLBAR_PRESENCE_OPTIONS: readonly PickerOption<ScrollbarPresence>[] = [
  { value: 'all', label: 'All' },
  { value: 'pages', label: 'Pages Only' },
  { value: 'off', label: 'Off' },
]
const SCROLLBAR_REVEAL_OPTIONS: readonly PickerOption<ScrollbarReveal>[] = [
  { value: 'always', label: 'Always' },
  { value: 'hover', label: 'On Hover' },
]

type KeyOf<V> = { [K in SettingKey]: SettingValue<K> extends V ? K : never }[SettingKey]
type DeviceKeyOf<V> = {
  [K in DeviceDefaultKey]: NonNullable<DevicePrefs[K]> extends V ? K : never
}[DeviceDefaultKey]

type Scoped<Nexus, Device> = { key: Nexus; device?: never } | { key: Device; device: true }

export interface RowText {
  label: string
  hint?: string
  when?: (s: SessionState) => boolean
}

type PickerControlRow<T extends string> = RowText & {
  kind: 'picker'
  options: readonly PickerOption<T>[]
} & Scoped<KeyOf<T>, DeviceKeyOf<T>>

type ZoomSpec = RowText & {
  unit?: NumberUnit
}

type InheritSentinel = 'system' | 'accent' | 'default'

export type Row =
  | (RowText & { kind: 'toggle' } & Scoped<KeyOf<boolean>, DeviceKeyOf<boolean>>)
  | (RowText &
      NumberRange & {
        kind: 'slider'
        key: KeyOf<number>
        step: number
        format: (v: number) => string
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
      clearedVar: string
      greyscale?: boolean
    })
  | PickerControlRow<LinkDisplay>
  | PickerControlRow<DateFormat>
  | PickerControlRow<TimeFormatSetting>
  | PickerControlRow<PreviewPersistence>
  | PickerControlRow<TabOpenBehavior>
  | PickerControlRow<MatrixOpenIn>
  | PickerControlRow<HeadingLinkStyle>
  | PickerControlRow<InPageHeadingResolution>
  | PickerControlRow<Placement>
  | PickerControlRow<ScrollbarPresence>
  | PickerControlRow<ScrollbarReveal>
  | (RowText & {
      kind: 'nexus'
    })
  | (ZoomSpec & { kind: 'zoom' } & Scoped<SteppedKey, keyof typeof DEVICE_RANGES>)

export type RowOf<K extends Row['kind']> = Extract<Row, { kind: K }>

export const PERCENT: NumberUnit = { scale: 100, suffix: '%', digits: 0 }
const DAYS: NumberUnit = { scale: 1, suffix: ' Days', digits: 0 }
const MINUTES: NumberUnit = { scale: 1, suffix: ' Min', digits: 0 }
const PIXELS: NumberUnit = { scale: 1, suffix: 'px', digits: 0 }
const EM: NumberUnit = { scale: 1, suffix: 'em', digits: 2 }
const TABS: NumberUnit = { scale: 1, suffix: ' Tabs', digits: 0 }

const clearExclusions = async (): Promise<boolean> => {
  const count = useSession.getState().tree?.excluded.length ?? 0
  if (count === 0 || !(await askClearExclusions(count))) return false
  const r = await dialer().ask('exclusions:clear')
  return reportRefusal(r) && r.value !== null
}

const clearFileHistory = async (): Promise<boolean> => {
  if (!(await askClearHistory())) return false
  return reportRefusal(await dialer().ask('history:clear'))
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
  experimental?: true
} & (
  | { sections: readonly Section[]; Surface?: never }
  | { Surface: () => React.JSX.Element; sections?: never }
)

const timeFormatOptions: readonly PickerOption<TimeFormatSetting>[] = TIME_FORMAT_SETTINGS.map(
  (value) => ({ value, label: TIME_FORMAT_LABELS[value] }),
)
const headingLinkStyleOptions: readonly PickerOption<HeadingLinkStyle>[] = HEADING_LINK_STYLES.map(
  (value) => ({ value, label: HEADING_LINK_STYLE_LABELS[value] }),
)
const inPageHeadingResolutionOptions: readonly PickerOption<InPageHeadingResolution>[] =
  IN_PAGE_HEADING_RESOLUTIONS.map((value) => ({
    value,
    label: IN_PAGE_HEADING_RESOLUTION_LABELS[value],
  }))

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
            options: DATE_FORMAT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'timeFormat',
            label: 'Time Format',
            hint: "The nexus's clock — twelve-hour segments or a flat twenty-four-hour time.",
            options: timeFormatOptions,
          },
        ],
      },
      {
        title: 'Nexus',
        rows: [{ kind: 'nexus', label: 'Nexus' }],
      },
      {
        title: 'Advanced',
        rows: [
          {
            kind: 'toggle',
            key: 'experimentalFeatures',
            label: 'Experimental Features',
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
        title: 'General Preferences',
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
            kind: 'toggle',
            key: 'nativeMenus',
            device: true,
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
            kind: 'zoom',
            key: 'interfaceScale',
            device: true,
            label: 'Interface Scale',
            hint: 'The scaling factor applied to the entire interface; additional scaling preferences compound this value.',
          },
          {
            kind: 'zoom',
            key: 'embedScale',
            label: 'Embed Scale',
            hint: "The scale embedded pages and views start at; a tile's own toggle compounds it.",
          },
          {
            kind: 'zoom',
            key: 'brightness',
            device: true,
            label: 'Brightness',
            hint: "Pommora's own brightness, independent of the display's.",
          },
          {
            kind: 'picker',
            key: 'scrollbars',
            device: true,
            label: 'Scrollbar Presence',
            options: SCROLLBAR_PRESENCE_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'scrollbarReveal',
            device: true,
            label: 'Scrollbar Visibility',
            options: SCROLLBAR_REVEAL_OPTIONS,
            when: (s) => devicePref(s.devicePrefs, 'scrollbars') !== 'off',
          },
        ],
      },
      {
        title: 'Creation Placement',
        rows: [
          {
            kind: 'picker',
            key: 'newPagePlacement',
            label: 'New Page Placement',
            hint: 'Where a new page lands among its siblings when it isn’t created beside another.',
            options: PLACEMENT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'newFolderPlacement',
            label: 'New Folder Placement',
            hint: 'Where a new Set or Sub-Set lands among its siblings.',
            options: PLACEMENT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'newSpacePlacement',
            label: 'New Space Placement',
            hint: 'Where a new Space lands in its Context when it isn’t created beside another.',
            options: PLACEMENT_OPTIONS,
          },
        ],
      },
      {
        title: 'Webpages & Links',
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
            options: [
              { value: 'overtake', label: 'Overtake' },
              { value: 'newtab', label: 'New Tab' },
            ],
          },
          {
            kind: 'picker',
            key: 'matrixOpenIn',
            label: 'Open Matrix In',
            options: [
              { value: 'tab', label: 'New Tab' },
              { value: 'window', label: 'Window' },
            ],
          },
          {
            kind: 'toggle',
            key: 'tabTakeFocus',
            label: 'Focus New Tabs',
          },
          {
            kind: 'zoom',
            key: 'tabMinWidth',
            label: 'Minimum Tab Width',
            unit: PIXELS,
          },
          {
            kind: 'zoom',
            key: 'tabMaxWidth',
            label: 'Maximum Tab Width',
            unit: PIXELS,
          },
          {
            kind: 'zoom',
            key: 'tabCache',
            label: 'Active Tab Cache',
            hint: 'Maximum amount of open tabs kept active before switching to on-demand loading.',
            unit: TABS,
          },
          {
            kind: 'toggle',
            key: 'pauseMediaOnTabSwitch',
            label: 'Pause Media On Tab Switch',
            hint: 'Automatically pause video and audio playback from an open tab when no longer in the main view.',
          },
        ],
      },
      {
        title: 'Windows',
        rows: [
          {
            kind: 'toggle',
            key: 'windowPageBanners',
            label: 'Show Banners In Windowed Pages',
            hint: 'A Page opened in a window draws its banner with the title over it.',
          },
          {
            kind: 'toggle',
            key: 'windowSpaceBanners',
            label: 'Show Banners In Windowed Spaces',
            hint: 'A Space opened in a window carries its banner; off, it carries its title alone.',
          },
          {
            kind: 'toggle',
            key: 'windowNavBanner',
            label: 'Show Banner In Navigation Window',
            hint: 'The Navigation Window carries the Navigation View banner, with the search field over it.',
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
            clearedVar: 'var(--system-accent)',
          },
          {
            kind: 'color',
            key: 'connectionColor',
            label: 'Internal Link Color',
            hint: 'Connections to other pages. Cleared follows the accent.',
            clearedVar: 'var(--connection)',
          },
          {
            kind: 'color',
            key: 'externalLinkColor',
            label: 'External Link Color',
            hint: 'Links out to the web. Cleared follows the system accent.',
            clearedVar: 'var(--link)',
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
          },
          {
            kind: 'toggle',
            key: 'aliasPickerOnCommit',
            label: 'Automatically Suggest Existing Aliases When Linking A Page',
            hint: 'Accepting a page from the connection picker offers the names it already carries.',
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
            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, views and properties always ask.',
          },
          {
            kind: 'toggle',
            key: 'permanentDelete',
            label: 'Permanently Delete Files',
            hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
          },
          {
            kind: 'toggle',
            key: 'restoreLinksOnDeletion',
            label: 'Restore Links On Deletion',
            hint: 'Restoring a deleted page puts it back into the Link property values that pointed at it.',
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
          },
          {
            kind: 'zoom',
            key: 'historyDays',
            label: 'History Timeframe',
            unit: DAYS,
          },
          {
            kind: 'zoom',
            key: 'historyInterval',
            label: 'Snapshot Interval',
            unit: MINUTES,
          },
          {
            kind: 'clear',
            label: 'Clear History',
            hint: 'Permanently delete stored snapshots for all files; this cannot be undone.',
            clear: clearFileHistory,
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
          },
          {
            kind: 'toggle',
            key: 'outlinerLines',
            label: 'Outliner Lines',
            hint: 'Show indent rails on nested lists in the editor.',
          },
          { kind: 'toggle', key: 'titleIcon', label: 'Show Icon In Title' },
        ],
      },
      {
        title: 'Headings',
        rows: HEADING_SIZE_KEYS.map((key, i) => ({
          kind: 'slider',
          key,
          label: `Heading ${i + 1} Size`,
          hint: `Default: ${unitLabel(SETTING_DEFAULTS[key], EM)}`,
          ...HEADING_SIZE,
          step: 0.05,
          format: (v) => unitLabel(v, EM),
        })),
      },
      {
        title: 'Transformations',
        rows: [
          {
            kind: 'toggle',
            key: 'transformDashes',
            label: 'Dashes',
          },
          {
            kind: 'toggle',
            key: 'transformArrows',
            label: 'Arrows',
          },
          {
            kind: 'toggle',
            key: 'transformEquations',
            label: 'Equations',
          },
          {
            kind: 'toggle',
            key: 'transformPunctuation',
            label: 'Punctuation',
          },
          {
            kind: 'toggle',
            key: 'transformEllipses',
            label: 'Ellipses',
          },
          {
            kind: 'toggle',
            key: 'transformCallouts',
            label: 'Callout',
          },
          {
            kind: 'toggle',
            key: 'transformSections',
            label: 'Sections',
          },
          {
            kind: 'toggle',
            key: 'transformBullets',
            label: 'Bullets',
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
          },
          {
            kind: 'toggle',
            key: 'pairMarkers',
            label: 'Markers',
          },
          {
            kind: 'toggle',
            key: 'pairQuotes',
            label: 'Quotes',
          },
          {
            kind: 'toggle',
            key: 'wrapSelections',
            label: 'Wrap Selections',
            hint: 'Typing a pair character over a selection wraps it.',
          },
          {
            kind: 'toggle',
            key: 'deletePairsTogether',
            label: 'Delete Pairs Together',
            hint: 'Backspace inside an empty pair removes both halves.',
          },
          {
            kind: 'toggle',
            key: 'exitPairsOnEnter',
            label: 'Exit On Enter',
            hint: 'Enter moves the caret past the closer of an open pair.',
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
            clearedVar: 'var(--highlight)',
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
            clearedVar: 'var(--code)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'codeblockLineCount',
            label: 'Show Line Count In Code Blocks',
            hint: "Number a codeblock's lines — display chrome, never editable text.",
          },
          {
            kind: 'toggle',
            key: 'htmlShortcuts',
            label: 'HTML Shortcuts',
            hint: 'Use ⌘/ to insert <!-- --\u200c> comments, and auto-close <div> tags.',
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
            hint: 'The color checkboxes and switches fill with. Cleared follows the accent.',
            clearedVar: 'var(--checkbox-base)',
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
          {
            kind: 'picker',
            key: 'headingLinkStyle',
            label: 'Heading Link Style',
            options: headingLinkStyleOptions,
          },
          {
            kind: 'picker',
            key: 'inPageHeadingResolution',
            label: 'In-Page Heading Resolution',
            options: inPageHeadingResolutionOptions,
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
          },
        ],
      },
    ],
  },
  {
    key: 'automations',
    label: 'Automations',
    icon: 'zap',
    experimental: true,
    sections: [],
  },
  {
    key: 'shortcuts',
    label: 'Shortcuts',
    icon: 'command',
    experimental: true,
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

export const frameFor = (key: CategoryKey): Frame => FRAMES.find((l) => l.key === key)!
