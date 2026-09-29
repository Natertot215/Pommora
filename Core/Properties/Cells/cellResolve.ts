import { optionsOf, type PropertyDefinition } from '@pommora/core/Properties/properties'

export const findOption = (def: PropertyDefinition | undefined, value: string) =>
  optionsOf(def).find((o) => o.value === value)
