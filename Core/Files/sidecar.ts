import { sidecarPath } from '../Paths/paths'
import type { SidecarKind } from '../Paths/nexusPaths'
import { fail, type Result } from '../Contract/result'
import { asString } from '../Nexus/coerce'
import { machine } from '../Platform/machine'
import { readJsonObject, rmwLocked } from './atomicWrite'

/** The id and icon a sidecar names, from one read. */
export async function sidecarIdentity(
  absFolder: string,
  kind: SidecarKind,
): Promise<{ id?: string; icon?: string }> {
  const raw = await readJsonObject(sidecarPath(absFolder, kind))
  return { id: asString(raw?.id), icon: asString(raw?.icon) }
}

export const sidecarId = async (
  absFolder: string,
  kind: SidecarKind,
): Promise<string | undefined> => (await sidecarIdentity(absFolder, kind)).id

export type Refuse = (why: Result<never>) => null

/** `patchSidecar` for a caller already holding the sidecar's lock. */
export async function patchHeldSidecar(
  absFolder: string,
  kind: SidecarKind,
  fn: (cur: Record<string, unknown>, refuse: Refuse) => Record<string, unknown> | null,
): Promise<Result<Record<string, unknown>>> {
  let refused: Result<never> | null = null
  const refuse: Refuse = (why) => {
    refused = why
    return null
  }
  const written = await rmwLocked(sidecarPath(absFolder, kind), (cur) =>
    typeof cur.id === 'string'
      ? fn(cur, refuse)
      : refuse(fail('not-found', 'That item has no id.')),
  )
  return refused ?? written
}

export const patchSidecar: typeof patchHeldSidecar = (absFolder, kind, fn) =>
  machine().lock(sidecarPath(absFolder, kind), () => patchHeldSidecar(absFolder, kind, fn))
