import { type ActionItem, joinGroups, openOrder } from './menuModel'
import { type CreateMenuAction, type Creator, createMenuItems } from './createMenu'
import {
  type MetadataAction,
  type PageMetaAction,
  COPY_PATH_ROW,
  DELETE_ROW,
  REMOVAL_ROWS,
  RENAME_ROW,
  REVEAL_ROW,
} from './pageMenu'
import { type TitleMenuAction, titleMenuItems } from './identityMenus'
import { lockLabel, openLabel } from './toggleLabels'
import { type FolderNodeKind, isContainer } from '../Nexus/entities'
import type { RenameHost } from '../Session/editSlice'

export type EntityMenuTarget = (
  | { kind: 'page'; id: string }
  | { kind: FolderNodeKind; id?: string }
  | { kind: 'context'; id?: never }
) & {
  path: string
  title: string
  disclosureLocked?: boolean
  host?: RenameHost
}

export type EntityMenuAction =
  | Extract<
      PageMetaAction,
      'title:rename' | 'title:copypath' | 'title:reveal' | 'title:archive' | 'title:delete'
    >
  | MetadataAction
  | CreateMenuAction
  | 'open'
  | 'preview'
  | 'lock'
  | TitleMenuAction
  | 'changeColor'

export function entityMenuItems(
  target: Exclude<EntityMenuTarget, { kind: 'page' }> & {
    alreadyOpen?: boolean
    metadata?: readonly ActionItem<MetadataAction>[]
  },
  creators: readonly Creator[],
): ActionItem<EntityMenuAction>[] {
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
      [RENAME_ROW],
      [
        ...(target.host === 'sidebar'
          ? [
              {
                label: lockLabel(target.disclosureLocked ?? false, 'Folder'),
                action: 'lock' as const,
              },
            ]
          : []),
        COPY_PATH_ROW,
        REVEAL_ROW,
      ],
      target.kind === 'set' ? REMOVAL_ROWS : [DELETE_ROW],
    ])
  const identity: ActionItem<EntityMenuAction>[] =
    target.kind === 'space'
      ? [
          ...titleMenuItems(),
          ...(target.host === 'matrix'
            ? [{ label: 'Change Color', action: 'changeColor' as const }]
            : []),
          ...(target.metadata ?? []),
        ]
      : titleMenuItems()
  return joinGroups<EntityMenuAction>([open, create, identity, [DELETE_ROW]])
}
