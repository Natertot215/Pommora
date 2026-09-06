import { basename, relJoin } from '../Locations/posix'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { createDisambiguated } from '../Locations/disambiguate'
import { newId } from '../Locations/ids'
import { ok, type Result } from '../Contract/result'
import { indexWrittenPage } from '../Index/indexSeed'
import { mintDefaultView, VIEW_ID_PREFIX } from '../Views/views'
import { readRegistry } from '../Properties/propertiesRegistry'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import { NEW_PAGE_SLOT, type MutateReply, type MutateRequest } from '../Pages/mutateRequest'
import type { MutateContext } from './mutate'
import { createPage } from './page'
import { createFolderEntity } from './folderEntity'
import { setChildOrder } from './reorder'
import { noteValueWrite } from './valuesChanged'

const created = (parentPath: string, r: { id: string; path: string }): MutateReply =>
  ok({ created: { id: r.id, path: relJoin(parentPath, basename(r.path)) } })

export async function createPageOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createPage' }>,
): Promise<MutateReply> {
  const parent = await resolveUnderRoot(root, req.parentPath || '.')
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
  if (req.order)
    await setChildOrder(
      parent.value,
      'page_order',
      req.order.map((x) => (x === NEW_PAGE_SLOT ? r.value.id : x)),
    )
  await indexWrittenPage(root, r.value.path)
  noteValueWrite(root, r.value.path)
  return created(req.parentPath, r.value)
}

export async function createContainerOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'createContainer' }>,
): Promise<MutateReply> {
  const parent = await resolveUnderRoot(root, req.parentPath || '.')
  if (!parent.ok) return parent
  const extra: Record<string, unknown> = {
    views: [{ ...mintDefaultView([]), id: `${VIEW_ID_PREFIX}${newId()}` }],
  }
  const r: Result<{ id: string; path: string }> = await createDisambiguated(req.name, (name) =>
    createFolderEntity(parent.value, req.kind, name, extra),
  )
  return r.ok ? created(req.parentPath, r.value) : r
}
