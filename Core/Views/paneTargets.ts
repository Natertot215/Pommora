import { FILEDATA, type Filedata, type PropertyDefinition } from '../Properties/properties'
import type { NexusTree } from '../Nexus/tree'
import { contextsByIdOf } from '../Contexts/contextIdentity'
import type { PickerOption } from '@pommora/uix/Menus/PickerControl'
import { propertyIcon, propertyTypeIconName } from '../Properties/typeDisplay'
import { operatorsFor } from './valueKinds'

// Location has no column type, so its glyph is named here.
const filedataTarget = ({ id, label, type }: Filedata): PickerOption<string> => ({
  value: id,
  label,
  icon: type ? propertyTypeIconName(type) : 'folder',
})
export const FILEDATA_TARGETS = {
  title: filedataTarget(FILEDATA.title),
  createdAt: filedataTarget(FILEDATA.createdAt),
  modifiedAt: filedataTarget(FILEDATA.modifiedAt),
  location: filedataTarget(FILEDATA.location),
}

export const contextPaneTargets = (tree: NexusTree | null): PickerOption<string>[] =>
  [...contextsByIdOf(tree)].map(([id, c]) => ({ value: id, label: c.title, icon: c.icon }))

export const schemaTargets = (
  schema: PropertyDefinition[],
  qualifies: (def: PropertyDefinition) => boolean,
): PickerOption<string>[] =>
  schema.filter(qualifies).map((d) => ({ value: d.id, label: d.label, icon: propertyIcon(d) }))

export const filterTargets = (
  schema: PropertyDefinition[],
  tree: NexusTree | null,
  hasLocations = true,
): PickerOption<string>[] => [
  FILEDATA_TARGETS.title,
  // Every Location operator needs a location to point at, so with none it's a target that can never complete.
  ...(hasLocations ? [FILEDATA_TARGETS.location] : []),
  FILEDATA_TARGETS.createdAt,
  FILEDATA_TARGETS.modifiedAt,
  ...contextPaneTargets(tree),
  ...schemaTargets(schema, (d) => operatorsFor(d.id, d.type).length > 0),
]
