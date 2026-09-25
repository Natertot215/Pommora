import { isPlainObject } from '../Contract/validators'
import { pathExists, updateNexusConfig } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { ok, type Result } from '../Contract/result'
import type { ChildOrderKey } from './mutateRequest'
import { asStringArray } from './coerce'

type ContainerOrderKey = ChildOrderKey | 'page_order'

// Adopted-placeholder ids (`adopted-<hash>`) are in-memory only — the open-time adopter stamps a real ULID before any write captures them. Strip them so a transient id never lands in a persisted order array.
const persistable = (ids: string[]): string[] => ids.filter((id) => !id.startsWith('adopted-'))

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
  writeStateOrder(nexusRoot, (order) => ({ ...order, collections: persistable(ids) }))

export const setPanelContextOrder = (nexusRoot: string, ids: string[]): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => ({ ...order, contexts: persistable(ids) }))

export const setSpaceOrder = (
  nexusRoot: string,
  contextId: string,
  ids: string[],
): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => ({
    ...order,
    spaces: { ...spacesOf(order), [contextId]: persistable(ids) },
  }))

/** A deleted Context takes its Space order and its panel slot with it. */
export const dropContextOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
  writeStateOrder(nexusRoot, (order) => {
    const { [contextId]: dropped, ...spaces } = spacesOf(order)
    const contexts = asStringArray(order.contexts)
    if (dropped === undefined && !contexts?.includes(contextId)) return null
    return {
      ...order,
      spaces,
      ...(contexts && { contexts: contexts.filter((id) => id !== contextId) }),
    }
  })

export async function setChildOrder(
  absFolder: string,
  key: ContainerOrderKey,
  ids: string[],
): Promise<Result<null>> {
  for (const kind of ['collection', 'set'] as const) {
    if (await pathExists(sidecarPath(absFolder, kind))) {
      const r = await patchSidecar(absFolder, kind, (cur) => ({ ...cur, [key]: persistable(ids) }))
      return r.ok ? ok(null) : r
    }
  }
  return ok(null)
}
