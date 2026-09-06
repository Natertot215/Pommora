import { resolveUnderRoot } from '../Locations/pathSafety'
import { readJsonObject, rmwJsonStrict, setOrDrop } from '../IO/atomicWrite'
import { sidecarPath } from '../Locations/paths'
import { updateNexusConfig } from '../Settings/settings'
import { fault, ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from './mutateRequest'

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
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const cfgPath = sidecarPath(resolved.value, req.kind)
  const id = (await readJsonObject(cfgPath))?.id
  if (typeof id !== 'string') return fault('That item has no id.')
  const written = await rmwJsonStrict(cfgPath, patch, () => ({ id }))
  return written.ok ? ok({}) : written
}
