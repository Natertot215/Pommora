import { reorder } from '@renderer/Interactions/drag'

/**
 * Translate a header drag into a new `property_order`. The visible columns reorder; any hidden
 * property (present in `property_order` but filtered out of the rendered columns) is preserved at the
 * tail so a later hide/show toggle can't drop it — the drop-on-toggle persistence failure this guards against.
 *
 * The full visible order is written explicitly, so default-on reserved columns (Context columns, title) persist
 * the slot they were dragged to instead of snapping back to their resolver-default placement.
 */
export function reorderColumns(
  visibleIds: string[],
  propertyOrder: string[],
  activeId: string,
  overId: string,
): string[] {
  const next = reorder(
    visibleIds.map((id) => ({ id })),
    activeId,
    overId,
  ).map((o) => o.id)
  const hidden = propertyOrder.filter((id) => !visibleIds.includes(id))
  return [...next, ...hidden]
}
