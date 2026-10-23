import {
  type ColumnType,
  FILEDATA,
  type PropertyDefinition,
  type PropertyType,
} from '../properties'
import { asRenderableIcon, Icon, type IconName } from '@pommora/uix/Symbols'
import { DEFAULT_ENTITY_ICONS } from '../../Assets/entityIconPolicy'

interface TypeMeta {
  label: string
  icon: IconName
}

const TYPE_META: Record<ColumnType, TypeMeta> = {
  title: { label: FILEDATA.title.label, icon: 'text-align-justify' },
  text: { label: 'Text', icon: 'text-align-start' },
  number: { label: 'Number', icon: 'hash' },
  checkbox: { label: 'Checkbox', icon: 'square-check' },
  dateTime: { label: 'Date', icon: 'calendar' },
  select: { label: 'Select', icon: 'send' },
  multiSelect: { label: 'Multi-Select', icon: 'tags' },
  status: { label: 'Status', icon: 'progress-check' },
  link: { label: 'Link', icon: 'link' },
  file: { label: 'File', icon: 'file-chart-column' },
  context: { label: 'Context', icon: DEFAULT_ENTITY_ICONS.context },
  createdTime: { label: FILEDATA.createdAt.label, icon: 'clock-plus' },
  lastEditedTime: { label: FILEDATA.modifiedAt.label, icon: 'repeat' },
}

export const propertyTypeLabel = (type: PropertyType): string => TYPE_META[type].label

export const propertyTypeIconName = (type: ColumnType): IconName => TYPE_META[type].icon

export const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type)

export function PropertyTypeIcon({
  type,
  size = 'headline',
}: {
  type: ColumnType
  size?: React.ComponentProps<typeof Icon>['size']
}): React.JSX.Element {
  const name = TYPE_META[type].icon
  return <Icon name={name} size={size} />
}
