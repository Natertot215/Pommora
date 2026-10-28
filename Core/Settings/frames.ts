import { notifyRetry, reportRefusal } from '../Interface/Notifications/notifications'
import {
  type DEVICE_RANGES,
  type DeviceDefaultKey,
  type DevicePrefs,
  devicePref,
  type ScrollbarPresence,
  type ScrollbarReveal,
} from './devicePrefs'
import { type PickerOption, pickerOptions } from '@pommora/uix/Pickers/PickerControl'
import { type NumberUnit, unitLabel } from '@pommora/uix/Utilities/numberUnit'
import type { NumberRange } from '@pommora/uix/Utilities/clamp'
import type { LinkDisplay } from '../Connections/linkValue'
import type { PathFormat } from '../Paths/pathFormat'
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
import type { DateFormat } from '../Properties/columnStyles'
import {
  DATE_FORMAT_OPTIONS,
  LINK_DISPLAY_OPTIONS,
  TIME_FORMAT_LABELS,
} from '../Properties/displayLabels'
import { TrashFrame } from './TrashFrame'
import { infoFor } from '../Info/InfoButton'
import type { MenuRow, Trailing } from '@pommora/uix/Menus'
import type { ReactNode } from 'react'
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
const PATH_FORMAT_OPTIONS: readonly PickerOption<PathFormat>[] = [
  { value: 'absolute', label: 'Absolute' },
  { value: 'home', label: 'Home Anchored' },
  { value: 'relative', label: 'Relative' },
]

type KeyOf<V> = { [K in SettingKey]: SettingValue<K> extends V ? K : never }[SettingKey]
type DeviceKeyOf<V> = {
  [K in DeviceDefaultKey]: NonNullable<DevicePrefs[K]> extends V ? K : never
}[DeviceDefaultKey]

type Scoped<Nexus, Device> = { key: Nexus; device?: never } | { key: Device; device: true }

export interface RowText {
  label: string
  caption?: string
  info?: ReactNode
  when?: (s: SessionState) => boolean
}

export const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({
  kind: 'item',
  label: row.label,
  caption: row.caption,
  info: row.info,
  trailing,
})

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
      kind: 'previewRules'
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
  | PickerControlRow<PathFormat>
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
  const count = useSession.getState().tree?.config.excluded.length ?? 0
  if (count === 0 || !(await askClearExclusions(count))) return false
  return sendClear()
}

// A clear that skipped a page refuses having cleared the rest, and clearing again is safe, so its Try Again sends it again without asking.
const sendClear = async (): Promise<boolean> => {
  const r = await dialer().ask('exclusions:clear')
  if (!r.ok && r.error.code === 'operation-failed')
    notifyRetry(r.error.message, () => void sendClear())
  else if (!reportRefusal(r)) return false
  return r.ok && r.value !== null
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
            caption: 'How a date reads wherever a column has not chosen its own form.',
            info: infoFor('date-format', 'Date Format'),
            options: DATE_FORMAT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'timeFormat',
            label: 'Time Format',
            caption: "The nexus's clock — twelve-hour segments or a flat twenty-four-hour time.",
            options: pickerOptions(TIME_FORMAT_SETTINGS, TIME_FORMAT_LABELS),
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
    key: 'metadata',
    label: 'Metadata',
    icon: 'server',
    sections: [
      {
        title: 'Maintenance',
        rows: [
          {
            kind: 'toggle',
            key: 'repairOnOpen',
            label: 'Repair Properties On Open',
            caption: 'Repair property and Context values on the pages changed since the last open.',
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
            caption: "Collapse the sidebar's chevron gutter.",
          },
          {
            kind: 'toggle',
            key: 'revealTabBarOnHover',
            label: 'Reveal Tab Bar On Hover',
            caption: 'Keep the tab bar hidden until the pointer nears it.',
          },
          {
            kind: 'toggle',
            key: 'nativeMenus',
            device: true,
            label: 'Use Native Menus',
            caption:
              'Menus that are plain lists open as system menus. Belongs to this computer rather than to the nexus.',
          },
          {
            kind: 'toggle',
            key: 'nativeHighlight',
            label: 'Use Native Highlighting',
            caption: "Selected text uses the system's own highlight instead of Pommora's.",
          },
          {
            kind: 'zoom',
            key: 'interfaceScale',
            device: true,
            label: 'Interface Scale',
            caption:
              'The scaling factor applied to the entire interface; additional scaling preferences compound this value.',
          },
          {
            kind: 'zoom',
            key: 'embedScale',
            label: 'Embed Scale',
            caption:
              "The scale embedded pages and views start at; a tile's own toggle compounds it.",
          },
          {
            kind: 'zoom',
            key: 'brightness',
            device: true,
            label: 'Brightness',
            caption: "Pommora's own brightness, independent of the display's.",
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
            caption:
              'Where a new page lands among its siblings when it isn’t created beside another.',
            options: PLACEMENT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'newFolderPlacement',
            label: 'New Folder Placement',
            caption: 'Where a new Set or Sub-Set lands among its siblings.',
            options: PLACEMENT_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'newSpacePlacement',
            label: 'New Space Placement',
            caption: 'Where a new Space lands in its Context when it isn’t created beside another.',
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
            caption: 'External links open the floating browser instead of the system one.',
          },
          {
            kind: 'zoom',
            key: 'webZoomFactor',
            label: 'Webpage Zoom',
            caption: 'How embedded webpages scale, relative to the window.',
          },
        ],
      },
    ],
  },
  {
    key: 'shortcuts',
    label: 'Shortcuts',
    icon: 'command',
    experimental: true,
    sections: [],
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
            caption: 'Picking an entity dismisses the Navigation window.',
          },
          {
            kind: 'toggle',
            key: 'openFoldersOnTitleClick',
            label: 'Open Folders In Main View On Title Click',
            caption:
              'A nested folder opens from its sidebar title, its breadcrumb, or a double-click on its band, as Collections and top-level Sets do.',
          },
          {
            kind: 'toggle',
            key: 'connectionsOpenInPreview',
            label: 'Open Connections In Preview',
            caption: 'A [[Connection]] click opens the preview window instead of navigating.',
          },
          {
            kind: 'previewRules',
            label: 'Open In Preview',
            caption: 'Pages matching these rules open within preview windows by default.',
          },
          {
            kind: 'picker',
            key: 'previewPersistence',
            label: 'Hover Previews',
            caption:
              'Show a preview when resting on a page; how long it lingers after hovering off.',
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
            caption: 'A click outside the preview dismisses it; a locked preview stays.',
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
            caption:
              'Maximum amount of open tabs kept active before switching to on-demand loading.',
            unit: TABS,
          },
          {
            kind: 'toggle',
            key: 'pauseMediaOnTabSwitch',
            label: 'Pause Media On Tab Switch',
            caption:
              'Automatically pause video and audio playback from an open tab when no longer in the main view.',
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
            caption: 'A Page opened in a window draws its banner with the title over it.',
          },
          {
            kind: 'toggle',
            key: 'windowSpaceBanners',
            label: 'Show Banners In Windowed Spaces',
            caption:
              'A Space opened in a window carries its banner; off, it carries its title alone.',
          },
          {
            kind: 'toggle',
            key: 'windowNavBanner',
            label: 'Show Banner In Navigation Window',
            caption:
              'The Navigation Window carries the Navigation View banner, with the search field over it.',
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
            caption:
              'The color every accented surface derives from. Cleared follows the system accent.',
            clearedVar: 'var(--system-accent)',
          },
          {
            kind: 'color',
            key: 'connectionColor',
            label: 'Internal Link Color',
            caption: 'Connections to other pages. Cleared follows the accent.',
            clearedVar: 'var(--connection)',
          },
          {
            kind: 'color',
            key: 'externalLinkColor',
            label: 'External Link Color',
            caption: 'Links out to the web. Cleared follows the system accent.',
            clearedVar: 'var(--link)',
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
    key: 'files',
    label: 'Files & Links',
    icon: 'folder-tree',
    sections: [
      {
        title: 'Links & Paths',
        rows: [
          {
            kind: 'picker',
            key: 'defaultLinkFormat',
            device: true,
            label: 'Default Link Format',
            caption: 'The format an external link is pasted with by default.',
            options: LINK_DISPLAY_OPTIONS,
          },
          {
            kind: 'picker',
            key: 'defaultPathFormat',
            device: true,
            label: 'Default Path Format',
            caption: 'How file paths on this machine are copied to the clipboard.',
            options: PATH_FORMAT_OPTIONS,
          },
          {
            kind: 'toggle',
            key: 'includeExtensions',
            device: true,
            label: 'Include Extensions',
            caption: "Include file extensions in the clipboard's path.",
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
            caption: 'Pointing a link at another target drops the title it was showing.',
          },
          {
            kind: 'toggle',
            key: 'aliasPickerOnCommit',
            label: 'Automatically Suggest Existing Aliases When Linking A Page',
            caption:
              'Accepting a page from the connection picker offers the names it already carries.',
          },
        ],
      },
      {
        title: 'Assets',
        rows: [
          {
            kind: 'path',
            label: 'Default Asset Directory',
            caption: 'Where inherited assets, images, and other file types will be stored.',
          },
        ],
      },
      {
        title: 'Exclusions',
        rows: [
          {
            kind: 'exclusions',
            label: 'Excluded Directories',
            caption:
              'Excluded folders will not be recognized by the app; removing a folder from exclusion will re-index.',
          },
          {
            kind: 'clear',
            label: 'Clear Exclusion Cache',
            caption:
              'Remove existing app data that may have been written onto previously indexed folders.',
            clear: clearExclusions,
          },
        ],
      },
      {
        title: 'Trash & Archive',
        rows: [
          {
            kind: 'toggle',
            key: 'confirmDeletion',
            label: 'Confirm Before Deletion',
            caption:
              'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views and properties always ask.',
          },
          {
            kind: 'toggle',
            key: 'confirmArchiving',
            label: 'Confirm Before Archiving',
            caption: 'Ask before archiving a page or a Set.',
          },
          {
            kind: 'toggle',
            key: 'permanentDelete',
            label: 'Permanently Delete Files',
            caption:
              'Erase items emptied from the Trash instead of moving them to the system trash.',
          },
          {
            kind: 'toggle',
            key: 'restoreLinksOnDeletion',
            label: 'Restore Links On Deletion',
            caption:
              'Restoring a deleted page puts it back into the Link property values that pointed at it.',
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
            caption: 'Stores recoverable snapshots of device-local file history.',
          },
          {
            kind: 'zoom',
            key: 'historyDays',
            label: 'History Timeframe',
            caption: 'How long file history and the recovery stash are kept.',
            unit: DAYS,
          },
          {
            kind: 'zoom',
            key: 'archiveHistoryDays',
            label: 'Archive History Timeframe',
            caption:
              "How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.",
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
            caption: 'Permanently delete stored snapshots for all files; this cannot be undone.',
            clear: clearFileHistory,
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
            caption:
              'How large a page reads — its text, its title, and the chrome around them. An embedded page keeps its own scale.',
          },
          {
            kind: 'toggle',
            key: 'outlinerLines',
            label: 'Outliner Lines',
            caption: 'Show indent rails on nested lists in the editor.',
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
          caption: `Default: ${unitLabel(SETTING_DEFAULTS[key], EM)}`,
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
            caption: 'Typing a pair character over a selection wraps it.',
          },
          {
            kind: 'toggle',
            key: 'deletePairsTogether',
            label: 'Delete Pairs Together',
            caption: 'Backspace inside an empty pair removes both halves.',
          },
          {
            kind: 'toggle',
            key: 'exitPairsOnEnter',
            label: 'Exit On Enter',
            caption: 'Enter moves the caret past the closer of an open pair.',
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
            caption: 'Inline `code` coloring; cleared defaults to red.',
            clearedVar: 'var(--code)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'codeblockLineCount',
            label: 'Show Line Count In Code Blocks',
            caption: "Number a codeblock's lines — display chrome, never editable text.",
          },
          {
            kind: 'toggle',
            key: 'codeblockScroll',
            label: 'Scroll Long Lines In Code Blocks',
            caption:
              "Codeblocks become scrollable when lines extend beyond their width; they're wrapped when this is turned off.",
          },
          {
            kind: 'toggle',
            key: 'codeblockPathIcons',
            label: 'Show Path Icons',
            caption:
              'Display icons for paths and individual files within the label of a codeblock containing ```file/path declarations.',
          },
        ],
      },
      {
        title: 'HTML',
        rows: [
          {
            kind: 'color',
            key: 'htmlTagColor',
            label: 'HTML Tag Color',
            caption: 'Inline <tag> coloring; cleared defaults to Code Color.',
            clearedVar: 'var(--html-tag)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'htmlShortcuts',
            label: 'HTML Shortcuts',
            caption: 'Use ⌘/ to insert <!-- --\u200c> comments, and auto-close <div> tags.',
          },
          {
            kind: 'toggle',
            key: 'htmlFormatting',
            label: 'HTML Formatting',
            caption: 'Use HTML styling for text wrapped in <tags>.',
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
            caption: 'The color checkboxes and switches fill with. Cleared follows the accent.',
            clearedVar: 'var(--checkbox-base)',
            greyscale: true,
          },
          {
            kind: 'toggle',
            key: 'muteCheckedItems',
            label: 'Mute Checked Items',
            caption: 'A checked task reads as done — its words dimmed and struck through.',
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
            caption:
              'A link leading nowhere reads as the prose it is written as, instead of dimmed with its syntax showing.',
          },
          {
            kind: 'picker',
            key: 'headingLinkStyle',
            label: 'Heading Link Style',
            options: pickerOptions(HEADING_LINK_STYLES, HEADING_LINK_STYLE_LABELS),
          },
          {
            kind: 'picker',
            key: 'inPageHeadingResolution',
            label: 'In-Page Heading Resolution',
            options: pickerOptions(IN_PAGE_HEADING_RESOLUTIONS, IN_PAGE_HEADING_RESOLUTION_LABELS),
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
            caption:
              'Open a page with its footnotes section showing. Each page can be set on its own.',
          },
          {
            kind: 'toggle',
            key: 'jumpToCitation',
            label: 'Jump To Citation On Creation',
            caption: 'Writing a footnote carries the caret down to the citation it just made.',
          },
        ],
      },
    ],
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
