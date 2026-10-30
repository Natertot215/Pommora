import { isPlainObject } from '../Contract/validators'
import { pathExists, updateNexusConfig, withIds, withoutId } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { dirname, join } from '../Paths/posix'
import { ok, type Result } from '../Contract/result'
import type { ChildOrderKey } from './mutateRequest'
import { CONTAINER_KINDS } from './entities'
import type { CollectionNode, PageNode, SetNode, SpaceNode } from './tree'

type ContainerOrderKey = ChildOrderKey | 'page_order'

type StateOrderWrite = Promise<Result<Record<string, unknown>>>

/** The one `state.json` order writer: every key goes through this file's single lock-taking RMW, and a patch with nothing to change returns null. */
const writeStateOrder = (
  nexusRoot: string,
  patch: (order: Record<string, unknown>) => Record<string, unknown> | null,
): StateOrderWrite =>
  updateNexusConfig(nexusRoot, 'state', (state) => {
    const next = patch(isPlainObject(state.order) ? state.order : {})
    return next && { ...state, order: next }
  })

const spacesOf = (order: Record<string, unknown>): Record<string, unknown> =>
  isPlainObject(order.spaces) ? order.spaces : {}

export const setCollectionOrder = (nexusRoot: string, ids: string[]): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => ({ ...order, collections: ids }))

// With no order written, the newest id already sorts last.
export const appendCollection = (nexusRoot: string, id: string): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) =>
    Array.isArray(order.collections) && order.collections.length
      ? { ...order, collections: [...order.collections, id] }
      : null,
  )

export const setPanelContextOrder = (nexusRoot: string, ids: string[]): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => ({ ...order, contexts: ids }))

export const setSpaceOrder = (
  nexusRoot: string,
  contextId: string,
  ids: string[],
): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => ({
    ...order,
    spaces: { ...spacesOf(order), [contextId]: ids },
  }))

const patchContainer = async (
  absFolder: string,
  fn: (cur: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<Result<unknown>> => {
  for (const kind of CONTAINER_KINDS)
    if (await pathExists(sidecarPath(absFolder, kind))) return patchSidecar(absFolder, kind, fn)
  return ok(null)
}

const dropFromChildOrder = (
  absFolder: string,
  key: ContainerOrderKey,
  id: string,
): Promise<Result<unknown>> => patchContainer(absFolder, (cur) => withoutId(cur, key, id))

/** What leaves an order: a node of the tree it left, or a Context by its id, since its finish may move its folder after its registry entry is gone. */
export type Departing =
  | PageNode
  | SetNode
  | CollectionNode
  | SpaceNode
  | { kind: 'context'; id: string }

/** A departing item leaves the order it sat in; a Context takes its own Space order with it, which its record keeps. */
export async function dropDeparture(root: string, item: Departing): Promise<void> {
  switch (item.kind) {
    case 'page':
    case 'set':
      await dropFromChildOrder(
        dirname(join(root, item.path)),
        item.kind === 'page' ? 'page_order' : 'set_order',
        item.id,
      )
      return
    case 'collection':
      await writeStateOrder(root, (order) => withoutId(order, 'collections', item.id))
      return
    case 'space':
      await writeStateOrder(root, (order) => {
        const spaces = withoutId(spacesOf(order), item.contextId, item.id)
        return spaces && { ...order, spaces }
      })
      return
    case 'context':
      await writeStateOrder(root, (order) => {
        const panel = withoutId(order, 'contexts', item.id)
        const { [item.id]: dropped, ...spaces } = spacesOf(order)
        return dropped === undefined ? panel : { ...(panel ?? order), spaces }
      })
      return
  }
}

export async function setChildOrder(
  absFolder: string,
  key: ContainerOrderKey,
  ids: string[],
): Promise<Result<null>> {
  const r = await patchContainer(absFolder, (cur) => withIds(cur, key, ids))
  return r.ok ? ok(null) : r
}
