import type { IconName } from '@pommora/uix/Symbols'
import { asRenderableIcon } from '@pommora/uix/Symbols'
import type { HeldKind } from '../Nexus/entities'
import type { Personalization } from '../Settings/personalization'

export const DEFAULT_NEXUS_ICON: IconName = 'pommora'

export const DEFAULT_ENTITY_ICONS: Record<HeldKind, IconName> = {
  collection: 'gallery-vertical-end',
  set: 'folder-closed',
  space: 'layout-dashboard',
  page: 'file-text',
  context: 'layout-grid',
}

export function entityIcon(
  kind: HeldKind,
  own: unknown,
  defaults: Personalization['defaultIcons'],
): string {
  return asRenderableIcon(own) ?? asRenderableIcon(defaults?.[kind]) ?? DEFAULT_ENTITY_ICONS[kind]
}
