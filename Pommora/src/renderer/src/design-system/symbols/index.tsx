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
  House,
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
  Plus,
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
import type { EntityIconKind } from '@shared/types'
import { CardsGrid, ListRounded, LockSolid, ProgressCheck } from './customGlyphs'
import { lucideGlyph } from './AllSymbols'
import { size as sizeTokens, type IconSize } from '../tokens/size.css'

/** Curated icon set — Lucide. This registry IS the roster: to add an icon, import it above and
 *  add a line here (tree-shaking keeps only these in the bundle). Tabler stays installed as a
 *  second source to pull from — both default to stroke 2, so they sit at the same weight with no
 *  override. */
export const icons = {
  house: House,
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
  scaling: Scaling,
  type: Type,
  shapes: Shapes,
  layers: Layers,
  'grip-vertical': GripVertical,
  'grip-horizontal': GripHorizontal,
  image: Image,
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
  lock: LockSolid,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof icons

export const asIconName = (value: unknown): IconName | undefined =>
  typeof value === 'string' && value in icons ? (value as IconName) : undefined

/** A stored icon id if it's RENDERABLE (curated OR any full-set Lucide id), else undefined — for the
 *  optional-icon sites that show nothing when unset (vs `iconNameOr`, which always resolves a fallback). */
export const asRenderableIcon = (value: unknown): string | undefined =>
  typeof value === 'string' && (value in icons || lucideGlyph(value) !== undefined)
    ? value
    : undefined

/** Resolve a stored icon to a renderable symbol id — kept if it's ANY Lucide id (curated OR the full
 *  set, so a user's arbitrary pick survives), else the fallback. Returns a bare string; `Icon` renders it. */
export const iconNameOr = (value: unknown, fallback: IconName): string =>
  typeof value === 'string' && (value in icons || lucideGlyph(value) !== undefined)
    ? value
    : fallback

/** The nexus's own glyph wherever it is drawn without a photo and without a chosen icon — the
 *  ribbon's homepage button, the homepage banner, the settings header and the navigation index all
 *  resolve here, so the nexus reads as one identity across every surface. */
export const DEFAULT_NEXUS_ICON: IconName = 'orbit'

/** The seed for `personalization.defaultIcons`. A nexus can override a kind's default; an
 *  entity's own `icon` overrides that in turn. */
export const DEFAULT_ENTITY_ICONS: Record<EntityIconKind, IconName> = {
  collection: 'gallery-vertical-end',
  set: 'folder-closed',
  space: 'layout-dashboard',
  page: 'file-text',
  context: 'layout-grid',
}

/** An entity's glyph, resolved from its two facts: the user-assigned `own` icon when it's
 *  renderable, else the type's default — the nexus's `defaults` override when it names a
 *  curated icon, else the seed. Both facts are required arguments: a surface says
 *  `own: undefined` to mean "type-level glyph", never by omission. */
export function entityIcon(
  kind: EntityIconKind,
  own: unknown,
  defaults: Partial<Record<EntityIconKind, string>> | undefined,
): string {
  return iconNameOr(own, asIconName(defaults?.[kind]) ?? DEFAULT_ENTITY_ICONS[kind])
}

const iconSizeVars = sizeTokens.icon
const isIconSize = (v: unknown): v is IconSize => typeof v === 'string' && v in iconSizeVars

/**
 * Render an icon by id: `<Icon name="folder-closed" />`. Resolves the CURATED registry first, then the
 * full Lucide set (a user's arbitrary pick), falling back to the dashed-square placeholder if neither
 * matches — so `name` is a bare `string`, not just a curated `IconName`.
 *
 * Size resolution:
 * - **Named step** (`size="title3"`) routes to the icon-size token — set as the glyph's
 *   `font-size` while lucide stays at `1em`, so one source (`size.icon.*`) drives it.
 * - **Default** (`1em`) follows the context font-size (the type scale).
 * - **Number / CSS length** (`size={18}`) passes straight through as an escape hatch.
 * Color follows `currentColor` in every case.
 */
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
