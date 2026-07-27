import type { PropertyDefinition, PropertyType } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import { asRenderableIcon, Icon, type IconName } from '@renderer/design-system/symbols'
import { DashIcon } from './DashIcon'

/**
 * The single source for per-property-type presentation: the user-facing label + the standard Pommora
 * icon (catalogued in Features/Icons.md). `creatable` flags the user-pickable set, in picker order —
 * `context` is tier-only and `last_edited_time` is auto-managed. Types still awaiting a glyph carry no
 * `icon` and fall back to DashIcon.
 */
interface TypeMeta {
  label: string
  icon?: IconName
  creatable?: boolean
}

const PROPERTY_TYPES: Record<PropertyType, TypeMeta> = {
  number: { label: 'Number', icon: 'hash', creatable: true },
  checkbox: { label: 'Checkbox', icon: 'square-check', creatable: true },
  datetime: { label: 'Date', icon: 'calendar', creatable: true },
  select: { label: 'Select', icon: 'send', creatable: true },
  multi_select: { label: 'Multi-Select', icon: 'tags', creatable: true },
  status: { label: 'Status', icon: 'progress-check', creatable: true },
  url: { label: 'Link', icon: 'link', creatable: true },
  file: { label: 'File', icon: 'import', creatable: true },
  context: { label: 'Context', icon: 'layout-grid' },
  last_edited_time: { label: 'Last edited', icon: 'history' },
}

export const propertyTypeLabel = (type: PropertyType): string => PROPERTY_TYPES[type].label

/** The type's standard glyph name — for pickers that list properties by their real icon. */
export const propertyTypeIconName = (type: PropertyType): IconName | undefined =>
  PROPERTY_TYPES[type].icon

export const CREATABLE_TYPES = (Object.keys(PROPERTY_TYPES) as PropertyType[]).filter(
  (t) => PROPERTY_TYPES[t].creatable,
)

// Title isn't a user PropertyType (it's the reserved heading column), but it needs the same glyph
// vocabulary — its icon lives here so every surface renders it from one source.
export const TITLE_META: TypeMeta = { label: 'Title', icon: 'text-align-justify' }

export function PropertyTypeIcon({
  type,
  size = 16,
}: {
  type: PropertyType | 'title'
  size?: number
}): React.JSX.Element {
  const name = (type === 'title' ? TITLE_META : PROPERTY_TYPES[type]).icon
  return name ? <Icon name={name} size={size} /> : <DashIcon />
}

/** A pickable target row in a view-config pane (Sort's What, Filter's What). One shape, because the
 *  two panes differ only in WHICH defs qualify and which reserved entries lead. */
export interface PaneTarget {
  id: string
  label: string
  icon: IconName | undefined
}

/** The reserved leads both panes draw from. */
export const TITLE_TARGET: PaneTarget = {
  id: RESERVED_PROPERTY_ID.title,
  label: 'Title',
  icon: TITLE_META.icon,
}
export const MODIFIED_TARGET: PaneTarget = {
  id: RESERVED_PROPERTY_ID.modifiedAt,
  label: 'Modified',
  icon: propertyTypeIconName('last_edited_time'),
}

/** Schema defs → targets, keeping the def's own icon and falling back to its type glyph. */
export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
): PaneTarget[] =>
  schema.filter(qualifies).map((d) => ({
    id: d.id,
    label: d.name,
    icon: (asRenderableIcon(d.icon) as IconName | undefined) ?? propertyTypeIconName(d.type),
  }))
