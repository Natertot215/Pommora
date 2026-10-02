import { isPlainObject } from '../Contract/validators'
import { pathExists, updateNexusConfig } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { ok, type Result } from '../Contract/result'
import type { ChildOrderKey } from './mutateRequest'
import { CONTAINER_KINDS } from './entities'

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

/** A Context gone for good takes its Space order with it. */
export const dropSpaceOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => {
    const { [contextId]: dropped, ...spaces } = spacesOf(order)
    return dropped === undefined ? null : { ...order, spaces }
  })

const patchContainer = async (
  absFolder: string,
  fn: (cur: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<Result<unknown>> => {
  for (const kind of CONTAINER_KINDS)
    if (await pathExists(sidecarPath(absFolder, kind))) return patchSidecar(absFolder, kind, fn)
  return ok(null)
}

const withOrder = (
  cur: Record<string, unknown>,
  key: ContainerOrderKey,
  ids: string[],
): Record<string, unknown> => {
  const { [key]: _, ...rest } = cur
  return ids.length > 0 ? { ...cur, [key]: ids } : rest
}

export const dropFromChildOrder = (
  absFolder: string,
  key: ContainerOrderKey,
  id: string,
): Promise<Result<unknown>> =>
  patchContainer(absFolder, (cur) => {
    const ids = cur[key]
    return Array.isArray(ids) && ids.includes(id)
      ? withOrder(
          cur,
          key,
          ids.filter((x) => x !== id),
        )
      : null
  })

export async function setChildOrder(
  absFolder: string,
  key: ContainerOrderKey,
  ids: string[],
): Promise<Result<null>> {
  const r = await patchContainer(absFolder, (cur) => withOrder(cur, key, ids))
  return r.ok ? ok(null) : r
}
