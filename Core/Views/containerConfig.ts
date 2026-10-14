import type { ContainerKind } from '../Nexus/entities'
import type { ViewButton } from './viewRow'
import { ok, type Result } from '../Contract/result'
import { patchSidecar } from '../Files/sidecar'

export type ContainerConfigPatch = { view_button: ViewButton }

export async function setContainerConfig(
  folder: string,
  kind: ContainerKind,
  patch: ContainerConfigPatch,
): Promise<Result<null>> {
  const written = await patchSidecar(folder, kind, (cur) => ({ ...cur, ...patch }))
  return written.ok ? ok(null) : written
}
