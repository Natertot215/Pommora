import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { ok, type Result, fault } from '../Contract/result'
import { isPlainObject, isStringArray } from '../Contract/validators'
import { type ContainerKind, isContainerKind } from '../Nexus/entities'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { mutableTarget } from '../Nexus/liveTree'
import { loadValues } from './loadValues'
import { removedView, savedView } from './views'
import { deleteView, duplicateView, reorderViews, restoreView, saveView } from './viewsFile'

const containerWrite = <A extends unknown[], T>(
  run: (folder: string, kind: ContainerKind, ...args: A) => Promise<Result<T>>,
) =>
  withWriteRoot(async (root, _ctx, containerPath: unknown, kind: unknown, ...args: A) => {
    if (typeof containerPath !== 'string') return fault('A container path is required.')
    if (!isContainerKind(kind)) return fault('kind must be "collection" or "set".')
    const folder = await mutableTarget(root, containerPath, [kind])
    if (!folder.ok) return folder
    return run(folder.value, kind, ...args)
  })

export const viewsHandlers = {
  'views:save': containerWrite(async (folder, kind, base: unknown, patch: unknown) => {
    const parsed = savedView.safeParse(base)
    if (!parsed.success || !isPlainObject(patch)) return fault('Invalid view payload.')
    return saveView(folder, kind, parsed.data, patch)
  }),

  'views:duplicate': containerWrite(async (folder, kind, viewId: unknown) =>
    typeof viewId === 'string'
      ? duplicateView(folder, kind, viewId)
      : fault('A view id is required.'),
  ),

  'views:reorder': containerWrite(async (folder, kind, orderedIds: unknown) =>
    isStringArray(orderedIds)
      ? reorderViews(folder, kind, orderedIds)
      : fault('orderedIds must be a string array.'),
  ),

  'views:delete': containerWrite(async (folder, kind, viewId: unknown) =>
    typeof viewId === 'string' ? deleteView(folder, kind, viewId) : fault('A view id is required.'),
  ),

  'views:restore': containerWrite(async (folder, kind, removed: unknown) => {
    const parsed = removedView.safeParse(removed)
    return parsed.success
      ? restoreView(folder, kind, parsed.data)
      : fault('A removed view is required.')
  }),

  'view:loadValues': withRoot(async (root, _ctx, containerPath: unknown, pageIds: unknown) => {
    if (typeof containerPath !== 'string' || (pageIds !== undefined && !isStringArray(pageIds)))
      return fault('A container path, and optionally page ids, are required.')
    const resolved = await resolveUnderRoot(root, containerPath)
    if (!resolved.ok) return resolved
    return ok(await loadValues(root, containerPath, pageIds))
  }),
} satisfies Partial<Handlers>
