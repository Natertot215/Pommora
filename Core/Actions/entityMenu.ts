import { type ActionItem, afterSeparator, openOrder } from './menuModel'
import { type CreateMenuAction, createMenuItems } from './createMenu'
import { type PageMetaAction, type PageMoveAction, pageMetaMenuItems } from './pageMenu'
import { type TitleMenuAction, titleMenuItems } from './identityMenus'
import { type PropertyAction, propertyBranchRows } from './propertyRows'
import { openLabel } from './toggleLabels'
import type { ContextTarget, Creator } from '../Nexus/mutateRequest'

export type EntityMenuAction =
  | PageMetaAction
  | PageMoveAction
  | PropertyAction
  | CreateMenuAction
  | 'open'
  | 'preview'
  | 'rename'
  | 'delete'
  | 'lock'
  | 'reveal'
  | TitleMenuAction
  | 'changeColor'

export function entityMenuItems(
  target: ContextTarget,
  creators: readonly Creator[],
): ActionItem<EntityMenuAction>[] {
  if (target.kind === 'page')
    return pageMetaMenuItems(target.alreadyOpen, {
      window: true,
      newPages: target.host === 'matrix' ? undefined : 'pair',
      move: target,
      spaces: target.spaces,
      properties: target.properties,
      clipboard: true,
      history: true,
      reveal: true,
    })
  // Only the renderer knows the tab set; an already-open entity reads "Open" and focuses its tab.
  const open: ActionItem<EntityMenuAction>[] = target.id
    ? openOrder<EntityMenuAction>(
        target.alreadyOpen,
        [{ label: openLabel(target.alreadyOpen), action: 'open' }],
        target.kind === 'space' ? [{ label: 'Preview', action: 'preview' }] : [],
      )
    : []
  const create = createMenuItems(creators)
  const lock: ActionItem<EntityMenuAction>[] =
    target.host === 'sidebar' && (target.kind === 'collection' || target.kind === 'set')
      ? [{ label: target.disclosureLocked ? 'Unlock Folder' : 'Lock Folder', action: 'lock' }]
      : []
  const identity: ActionItem<EntityMenuAction>[] =
    target.kind === 'space'
      ? [
          ...titleMenuItems({ toggleIcon: true, iconHidden: target.headingIconHidden }),
          { label: 'Change Color', action: 'changeColor' },
        ]
      : target.kind === 'context'
        ? titleMenuItems()
        : [{ label: 'Rename', action: 'rename' }]
  const branches: ActionItem<EntityMenuAction>[] =
    target.kind === 'space' ? propertyBranchRows(target) : []
  const registry = target.kind === 'space' || target.kind === 'context'
  return [
    ...open,
    ...(open.length > 0 ? afterSeparator(create) : create),
    ...(open.length + create.length > 0 ? afterSeparator(identity) : identity),
    ...branches,
    { label: 'Delete', action: 'delete', separatorBefore: registry },
    ...afterSeparator<EntityMenuAction>(
      registry ? [] : [...lock, { label: 'Reveal Location', action: 'reveal' }],
    ),
  ]
}
