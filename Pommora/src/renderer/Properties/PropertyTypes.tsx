import type { PropertyDefinition, PropertyType } from '@shared/properties'
import { RESERVED_PROPERTY_ID } from '@shared/properties'
import {
  asRenderableIcon,
  DEFAULT_ENTITY_ICONS,
  Icon,
  type IconName,
} from '@renderer/DesignSystem/Symbols'

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
  file: { label: 'File', icon: 'file-chart-column', creatable: true },
  context: { label: 'Context', icon: DEFAULT_ENTITY_ICONS.context },
  last_edited_time: { label: 'Last edited', icon: 'history' },
}

export const propertyTypeLabel = (type: PropertyType): string => PROPERTY_TYPES[type].label

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
  size = 'headline',
}: {
  type: PropertyType | 'title'
  size?: React.ComponentProps<typeof Icon>['size']
}): React.JSX.Element {
  const name = (type === 'title' ? TITLE_META : PROPERTY_TYPES[type]).icon
  return <Icon name={name ?? 'square-dashed'} size={size} />
}

export interface PaneTarget {
  id: string
  label: string
  icon: IconName | undefined
}

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

export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
): PaneTarget[] =>
  schema.filter(qualifies).map((d) => ({
    id: d.id,
    label: d.name,
    icon: (asRenderableIcon(d.icon) as IconName | undefined) ?? propertyTypeIconName(d.type),
  }))
