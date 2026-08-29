import { wrapKey } from '@shared/governedKeys'
import type { PropertyDefinition } from '@shared/properties'

/** Fixtures name a property by ID because that is what a view addresses; on disk a value lives
 *  under its property's NAME. This keeps fixtures declarative while the storage shape stays the
 *  syntax module's business. An id with no matching definition passes through unwrapped, which is
 *  what lets a fixture express an unregistered key. */
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
