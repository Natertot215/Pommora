import type { PropertyDefinition, PropertyType } from '@shared/properties'
import { RESERVED_PROPERTY_ID, STAMP_TYPE } from '@shared/properties'
import {
  asRenderableIcon,
  DEFAULT_ENTITY_ICONS,
  Icon,
  type IconName,
} from '@renderer/DesignSystem/Symbols'
import { displayPropertyName, RESERVED_LABEL } from '@renderer/Properties/Assignment/columnLabel'

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
  created_time: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.createdAt], icon: 'clock-plus' },
  last_edited_time: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.modifiedAt], icon: 'history' },
}

export const propertyTypeLabel = (type: PropertyType): string => PROPERTY_TYPES[type].label

export const propertyTypeIconName = (type: PropertyType): IconName | undefined =>
  PROPERTY_TYPES[type].icon

export const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type) ?? 'tag'

export const CREATABLE_TYPES = (Object.keys(PROPERTY_TYPES) as PropertyType[]).filter(
  (t) => PROPERTY_TYPES[t].creatable,
)

// Title isn't a user PropertyType (it's the reserved heading column), but it needs the same glyph
// vocabulary — its icon lives here so every surface renders it from one source.
const TITLE_META: TypeMeta = { label: 'Title', icon: 'text-align-justify' }

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
  icon: string | undefined
}

export const TITLE_TARGET: PaneTarget = {
  id: RESERVED_PROPERTY_ID.title,
  label: 'Title',
  icon: TITLE_META.icon,
}
export const STAMP_TARGETS: PaneTarget[] = Object.entries(STAMP_TYPE).flatMap(([id, type]) =>
  type ? [{ id, label: propertyTypeLabel(type), icon: propertyTypeIconName(type) }] : [],
)

export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
  capitalize = false,
): PaneTarget[] =>
  schema.filter(qualifies).map((d) => ({
    id: d.id,
    label: displayPropertyName(d.name, capitalize),
    icon: propertyIcon(d),
  }))
