import { type ColumnType, FILEDATA, type PropertyDefinition, type PropertyType } from './properties'
import { asRenderableIcon, type IconName } from '@pommora/uix/Symbols'
import type { LabelShape } from '@pommora/uix/Labels/label-base.css'
import { DEFAULT_ENTITY_ICONS } from '../Assets/entityIconPolicy'

type Chip = Readonly<{ shape: LabelShape; glyph: IconName }>

interface TypeMeta {
  label: string
  icon: IconName
  chip?: Chip
  styleLabel?: 'Format'
}

const TAG: Chip = { shape: 'tag', glyph: 'tag' }

const TYPE_META: Record<ColumnType, TypeMeta> = {
  title: { label: FILEDATA.title.label, icon: 'text-align-justify' },
  text: { label: 'Text', icon: 'text-align-start' },
  number: { label: 'Number', icon: 'hash' },
  checkbox: { label: 'Checkbox', icon: 'square-check' },
  dateTime: { label: 'Date & Time', icon: 'calendar', styleLabel: 'Format' },
  select: { label: 'Select', icon: 'send', chip: TAG },
  multiSelect: { label: 'Multi-Select', icon: 'tags', chip: { shape: 'tag', glyph: 'tags' } },
  status: {
    label: 'Status',
    icon: 'progress-check',
    chip: { shape: 'pill', glyph: 'circle-dashed' },
  },
  link: { label: 'Link', icon: 'link', styleLabel: 'Format' },
  file: { label: 'File', icon: 'file-chart-column' },
  context: { label: 'Context', icon: DEFAULT_ENTITY_ICONS.context },
  createdTime: { label: FILEDATA.createdAt.label, icon: 'clock-plus', styleLabel: 'Format' },
  lastEditedTime: { label: FILEDATA.modifiedAt.label, icon: 'repeat', styleLabel: 'Format' },
}

export const propertyTypeLabel = (type: PropertyType): string => TYPE_META[type].label

export const propertyTypeIconName = (type: ColumnType): IconName => TYPE_META[type].icon

export const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type)

/** How an option of this type draws as a chip; an option with no declared type draws as a Select's. */
export const chipOf = (type: PropertyType | undefined): Chip =>
  type === undefined ? TAG : (TYPE_META[type].chip ?? TAG)

/** A look menu's name: Format where it sets how a value is written (Link and the dates), Style where it sets how it's drawn. */
export const styleLabel = (type: ColumnType): string => TYPE_META[type].styleLabel ?? 'Style'
