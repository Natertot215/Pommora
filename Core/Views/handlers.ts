import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { ok, type Result, fault } from '../Contract/result'
import { isPlainObject, isStringArray, NEEDS_CONFIG_PATCH } from '../Contract/validators'
import { type ContainerKind, coerceOpenIn, coerceViewButton } from '../Nexus/schemas'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { mutableTarget } from '../Nexus/liveTree'
import { confirmContainerWrite } from '../Nexus/confirm'
import { setContainerConfig } from './containerConfig'
import { loadValues } from './loadValues'
import { removedView, savedView } from './views'
import { deleteView, duplicateView, reorderViews, restoreView, saveView } from './viewsFile'

// View SELECTION is the container sidecar's `active_view`; this is the view DEFINITION.
const containerWrite = <A extends unknown[], T>(
  run: (folder: string, kind: ContainerKind, ...args: A) => Promise<Result<T>>,
) =>
  withWriteRoot(async (root, ctx, containerPath: unknown, kind: unknown, ...args: A) => {
    if (typeof containerPath !== 'string') return fault('A container path is required.')
    if (kind !== 'collection' && kind !== 'set') return fault('kind must be "collection" or "set".')
    const folder = await mutableTarget(root, containerPath, [kind])
    if (!folder.ok) return folder
    const r = await run(folder.value, kind, ...args)
    if (r.ok) await confirmContainerWrite(ctx, root, containerPath)
    return r
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

  'container:configure': containerWrite(async (folder, kind, patch: unknown) =>
    isPlainObject(patch)
      ? setContainerConfig(folder, kind, {
          open_in: coerceOpenIn(patch.open_in),
          view_button: coerceViewButton(patch.view_button),
        })
      : NEEDS_CONFIG_PATCH,
  ),

  'view:loadValues': withRoot(async (root, _ctx, containerPath: unknown, pageIds: unknown) => {
    if (typeof containerPath !== 'string' || (pageIds !== undefined && !isStringArray(pageIds)))
      return fault('A container path, and optionally page ids, are required.')
    const resolved = await resolveUnderRoot(root, containerPath)
    if (!resolved.ok) return resolved
    return ok(await loadValues(root, containerPath, pageIds))
  }),
} satisfies Partial<Handlers>
