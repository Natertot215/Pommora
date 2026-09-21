import { machine } from '../Platform/machine'
import type { z } from 'zod'
import { rmwJsonStrict, pathExists } from '../Files/atomicWrite'
import {
  nexusDir,
  nexusConfig,
  NEXUS_CONFIG_FILES,
  sidecarPath,
  type SidecarKind,
} from '../Paths/paths'
import { updateFolderSidecar } from './folderEntity'
import { pageCollectionSidecar, pageSetSidecar } from './schemas'
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

export async function setContainerOrder<S extends z.ZodType>(
  absFolder: string,
  kind: SidecarKind,
  schema: S,
  key: ContainerOrderKey,
  ids: string[],
): Promise<Result<z.infer<S>>> {
  return updateFolderSidecar(absFolder, kind, schema, { [key]: persistable(ids) } as Partial<
    z.infer<S>
  >)
}

const CONTAINER_SIDECARS = [
  { kind: 'collection' as const, schema: pageCollectionSidecar },
  { kind: 'set' as const, schema: pageSetSidecar },
]

export async function setChildOrder(
  absFolder: string,
  key: ContainerOrderKey,
  ids: string[],
): Promise<Result<null>> {
  for (const { kind, schema } of CONTAINER_SIDECARS) {
    if (await pathExists(sidecarPath(absFolder, kind))) {
      const r = await setContainerOrder(absFolder, kind, schema, key, ids)
      if (!r.ok) return r
      return ok(null)
    }
  }
  return ok(null)
}
