import { isPlainObject } from '../Contract/validators'
import { pathExists, updateNexusConfig, withIds, withoutId } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { dirname, join } from '../Paths/posix'
import { ok, type Result } from '../Contract/result'
import type { ChildOrderKey } from './mutateRequest'
import { CONTAINER_KINDS, type HeldKind } from './entities'
import type { NexusTree } from './tree'
import { containerAt, pageAt, spaceAt } from './treePatch'

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

/** A Context gone for good takes its panel id and its Space order with it. */
export const dropContextOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => {
    const panel = withoutId(order, 'contexts', contextId)
    const { [contextId]: dropped, ...spaces } = spacesOf(order)
    if (dropped === undefined) return panel
    return { ...(panel ?? order), spaces }
  })

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

/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left. A Context keeps its panel id while bundled, as its restore returns to it. */
export async function dropDeparture(
  root: string,
  tree: NexusTree,
  kind: HeldKind,
  rel: string,
): Promise<void> {
  switch (kind) {
    case 'page':
    case 'set': {
      const id = (kind === 'page' ? pageAt(tree, rel) : containerAt(tree, rel))?.id
      const key = kind === 'page' ? 'page_order' : 'set_order'
      if (id) await dropFromChildOrder(dirname(join(root, rel)), key, id)
      return
    }
    case 'collection': {
      const id = containerAt(tree, rel)?.id
      if (id) await writeStateOrder(root, (order) => withoutId(order, 'collections', id))
      return
    }
    case 'space': {
      const space = spaceAt(tree, rel)
      if (space)
        await writeStateOrder(root, (order) => {
          const spaces = withoutId(spacesOf(order), space.contextId, space.id)
          return spaces && { ...order, spaces }
        })
      return
    }
    case 'context':
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
