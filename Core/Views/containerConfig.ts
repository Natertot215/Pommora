// open_in is collection-owned; a Set write is refused.

import { readContainerSidecar, type ContainerKind } from '../Nexus/schemas'
import type { OpenIn, ViewButton } from './viewRow'
import { ok, fail, type Result } from '../Contract/result'
import { writeSidecar, withSidecarLock } from '../Files/sidecar'

export type ContainerConfigPatch = {
  open_in?: OpenIn
  view_button?: ViewButton
}

/** Spread only the patch's defined keys, so an explicit `undefined` can't wipe an existing value. */
function definedOnly(patch: ContainerConfigPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = v
  return out
}

export async function setContainerConfig(
  folder: string,
  kind: ContainerKind,
  patch: ContainerConfigPatch,
): Promise<Result<null>> {
  if (kind === 'set' && patch.open_in !== undefined) {
    return fail('operation-failed', 'Open In is collection-owned.')
  }
  return withSidecarLock(folder, kind, async () => {
    const sidecar = await readContainerSidecar(folder, kind)
    if (sidecar === null) return fail('not-found', 'Container sidecar not found.')
    await writeSidecar(folder, kind, { ...sidecar, ...definedOnly(patch) })
    return ok(null)
  })
}
