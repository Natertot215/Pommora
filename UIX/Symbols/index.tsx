import {
  AppWindow,
  ArrowUpDown,
  Atom,
  Calendar,
  CalendarDays,
  ChartGantt,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  CircleDashed,
  Clock,
  ClockFading,
  ClockPlus,
  Cog,
  Columns3Cog,
  Command,
  Copy,
  Ellipsis,
  EllipsisVertical,
  Eye,
  EyeOff,
  FileChartColumn,
  FilePen,
  FileText,
  FolderClosed,
  FolderMinus,
  FolderOpen,
  FolderTree,
  GalleryVerticalEnd,
  Grid3x2,
  GripHorizontal,
  GripVertical,
  Hash,
  History,
  Image,
  LayoutDashboard,
  LayoutGrid,
  Laptop,
  Layers,
  Link,
  Link2,
  ListFilter,
  ListTree,
  LogOut,
  type LucideIcon,
  type LucideProps,
  Map as MapIcon,
  Minus,
  Orbit,
  Palette,
  PanelRight,
  Pipette,
  Plus,
  RotateCcw,
  SquarePen,
  Scaling,
  Scan,
  Send,
  Server,
  Shapes,
  Shuffle,
  SlidersHorizontal,
  SquareCheck,
  SquareDashed,
  SquarePlus,
  SquareSplitHorizontal,
  Tag,
  Tags,
  Trash,
  TextAlignJustify,
  Type,
  WrapText,
  Zap,
  X,
} from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import {
  CardsGrid,
  ListRounded,
  LockFilled,
  LockOutline,
  Pommora,
  ProgressCheck,
} from './customGlyphs'
import { fileTypeGlyphs } from './fileTypes'
import { ICON_NAMES } from './iconNames'
import { size as sizeTokens, type IconSize } from '../Theme/theme-vars.css'
import { cx } from '../Utilities/cx'
import * as sym from './symbols.css'

/** This registry IS the roster: to add an icon, import it above and add a line here. */
export const icons = {
  orbit: Orbit,
  atom: Atom,
  calendar: Calendar,
  clock: Clock,
  'clock-fading': ClockFading,
  'clock-plus': ClockPlus,
  history: History,
  'gallery-vertical-end': GalleryVerticalEnd,
  'folder-closed': FolderClosed,
  'folder-minus': FolderMinus,
  'folder-open': FolderOpen,
  'file-text': FileText,
  'file-chart-column': FileChartColumn,
  'layout-grid': LayoutGrid,
  check: Check,
  'circle-dashed': CircleDashed,
  minus: Minus,
  tags: Tags,
  'sliders-horizontal': SlidersHorizontal,
  cog: Cog,
  laptop: Laptop,
  'folder-tree': FolderTree,
  'file-pen': FilePen,
  zap: Zap,
  command: Command,
  trash: Trash,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'app-window': AppWindow,
  map: MapIcon,
  scan: Scan,
  x: X,
  plus: Plus,
  'square-plus': SquarePlus,
  'square-split-horizontal': SquareSplitHorizontal,
  'ellipsis-vertical': EllipsisVertical,
  dots: Ellipsis,
  tag: Tag,
  'panel-right': PanelRight,
  'square-dashed': SquareDashed,
  copy: Copy,
  'arrow-up-down': ArrowUpDown,
  'log-out': LogOut,
  palette: Palette,
  'square-pen': SquarePen,
  scaling: Scaling,
  type: Type,
  shapes: Shapes,
  layers: Layers,
  'grip-vertical': GripVertical,
  'grip-horizontal': GripHorizontal,
  image: Image,
  'rotate-ccw': RotateCcw,
  shuffle: Shuffle,
  pipette: Pipette,
  'wrap-text': WrapText,
  hash: Hash,
  'square-check': SquareCheck,
  link: Link,
  'link-2': Link2,
  send: Send,
  server: Server,
  eye: Eye,
  'eye-off': EyeOff,
  'layout-dashboard': LayoutDashboard,
  'list-filter': ListFilter,
  'list-tree': ListTree,
  'calendar-days': CalendarDays,
  'chart-gantt': ChartGantt,
  'chevrons-up-down': ChevronsUpDown,
  'text-align-justify': TextAlignJustify,
  'view-table': Grid3x2,
  pommora: Pommora,
  'list-rounded': ListRounded,
  'cards-grid': CardsGrid,
  'progress-check': ProgressCheck,
  'columns-3-cog': Columns3Cog,
  locked: LockFilled,
  'lock-outline': LockOutline,
  ...fileTypeGlyphs,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof icons

// A renderable icon is a curated name or any id in the full Lucide roster. ICON_NAMES carries the
// roster as bare strings, so this validates synchronously without the glyph set: a real (even not-yet-
// loaded) id passes and its glyph arrives via LazyGlyph, while a bogus id falls to the caller's default.
export const asRenderableIcon = (value: unknown): string | undefined =>
  typeof value === 'string' && (Object.hasOwn(icons, value) || ICON_NAMES.has(value))
    ? value
    : undefined

export const iconNameOr = (value: unknown, fallback: IconName): string =>
  asRenderableIcon(value) ?? fallback

// The full Lucide set behind a dynamic import, kept out of every non-picker bundle. LazyGlyph and
// the Icon Picker read this store; the module loads once, on first demand, and notifies subscribers.
export type { IconNode } from 'lucide-react'

type FullIconSet = typeof import('./allSymbols')
let fullSet: FullIconSet | null = null
let pending: Promise<FullIconSet> | null = null
const setListeners = new Set<() => void>()

export const loadFullIconSet = (): Promise<FullIconSet> => {
  pending ??= import('./allSymbols').then((m) => {
    fullSet = m
    for (const notify of setListeners) notify()
    return m
  })
  return pending
}

export const subscribeFullIconSet = (notify: () => void): (() => void) => {
  setListeners.add(notify)
  return () => setListeners.delete(notify)
}

export const fullIconSet = (): FullIconSet | null => fullSet

const iconSizeVars = sizeTokens.icon
const isIconSize = (v: unknown): v is IconSize => typeof v === 'string' && v in iconSizeVars

function LazyGlyph({ name, ...rest }: { name: string } & LucideProps): React.JSX.Element {
  const set = useSyncExternalStore(subscribeFullIconSet, fullIconSet, fullIconSet)
  useEffect(() => {
    void loadFullIconSet()
  }, [])
  const Glyph = set?.lucideGlyph(name) ?? icons['square-dashed']
  return <Glyph {...rest} />
}

export function Icon({
  name,
  size = '1em',
  style,
  ...rest
}: { name: string; size?: IconSize | LucideProps['size'] } & Omit<
  LucideProps,
  'size'
>): React.JSX.Element {
  const sized: LucideProps = isIconSize(size)
    ? { size: '1em', style: { ...style, fontSize: iconSizeVars[size] } }
    : { size, style }
  if (!Object.hasOwn(icons, name)) return <LazyGlyph name={name} {...rest} {...sized} />
  const Curated = icons[name as IconName]
  return <Curated {...rest} {...sized} />
}

// Both faces stay mounted in one grid cell so a toggle cross-fades rather than swapping glyphs outright.
export function LockGlyph({
  locked,
  size = 'control',
}: {
  locked: boolean
  size?: IconSize
}): React.JSX.Element {
  return (
    <span className={sym.glyphSwap}>
      <Icon
        name="locked"
        size={size}
        className={sym.glyphSwapFace}
        data-face={locked ? 'shown' : 'hidden'}
      />
      <Icon
        name="lock-outline"
        size={size}
        className={cx(sym.glyphSwapFace, sym.lockOpenFace)}
        data-face={locked ? 'hidden' : 'shown'}
      />
    </span>
  )
}
