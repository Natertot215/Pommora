import type { IconName } from '@renderer/design-system/symbols'
import type { ViewType } from '@shared/views'

/** Legacy `'tablecells'` sidecars count as the table type's default too. */
export function iconForTypeSwitch(
  currentIcon: string | undefined,
  oldType: ViewType,
  newType: ViewType,
  glyphOf: Record<ViewType, IconName>,
): IconName | undefined {
  const wasDefault =
    currentIcon === undefined ||
    currentIcon === glyphOf[oldType] ||
    (oldType === 'table' && currentIcon === 'tablecells')
  return wasDefault ? glyphOf[newType] : undefined
}
