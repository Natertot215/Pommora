import { resolveUnderRoot } from '../Locations/pathSafety'
import { readJsonObject, rmwJsonStrict, setOrDrop } from '../IO/atomicWrite'
import { nexusConfig, sidecarPath, NEXUS_CONFIG_FILES } from '../Locations/paths'
import { fault, ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from './mutateRequest'

export async function setHeadingIconHiddenOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setHeadingIconHidden' }>,
): Promise<MutateReply> {
  if (req.kind === 'navview') return fault('The NavView has no heading icon.')
  if (req.kind === 'page') return fault('A page has no heading icon.')
  let cfgPath: string
  let fallback: Record<string, unknown>
  if (req.kind === 'homepage') {
    cfgPath = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
    fallback = {}
  } else {
    const resolved = await resolveUnderRoot(root, req.path)
    if (!resolved.ok) return resolved
    cfgPath = sidecarPath(resolved.value, req.kind)
    const id = (await readJsonObject(cfgPath))?.id
    if (typeof id !== 'string') return fault('That item has no id.')
    fallback = { id }
  }
  const written = await rmwJsonStrict(
    cfgPath,
    (cur) => setOrDrop(cur, 'heading_icon_hidden', req.hidden),
    () => fallback,
  )
  return written.ok ? ok({}) : written
}
