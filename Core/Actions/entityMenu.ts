import { type ActionItem, joinGroups, openOrder } from './menuModel'
import { type CreateMenuAction, createMenuItems } from './createMenu'
import { type PageMetaAction, type PageMoveAction, pageMetaMenuItems } from './pageMenu'
import { type TitleMenuAction, titleMenuItems } from './identityMenus'
import { type PropertyAction, propertyBranchRows } from './propertyRows'
import { lockLabel, openLabel } from './toggleLabels'
import type { ContextTarget, Creator } from '../Nexus/mutateRequest'

export type EntityMenuAction =
  | PageMetaAction
  | PageMoveAction
  | PropertyAction
  | CreateMenuAction
  | 'open'
  | 'preview'
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
  if (target.kind === 'collection' || target.kind === 'set')
    return joinGroups<EntityMenuAction>([
      open,
      create,
      [
        { label: 'Rename', action: 'rename' },
        { label: 'Delete', action: 'delete' },
      ],
      [
        ...(target.host === 'sidebar'
          ? [
              {
                label: lockLabel(target.disclosureLocked ?? false, 'Folder'),
                action: 'lock' as const,
              },
            ]
          : []),
        { label: 'Reveal Location', action: 'reveal' },
      ],
    ])
  const identity: ActionItem<EntityMenuAction>[] =
    target.kind === 'space'
      ? [
          ...titleMenuItems(),
          ...(target.host === 'matrix'
            ? [{ label: 'Change Color', action: 'changeColor' as const }]
            : []),
          ...propertyBranchRows(target),
        ]
      : titleMenuItems()
  return joinGroups<EntityMenuAction>([
    open,
    create,
    identity,
    [{ label: 'Delete', action: 'delete' }],
  ])
}
