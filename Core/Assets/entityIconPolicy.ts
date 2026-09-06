import type { IconName } from '@pommora/uix/Symbols'
import { asIconName, iconNameOr } from '@pommora/uix/Symbols'
import type { EntityIconKind } from '../Settings/personalization'

export const DEFAULT_NEXUS_ICON: IconName = 'orbit'

export const DEFAULT_ENTITY_ICONS: Record<EntityIconKind, IconName> = {
  collection: 'gallery-vertical-end',
  set: 'folder-closed',
  space: 'layout-dashboard',
  page: 'file-text',
  context: 'layout-grid',
}

export function entityIcon(
  kind: EntityIconKind,
  own: unknown,
  defaults: Partial<Record<EntityIconKind, string>> | undefined,
): string {
  return iconNameOr(own, asIconName(defaults?.[kind]) ?? DEFAULT_ENTITY_ICONS[kind])
}
