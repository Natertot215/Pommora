import type { IconName } from '@renderer/design-system/symbols'
import type { ViewType } from '@shared/views'

export function iconForTypeSwitch(
  currentIcon: string | undefined,
  oldType: ViewType,
  newType: ViewType,
  glyphOf: Record<ViewType, IconName>,
): IconName | undefined {
  const wasDefault = currentIcon === undefined || currentIcon === glyphOf[oldType]
  return wasDefault ? glyphOf[newType] : undefined
}
