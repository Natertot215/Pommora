import { type ActionItem, afterSeparator } from './menuModel'
import { type CreateMenuAction, createMenuItems } from './createMenu'
import { type PageMetaAction, type PageMoveAction, pageMetaMenuItems } from './pageMenu'
import type { PropertyAction } from './propertyRows'
import { openLabel } from './toggleLabels'
import type { ContextTarget, Creator } from '../Nexus/mutateRequest'

export type EntityMenuAction =
  | PageMetaAction
  | PageMoveAction
  | PropertyAction
  | CreateMenuAction
  | 'open'
  | 'rename'
  | 'delete'
  | 'lock'
  | 'reveal'

export function entityMenuItems(
  target: ContextTarget,
  creators: readonly Creator[],
): ActionItem<EntityMenuAction>[] {
  if (target.kind === 'page')
    return pageMetaMenuItems(target.alreadyOpen, {
      window: true,
      newPages: 'pair',
      move: target,
      properties: target.properties,
      clipboard: true,
      history: true,
      reveal: true,
    })
  // Only the renderer knows the tab set; an already-open entity reads "Open" and focuses its tab.
  const open: ActionItem<EntityMenuAction>[] = target.id
    ? [{ label: openLabel(target.alreadyOpen), action: 'open' }]
    : []
  const create = createMenuItems(creators)
  const lock: ActionItem<EntityMenuAction>[] =
    target.host === 'sidebar' && (target.kind === 'collection' || target.kind === 'set')
      ? [{ label: target.disclosureLocked ? 'Unlock Folder' : 'Lock Folder', action: 'lock' }]
      : []
  return [
    ...open,
    ...(open.length > 0 ? afterSeparator(create) : create),
    { label: 'Rename', action: 'rename', separatorBefore: open.length + create.length > 0 },
    { label: 'Delete', action: 'delete' },
    ...afterSeparator<EntityMenuAction>([...lock, { label: 'Reveal Location', action: 'reveal' }]),
  ]
}
