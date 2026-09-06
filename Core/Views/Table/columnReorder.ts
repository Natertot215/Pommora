import { reorder } from '@pommora/uix/Interactions/drag'

/** Any hidden property is preserved at the tail so a later hide/show toggle can't drop it, and the full visible order is written explicitly so default-on reserved columns persist the slot they were dragged to. */
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
