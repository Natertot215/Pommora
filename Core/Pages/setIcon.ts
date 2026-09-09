// A page carries its icon in frontmatter, a Context in the registry, a container in its sidecar.

import { machine } from '../Platform/machine'
import { basename } from '../Paths/posix'
import { isReserved, resolveUnderRoot } from '../Paths/pathSafety'
import { readTextOrNull, rmwJsonStrict, setOrDrop } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { setGovernedRootKeys } from '../Properties/governedWrite'
import { mutateRegistryFile } from '../Contexts/contextsRegistry'
import { fault, ok } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'

export async function setIconOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setIcon' }>,
): Promise<MutateReply> {
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (req.kind === 'page')
    return machine().lock(abs, async () => {
      if ((await readTextOrNull(abs)) === null) return fault('That page could not be read.')
      await setGovernedRootKeys(root, abs, req.icon ? { icon: req.icon } : {}, ['icon'])
      return ok({})
    })
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
    return setOrDrop(cur, 'icon', req.icon)
  })
  return written.ok ? ok({}) : written
}
