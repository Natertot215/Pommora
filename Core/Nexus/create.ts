import { basename, relJoin } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { fail, ok } from '../Contract/result'
import { createSpace, loadContextWorld, setPageContext } from '../Contexts/contextWrite'
import { indexWrittenPage } from '../Index/indexSeed'
import { mintDefaultView, mintViewId } from '../Views/views'
import { readRegistry } from '../Properties/propertiesRegistry'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import { fillSlot, type MutateReply, type MutateRequest } from './mutateRequest'
import type { MutateContext } from './mutate'
import { createPage } from './page'
import { createFolderEntity, landingRefusal } from './folderEntity'
import { setChildOrder, setSpaceOrder } from './reorder'
import { mutableTarget } from './liveTree'
import { CONTAINER_KINDS } from './mutateRequest'
import { noteValueWrite } from './valuesChanged'

const created = (parentPath: string, r: { id: string; path: string }): MutateReply =>
  ok({ created: { id: r.id, path: relJoin(parentPath, basename(r.path)) } })

export async function createPageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createPage' }>,
): Promise<MutateReply> {
  const parent = await mutableTarget(root, req.parentPath, CONTAINER_KINDS)
  if (!parent.ok) return parent
  let values: { def: PropertyDefinition; value: PropertyValue }[] | undefined
  if (req.seeds) {
    const defs = (await readRegistry(root)).defs
    values = Object.entries(req.seeds).flatMap(([id, value]) => {
      const def = defs[id]
      return def ? [{ def, value }] : []
    })
  }
  const r = await createDisambiguated(req.name, (name) =>
    createPage(parent.value, name, { values }),
  )
  if (!r.ok) return r
  // A Context seed is membership, not a property value, so it lands through the Context writer once the page exists.
  const contexts = Object.entries(req.seeds ?? {}).flatMap(([id, v]) =>
    v.kind === 'context' ? [[id, v.value] as const] : [],
  )
  if (contexts.length) {
    const world = await loadContextWorld(root)
    if (world.ok)
      for (const [contextId, spaceIds] of contexts)
        await setPageContext(r.value.path, root, world.value, contextId, spaceIds)
  }
  if (req.order) await setChildOrder(parent.value, 'page_order', fillSlot(req.order, r.value.id))
  await indexWrittenPage(root, r.value.path)
  noteValueWrite(root, r.value.path)
  return created(req.parentPath, r.value)
}

export async function createContainerOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createContainer' }>,
): Promise<MutateReply> {
  if (req.kind === 'collection' && req.parentPath)
    return fail('invalid-path', 'Collections live at the top of the Nexus.')
  const parent =
    req.kind === 'collection'
      ? ok(root)
      : await mutableTarget(root, req.parentPath, CONTAINER_KINDS)
  if (!parent.ok) return parent
  const extra: Record<string, unknown> = {
    views: [{ ...mintDefaultView([]), id: mintViewId() }],
  }
  const r = await createDisambiguated(
    req.name,
    async (name) =>
      (await landingRefusal(root, parent.value, name)) ??
      createFolderEntity(parent.value, req.kind, name, extra),
  )
  if (!r.ok) return r
  if (req.order) await setChildOrder(parent.value, 'set_order', fillSlot(req.order, r.value.id))
  return created(req.parentPath, r.value)
}

export async function createSpaceOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createSpace' }>,
): Promise<MutateReply> {
  const r = await createDisambiguated(req.name, (name) => createSpace(root, req.contextId, name))
  if (!r.ok) return r
  if (req.order) await setSpaceOrder(root, req.contextId, fillSlot(req.order, r.value.id))
  return ok({ created: r.value })
}
