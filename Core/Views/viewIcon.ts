import { asRenderableIcon } from '@pommora/uix/Symbols'
import { type SavedView, VIEW_KINDS, type ViewType } from '@pommora/core/Views/views'

type Glyphed = Pick<SavedView, 'icon' | 'type'>

export const viewGlyph = (view: Glyphed): string =>
  asRenderableIcon(view.icon) ?? VIEW_KINDS[view.type].icon

export function iconForTypeSwitch(view: Glyphed, newType: ViewType): string | undefined {
  const wasDefault = view.icon === undefined || view.icon === VIEW_KINDS[view.type].icon
  return wasDefault ? VIEW_KINDS[newType].icon : undefined
}
