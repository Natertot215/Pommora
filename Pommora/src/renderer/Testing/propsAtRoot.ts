import { wrapKey } from '@shared/governedKeys'
import type { PropertyDefinition } from '@shared/properties'

export const propsAtRoot = (
  props: Record<string, unknown>,
  defs: PropertyDefinition[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(props).map(([id, v]) => {
      const d = defs.find((x) => x.id === id)
      return [d ? wrapKey('property', d.name) : id, v]
    }),
  )
