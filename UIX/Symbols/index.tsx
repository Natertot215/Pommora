import {
  AppWindow,
  ArrowUpDown,
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
  FolderOpen,
  FolderTree,
  GalleryVerticalEnd,
  Grid3x2,
  GripHorizontal,
  GripVertical,
  Hash,
  Heart,
  History,
  Image,
  Import,
  LayoutDashboard,
  LayoutGrid,
  Laptop,
  LayoutPanelLeft,
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
import { forwardRef, useEffect, useSyncExternalStore } from 'react'
import { CardsGrid, ListRounded, LockFilled, LockOutline, ProgressCheck } from './customGlyphs'
import { fileTypeGlyphs } from './fileTypes'
import { ICON_NAMES } from './iconNames'
import { size as sizeTokens, type IconSize } from '../Theme/theme-vars.css'

/** This registry IS the roster: to add an icon, import it above and add a line here. */
export const icons = {
  orbit: Orbit,
  calendar: Calendar,
  clock: Clock,
  'clock-fading': ClockFading,
  'clock-plus': ClockPlus,
  history: History,
  'gallery-vertical-end': GalleryVerticalEnd,
  'folder-closed': FolderClosed,
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
  pipette: Pipette,
  'wrap-text': WrapText,
  heart: Heart,
  hash: Hash,
  'square-check': SquareCheck,
  import: Import,
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
  'layout-panel-left': LayoutPanelLeft,
  'text-align-justify': TextAlignJustify,
  table: Grid3x2,
  'list-rounded': ListRounded,
  'cards-grid': CardsGrid,
  'progress-check': ProgressCheck,
  'columns-3-cog': Columns3Cog,
  locked: LockFilled,
  'lock-open': LockOutline,
  ...fileTypeGlyphs,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof icons

export const asIconName = (value: unknown): IconName | undefined =>
  typeof value === 'string' && value in icons ? (value as IconName) : undefined

// A renderable icon is a curated name or any id in the full Lucide roster. ICON_NAMES carries the
// roster as bare strings, so this validates synchronously without the glyph set: a real (even not-yet-
// loaded) id passes and its glyph arrives via LazyGlyph, while a bogus id falls to the caller's default.
export const asRenderableIcon = (value: unknown): string | undefined =>
  typeof value === 'string' && (value in icons || ICON_NAMES.has(value)) ? value : undefined

export const iconNameOr = (value: unknown, fallback: IconName): string =>
  asRenderableIcon(value) ?? fallback

// The full Lucide set behind a dynamic import, kept out of every non-picker bundle. LazyGlyph and
// the Icon Picker read this store; the module loads once, on first demand, and notifies subscribers.
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

const LazyGlyph = forwardRef<SVGSVGElement, { name: string } & LucideProps>(function LazyGlyph(
  { name, ...rest },
  ref,
): React.JSX.Element {
  const set = useSyncExternalStore(subscribeFullIconSet, fullIconSet, fullIconSet)
  useEffect(() => {
    void loadFullIconSet()
  }, [])
  const Glyph = set?.lucideGlyph(name) ?? icons['square-dashed']
  return <Glyph ref={ref} {...rest} />
})

export const Icon = forwardRef<
  SVGSVGElement,
  { name: string; size?: IconSize | LucideProps['size'] } & Omit<LucideProps, 'size'>
>(function Icon({ name, size = '1em', style, ...rest }, ref): React.JSX.Element {
  const sized: LucideProps = isIconSize(size)
    ? { size: '1em', style: { ...style, fontSize: iconSizeVars[size] } }
    : { size, style }
  const Curated = (icons as Record<string, LucideIcon>)[name]
  if (Curated) return <Curated ref={ref} {...rest} {...sized} />
  return <LazyGlyph ref={ref} name={name} {...rest} {...sized} />
})
