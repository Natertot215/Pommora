// A page carries its icon in its month file, a Context in the registry, a container in its sidecar.

import { basename } from '../Paths/posix'
import { isReserved, resolveUnderRoot } from '../Paths/pathSafety'
import { rmwJsonStrict, setOrDrop } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { mutateRegistryFile } from '../Contexts/contextsRegistry'
import { ICON_KEY } from '../Contexts/spaceSidecar'
import { fault, ok } from '../Contract/result'
import { writePageMeta } from '../Nexus/pageMetadata'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'

export async function setIconOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setIcon' }>,
): Promise<MutateReply> {
  if (req.kind === 'page') return writePageMeta(root, req.path, { icon: req.icon })
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (await isReserved(root, abs)) return fault('That item can’t take an icon.')
  if (req.kind === 'context') {
    const title = basename(abs)
    const r = await mutateRegistryFile(root, (cur) => ({
      contexts: cur.contexts.map((c) => {
        if (c.title !== title) return c
        const next = { ...c }
        if (req.icon) next.icon = req.icon
        else delete next.icon
        return next
      }),
    }))
    return r.ok ? ok({}) : r
  }
  const written = await rmwJsonStrict(sidecarPath(abs, req.kind), (cur) => {
    if (typeof cur.id !== 'string') throw new Error('That item has no id.')
    return setOrDrop(cur, req.kind === 'space' ? ICON_KEY : 'icon', req.icon)
  })
  return written.ok ? ok({}) : written
}
