import { type ActionItem, joinGroups, openOrder } from './menuModel'
import { type CreateMenuAction, type Creator, createMenuItems } from './createMenu'
import {
  type PageMenuContext,
  type PageMetaAction,
  type PageMoveAction,
  pageMetaMenuItems,
} from './pageMenu'
import { type TitleMenuAction, titleMenuItems } from './identityMenus'
import { type PropertyAction, propertyBranchRows } from './propertyRows'
import { lockLabel, openLabel } from './toggleLabels'
import { isContainer, type NodeKind } from '../Nexus/entities'
import type { RenameHost } from '../Session/editSlice'

export type EntityMenuTarget = PageMenuContext &
  ({ kind: NodeKind; id?: string } | { kind: 'context'; id?: never }) & {
    path: string
    title: string
    alreadyOpen?: boolean
    disclosureLocked?: boolean
    host?: RenameHost
  }

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
  target: EntityMenuTarget,
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
  if (isContainer(target))
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
