import {
  PROPERTY_TYPES,
  type PropertyDefinition,
  type PropertyType,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from '../properties'
import { asRenderableIcon, Icon, type IconName } from '@pommora/uix/Symbols'
import type { NexusTree } from '../../Nexus/tree'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'
import { contextsByIdOf } from '../../Contexts/contextIdentity'
import { RESERVED_LABEL } from './columnLabel'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'

interface TypeMeta {
  label: string
  icon: IconName
}

// Title isn't a PropertyType, but it shares the glyph vocabulary, so every surface renders it from here.
const TYPE_META: Record<PropertyType | 'title', TypeMeta> = {
  title: { label: 'Title', icon: 'text-align-justify' },
  number: { label: 'Number', icon: 'hash' },
  checkbox: { label: 'Checkbox', icon: 'square-check' },
  dateTime: { label: 'Date', icon: 'calendar' },
  select: { label: 'Select', icon: 'send' },
  multiSelect: { label: 'Multi-Select', icon: 'tags' },
  status: { label: 'Status', icon: 'progress-check' },
  link: { label: 'Link', icon: 'link' },
  file: { label: 'File', icon: 'file-chart-column' },
  context: { label: 'Context', icon: DEFAULT_ENTITY_ICONS.context },
  createdTime: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.createdAt], icon: 'clock-plus' },
  lastEditedTime: { label: RESERVED_LABEL[RESERVED_PROPERTY_ID.modifiedAt], icon: 'history' },
}

export const propertyTypeLabel = (type: PropertyType): string => TYPE_META[type].label

export const propertyTypeIconName = (type: PropertyType | 'title'): IconName => TYPE_META[type].icon

export const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type)

export const CREATABLE_TYPES = (Object.keys(PROPERTY_TYPES) as PropertyType[]).filter(
  (t) => PROPERTY_TYPES[t].origin === 'user',
)

export function PropertyTypeIcon({
  type,
  size = 'headline',
}: {
  type: PropertyType | 'title'
  size?: React.ComponentProps<typeof Icon>['size']
}): React.JSX.Element {
  const name = TYPE_META[type].icon
  return <Icon name={name} size={size} />
}

export interface PaneTarget {
  id: string
  label: string
  icon: string
}

export const TITLE_TARGET: PaneTarget = {
  id: RESERVED_PROPERTY_ID.title,
  label: TYPE_META.title.label,
  icon: TYPE_META.title.icon,
}
export const STAMP_TARGETS: PaneTarget[] = Object.entries(STAMP_TYPE).flatMap(([id, type]) =>
  type ? [{ id, label: propertyTypeLabel(type), icon: propertyTypeIconName(type) }] : [],
)

export const contextPaneTargets = (tree: NexusTree | null): PaneTarget[] =>
  [...contextsByIdOf(tree)].map(([id, c]) => ({ id, label: c.title, icon: c.icon }))

export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
): (PaneTarget & { def: PropertyDefinition })[] =>
  schema.filter(qualifies).map((d) => ({
    id: d.id,
    label: d.name,
    icon: propertyIcon(d),
    def: d,
  }))

export const targetOption = (t: PaneTarget): PickerOption<string> => ({
  value: t.id,
  label: t.label,
  icon: t.icon,
})
