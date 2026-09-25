import { setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { fault, ok } from '../Contract/result'
import { mutableTarget } from '../Nexus/liveTree'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'

export async function setHeadingIconHiddenOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setHeadingIconHidden' }>,
): Promise<MutateReply> {
  if (req.kind === 'navview') return fault('The NavView has no heading icon.')
  if (req.kind === 'page') return fault('A page has no heading icon.')
  const patch = (cur: Record<string, unknown>): Record<string, unknown> =>
    setOrDrop(cur, 'heading_icon_hidden', req.hidden)
  if (req.kind === 'homepage') {
    const written = await updateNexusConfig(root, 'homepage', patch)
    return written.ok ? ok({}) : written
  }
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const written = await patchSidecar(resolved.value, req.kind, patch)
  return written.ok ? ok({}) : written
}
