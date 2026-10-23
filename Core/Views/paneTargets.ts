import { FILEDATA, type Filedata, type PropertyDefinition } from '../Properties/properties'
import type { NexusTree } from '../Nexus/tree'
import { contextsByIdOf } from '../Contexts/contextIdentity'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { propertyIcon, propertyTypeIconName } from '../Properties/typeDisplay'

export interface PaneTarget {
  id: string
  label: string
  icon: string
}

// Location has no column type, so its glyph is named here.
const filedataTarget = ({ id, label, type }: Filedata): PaneTarget => ({
  id,
  label,
  icon: type ? propertyTypeIconName(type) : 'folder',
})
export const FILEDATA_TARGETS = {
  title: filedataTarget(FILEDATA.title),
  createdAt: filedataTarget(FILEDATA.createdAt),
  modifiedAt: filedataTarget(FILEDATA.modifiedAt),
  location: filedataTarget(FILEDATA.location),
}

export const contextPaneTargets = (tree: NexusTree | null): PaneTarget[] =>
  [...contextsByIdOf(tree)].map(([id, c]) => ({ id, label: c.title, icon: c.icon }))

export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
): (PaneTarget & { def: PropertyDefinition })[] =>
  schema.filter(qualifies).map((d) => ({
    id: d.id,
    label: d.label,
    icon: propertyIcon(d),
    def: d,
  }))

export const targetOption = (t: PaneTarget): PickerOption<string> => ({
  value: t.id,
  label: t.label,
  icon: t.icon,
})
