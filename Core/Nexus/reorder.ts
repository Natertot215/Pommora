import { machine } from '../Platform/machine'
import { rmwJsonStrict, pathExists } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES, sidecarPath } from '../Paths/paths'
import { ok, type Result } from '../Contract/result'
import type { ChildOrderKey } from './mutateRequest'
import { isPlainObject } from '../Properties/propertyValue'

type ContainerOrderKey = ChildOrderKey | 'page_order'

// Adopted-placeholder ids (`adopted-<hash>`) are in-memory only — the open-time adopter stamps a real ULID before any write captures them. Strip them so a transient id never lands in a persisted order array.
const persistable = (ids: string[]): string[] => ids.filter((id) => !id.startsWith('adopted-'))

/** The one `state.json` order writer: every key goes through this file's single lock-taking RMW. */
async function writeStateOrder(
  nexusRoot: string,
  ids: string[],
  patch: (order: Record<string, unknown>, clean: string[]) => Record<string, unknown>,
): Promise<Result<string[]>> {
  const clean = persistable(ids)
  await machine().mkdir(nexusDir(nexusRoot))
  const written = await rmwJsonStrict(
    nexusConfig(nexusRoot, NEXUS_CONFIG_FILES.state),
    (state) => ({ ...state, order: patch(isPlainObject(state.order) ? state.order : {}, clean) }),
    () => ({}),
  )
  return written.ok ? ok(clean) : written
}

export const setCollectionOrder = (nexusRoot: string, ids: string[]): Promise<Result<string[]>> =>
  writeStateOrder(nexusRoot, ids, (order, clean) => ({ ...order, collections: clean }))

export const setPanelContextOrder = (nexusRoot: string, ids: string[]): Promise<Result<string[]>> =>
  writeStateOrder(nexusRoot, ids, (order, clean) => ({ ...order, contexts: clean }))

export const setSpaceOrder = (
  nexusRoot: string,
  contextId: string,
  ids: string[],
): Promise<Result<string[]>> =>
  writeStateOrder(nexusRoot, ids, (order, clean) => ({
    ...order,
    spaces: { ...(isPlainObject(order.spaces) ? order.spaces : {}), [contextId]: clean },
  }))

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
