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
  setImmediate(() => ctx.push('nexus:changed', tree))
}

export function pushValueChanges(ctx: HostContext, root: string): void {
  const changes = flushValueWrites(root)
  if (changes.length) ctx.push('values:changed', changes)
}

export async function confirmWrite(
  ctx: HostContext,
  work: (root: string) => Promise<NexusTree | null>,
): Promise<void> {
  const root = sessionRoot()
  if (root === null) return
  pushConfirmed(ctx, await work(root))
  setImmediate(() => {
    if (sessionRoot() === root) pushValueChanges(ctx, root)
  })
}

export async function confirmContainerWrite(
  ctx: HostContext,
  containerPath: unknown,
): Promise<void> {
  if (typeof containerPath !== 'string') return
  await confirmWrite(ctx, (root) =>
    confirmBy(root, () => patchContainerFromDisk(root, containerPath)),
  )
}

/** `containerPath` names the one Collection whose assignment list the write also moved; a bare
 *  call is a registry-only def edit, which the confirmer patches without opening a sidecar. */
export const confirmRegistryWrite = (ctx: HostContext, containerPath?: string): Promise<void> =>
  confirmWrite(ctx, (root) => confirmRegistry(root, containerPath))

export const confirmSettingsWrite = (ctx: HostContext): Promise<void> =>
  confirmWrite(ctx, (root) => confirmBy(root, () => patchSettingsFromDisk(root)))

/** An asset a mutation adopted never reaches the watcher (its own write is echo-suppressed), so
 *  the write's channel is what tells the renderer. */
export function pushAssetWrites(ctx: HostContext): void {
  const root = sessionRoot()
  if (root === null) return
  const moved = takeAssetMapPush(root)
  if (moved) ctx.push('assets:changed', moved)
}
