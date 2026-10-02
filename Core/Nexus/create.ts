import { basename, join, relJoin } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { contextsDir } from '../Paths/paths'
import { pathExists } from '../Files/atomicWrite'
import { readRegistryStrict } from '../Contexts/contextsRegistry'
import { fail, ok } from '../Contract/result'
import { contextWorldOf } from '../Contexts/contextResolve'
import { contextTarget, createSpace, setPageContext } from '../Contexts/contextWrite'
import { mintDefaultView } from '../Views/views'
import { readRegistry } from '../Properties/propertiesRegistry'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import {
  contextSeeds,
  type CreatePageRequest,
  type MutateReply,
  type MutateRequest,
} from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import type { MutateContext } from './mutate'
import { createPage } from './page'
import { createFolderEntity, landingRefusal } from './folderEntity'
import { appendCollection, setChildOrder, setSpaceOrder } from './reorder'
import { liveTreeOf, mutableTarget } from './liveTree'

const created = (parentPath: string, r: { path: string }): MutateReply =>
  ok({ created: { path: relJoin(parentPath, basename(r.path)) } })

export async function createPageOp(
  { root }: MutateContext,
  req: CreatePageRequest,
): Promise<MutateReply> {
  const parent = await mutableTarget(root, req.parentPath, CONTAINER_KINDS)
  if (!parent.ok) return parent
  const contexts = contextSeeds(req)
  const world = contextWorldOf((await liveTreeOf(root)).contexts)
  for (const [contextId, spaceIds] of contexts) {
    const target = contextTarget(world, contextId, spaceIds)
    if (!target.ok) return target
  }
  let values: { def: PropertyDefinition; value: PropertyValue }[] | undefined
  if (req.seeds) {
    const defs = (await readRegistry(root)).defs
    values = Object.entries(req.seeds).flatMap(([id, value]) => {
      const def = defs[id]
      return def ? [{ def, value }] : []
    })
  }
  const r = await createDisambiguated(
    req.name,
    (name) => createPage(parent.value, name, { id: req.id, values }),
    (name) => pathExists(join(parent.value, `${name}.md`)),
  )
  if (!r.ok) return r
  for (const [contextId, spaceIds] of contexts)
    await setPageContext(r.value.path, root, contextId, spaceIds)
  if (req.order) await setChildOrder(parent.value, 'page_order', req.order)
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
    views: [mintDefaultView([])],
  }
  const r = await createDisambiguated(
    req.name,
    async (name) =>
      (await landingRefusal(root, parent.value, name)) ??
      createFolderEntity(parent.value, req.kind, name, req.id, extra),
    (name) => pathExists(join(parent.value, name)),
  )
  if (!r.ok) return r
  if (req.order) await setChildOrder(parent.value, 'set_order', req.order)
  if (req.kind === 'collection') await appendCollection(root, req.id)
  return created(req.parentPath, r.value)
}

export async function createSpaceOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createSpace' }>,
): Promise<MutateReply> {
  const r = await createDisambiguated(
    req.name,
    (name) => createSpace(root, req.contextId, name, req.id),
    async (name) => {
      const reg = await readRegistryStrict(root)
      const def = reg.ok && reg.value.contexts.find((c) => c.id === req.contextId)
      return !!def && pathExists(join(contextsDir(root), def.title, name))
    },
  )
  if (!r.ok) return r
  if (req.order) await setSpaceOrder(root, req.contextId, req.order)
  return ok({ created: r.value })
}
