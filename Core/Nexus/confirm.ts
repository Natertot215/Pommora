import { takeAssetMapPush } from '../Assets/assetMap'
import type { HostContext } from '../Contract/handlers'
import { confirmBy, confirmRegistry } from './mutatePatch'
import { sessionRoot } from './session'
import type { NexusTree } from './tree'
import { flushValueWrites } from './valuesChanged'
import { patchContainerFromDisk, patchSettingsFromDisk } from './watchPatch'

export function pushConfirmed(ctx: HostContext, tree: NexusTree | null): void {
  if (!tree) return
  // One macrotask later, so the ask's own reply reaches the renderer before the confirming push.
  setTimeout(() => ctx.push('nexus:changed', tree), 0)
}

export function pushValueChanges(ctx: HostContext, root: string): void {
  const changes = flushValueWrites(root)
  if (changes.length) ctx.push('values:changed', changes)
}

/** `root` is the one the write was gated on: a switch that landed meanwhile has nothing of this write to confirm. */
export async function confirmWrite(
  ctx: HostContext,
  root: string,
  work: () => Promise<NexusTree | null>,
): Promise<void> {
  if (sessionRoot() !== root) return
  pushConfirmed(ctx, await work())
  setTimeout(() => {
    if (sessionRoot() === root) pushValueChanges(ctx, root)
  }, 0)
}

export async function confirmContainerWrite(
  ctx: HostContext,
  root: string,
  containerPath: unknown,
): Promise<void> {
  if (typeof containerPath !== 'string') return
  await confirmWrite(ctx, root, () =>
    confirmBy(root, () => patchContainerFromDisk(root, containerPath)),
  )
}

/** `containerPath` names the one Collection whose assignment list the write also moved; a bare call is a registry-only def edit, which the confirmer patches without opening a sidecar. */
export const confirmRegistryWrite = (
  ctx: HostContext,
  root: string,
  containerPath?: string,
): Promise<void> => confirmWrite(ctx, root, () => confirmRegistry(root, containerPath))

export const confirmSettingsWrite = (ctx: HostContext, root: string): Promise<void> =>
  confirmWrite(ctx, root, () => confirmBy(root, () => patchSettingsFromDisk(root)))

/** An asset a mutation adopted never reaches the watcher (its own write is echo-suppressed), so the write's channel is what tells the renderer. */
export function pushAssetWrites(ctx: HostContext, root: string): void {
  const moved = takeAssetMapPush(root)
  if (moved) ctx.push('assets:changed', moved)
}
