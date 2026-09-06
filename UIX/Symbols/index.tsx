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
import { forwardRef } from 'react'
import { CardsGrid, ListRounded, LockFilled, LockOutline, ProgressCheck } from './customGlyphs'
import { fileTypeGlyphs } from './fileTypes'
import { lucideGlyph } from './allSymbols'
import { size as sizeTokens, type IconSize } from '../Theme/theme-vars.css'

/** Curated icon set — the app's semantic vocabulary. This registry IS the roster: to add an icon,
 *  import it above and add a line here. Tabler is a second source, pulled in by name where it is
 *  needed — both default to stroke 2, so they sit at the same weight with no override. */
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

export const asRenderableIcon = (value: unknown): string | undefined =>
  typeof value === 'string' && (value in icons || lucideGlyph(value) !== undefined)
    ? value
    : undefined

export const iconNameOr = (value: unknown, fallback: IconName): string =>
  asRenderableIcon(value) ?? fallback

const iconSizeVars = sizeTokens.icon
const isIconSize = (v: unknown): v is IconSize => typeof v === 'string' && v in iconSizeVars

export const Icon = forwardRef<
  SVGSVGElement,
  { name: string; size?: IconSize | LucideProps['size'] } & Omit<LucideProps, 'size'>
>(function Icon({ name, size = '1em', style, ...rest }, ref): React.JSX.Element {
  const Glyph =
    (icons as Record<string, LucideIcon>)[name] ?? lucideGlyph(name) ?? icons['square-dashed']
  if (isIconSize(size)) {
    return (
      <Glyph ref={ref} size="1em" {...rest} style={{ ...style, fontSize: iconSizeVars[size] }} />
    )
  }
  return <Glyph ref={ref} size={size} {...rest} style={style} />
})
