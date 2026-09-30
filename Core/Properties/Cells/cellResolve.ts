import { optionsOf, type PropertyDefinition } from '../properties'

export const findOption = (def: PropertyDefinition | undefined, value: string) =>
  optionsOf(def).find((o) => o.value === value)
