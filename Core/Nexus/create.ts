import { basename, join, relJoin } from '../Paths/posix'
import { createDisambiguated } from '../Paths/names'
import { pathExists } from '../Files/atomicWrite'
import { fail, ok } from '../Contract/result'
import { contextWorldOf } from '../Contexts/contextResolve'
import { contextTarget, createSpace } from '../Contexts/contextWrite'
import { mintDefaultView } from '../Views/views'
import { readRegistry } from '../Properties/propertiesRegistry'
import { valueToWrite } from '../Properties/propertyValue'
import type { Json } from '../Files/stableJson'
import { contextSeeds, type MutateReply, type MutateRequest } from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import type { MutateContext } from './mutate'
import { createPage } from './page'
import { createFolderEntity, landingRefusal } from './folderEntity'
import { appendCollection, setChildOrder, setSpaceOrder } from './reorder'
import { liveTreeOf, mutableTarget } from './liveTree'

const created = (parentPath: string, r: { path: string }): MutateReply =>
  ok({ created: { path: relJoin(parentPath, basename(r.path)) } })

/** A Space or Context create that stepped past a taken name answers the one it landed under, which the slice announces; a page, Collection, or Set numbers itself silently, since their titles may repeat. */
export const landedAs = (asked: string, path: string): { landedAs?: string } =>
  basename(path) === asked ? {} : { landedAs: basename(path) }

export async function createPageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createPage' }>,
): Promise<MutateReply> {
  const parent = await mutableTarget(root, req.parentPath, CONTAINER_KINDS)
  if (!parent.ok) return parent
  const frontmatter: Json = {}
  if (req.seeds) {
    const defs = (await readRegistry(root)).defs
    for (const [id, value] of Object.entries(req.seeds)) {
      const seed = defs[id] ? valueToWrite(defs[id], value) : null
      if (seed && !seed.ok) return seed
      if (seed) frontmatter[defs[id].key] = seed.value
    }
  }
  const world = contextWorldOf((await liveTreeOf(root)).contexts)
  for (const [contextId, spaceIds] of contextSeeds(req)) {
    const target = contextTarget(world, contextId, spaceIds)
    if (!target.ok) return target
    frontmatter[target.value.key] = target.value.value
  }
  const r = await createDisambiguated(
    req.name,
    (name) => createPage(parent.value, name, { id: req.id, frontmatter }),
    (name) => pathExists(join(parent.value, `${name}.md`)),
  )
  if (!r.ok) return r
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
  const r = await createSpace(root, req.contextId, req.name, req.id)
  if (!r.ok) return r
  if (req.order) await setSpaceOrder(root, req.contextId, req.order)
  return ok({ created: r.value, ...landedAs(req.name, r.value.path) })
}
