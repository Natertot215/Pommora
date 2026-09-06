import { type Handlers, withRoot } from '../Contract/handlers'
import { fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import { isStringArray, NEEDS_CONFIG_PATCH } from '../Contract/validators'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { confirmContainerWrite } from '../Nexus/confirm'
import { sessionRoot } from '../Nexus/session'
import { type ContainerConfigPatch, setContainerConfig } from './containerConfig'
import { loadValues } from './loadValues'
import { savedView } from './views'
import { deleteView, reorderViews, saveView } from './viewsFile'

// View SELECTION is the per-machine activeViews pointer; this is the view DEFINITION.
async function resolveViewContainer(
  containerPath: unknown,
  kind: unknown,
): Promise<Result<{ folder: string; kind: 'collection' | 'set' }>> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  if (kind !== 'collection' && kind !== 'set')
    return fail('operation-failed', 'kind must be "collection" or "set".')
  const resolved = await resolveUnderRoot(root, containerPath)
  if (!resolved.ok) return resolved
  return ok({ folder: resolved.value, kind })
}

export const viewsHandlers = {
  'views:save': async (ctx, containerPath: unknown, kind: unknown, view: unknown) => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    const parsed = savedView.safeParse(view)
    if (!parsed.success) return fail('operation-failed', 'Invalid view payload.')
    const r = await saveView(c.value.folder, c.value.kind, parsed.data)
    if (r.ok) await confirmContainerWrite(ctx, containerPath)
    return r.ok ? ok({ id: r.value.id }) : r
  },

  'views:reorder': async (ctx, containerPath: unknown, kind: unknown, orderedIds: unknown) => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (!isStringArray(orderedIds))
      return fail('operation-failed', 'orderedIds must be a string array.')
    const r = await reorderViews(c.value.folder, c.value.kind, orderedIds)
    if (r.ok) await confirmContainerWrite(ctx, containerPath)
    return r
  },

  'views:delete': async (ctx, containerPath: unknown, kind: unknown, viewId: unknown) => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (typeof viewId !== 'string') return fail('operation-failed', 'A view id is required.')
    const r = await deleteView(c.value.folder, c.value.kind, viewId)
    if (r.ok) await confirmContainerWrite(ctx, containerPath)
    return r
  },

  'container:configure': async (ctx, containerPath: unknown, kind: unknown, patch: unknown) => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (patch === null || typeof patch !== 'object') return NEEDS_CONFIG_PATCH
    const r = await setContainerConfig(c.value.folder, c.value.kind, patch as ContainerConfigPatch)
    if (r.ok) await confirmContainerWrite(ctx, containerPath)
    return r
  },

  'view:loadValues': withRoot(async (root, _ctx, containerPath: unknown, pageIds: unknown) => {
    if (typeof containerPath !== 'string' || (pageIds !== undefined && !isStringArray(pageIds)))
      return fail('operation-failed', 'A container path, and optionally page ids, are required.')
    const resolved = await resolveUnderRoot(root, containerPath)
    if (!resolved.ok) return resolved
    return ok(await loadValues(root, containerPath, pageIds))
  }),
} satisfies Partial<Handlers>
