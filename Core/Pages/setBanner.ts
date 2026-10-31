import { machine } from '../Platform/machine'
import { mutableTarget } from '../Nexus/liveTree'
import { readTextOrNull, setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { writeNavigationState } from '../Navigation/navigationFile'
import { landValue } from '../Files/rootValues'
import { rewriteRoot, rewriteRootAt } from '../Nexus/governedRoot'
import { adoptImageSource, UNREADABLE } from '../Assets/adoptFile'
import { ok, type Result } from '../Contract/result'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'

export async function setBannerOp(
  root: string,
  req: Extract<MutateRequest, { op: 'setBanner' }>,
): Promise<MutateReply> {
  const adopt = async (): Promise<Result<string | null>> =>
    req.source ? adoptImageSource(root, req.source) : ok(null)
  const landed = (rel: string | null): MutateReply => ok(rel ? { adopted: rel } : {})

  if (req.kind === 'page') {
    const resolved = await mutableTarget(root, req.path, ['page'])
    if (!resolved.ok) return resolved
    const abs = resolved.value
    return machine().lock(abs, async () => {
      // Checked before the adoption, so a page gone since the tree held it adopts no image.
      if ((await readTextOrNull(abs)) === null) return UNREADABLE
      const adopted = await adopt()
      if (!adopted.ok) return adopted
      const rel = adopted.value
      const written = await rewriteRootAt(
        abs,
        rewriteRoot((raw) => landValue(raw, 'banner', rel)),
      )
      return written.ok ? landed(rel) : written
    })
  }

  if (req.kind === 'navview') {
    const adopted = await adopt()
    if (!adopted.ok) return adopted
    await writeNavigationState(root, { banner: adopted.value ?? undefined })
    return landed(adopted.value)
  }

  if (req.kind === 'homepage') {
    const adopted = await adopt()
    if (!adopted.ok) return adopted
    const written = await updateNexusConfig(root, 'homepage', (cur) =>
      setOrDrop(cur, 'banner', adopted.value),
    )
    return written.ok ? landed(adopted.value) : written
  }

  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const adopted = await adopt()
  if (!adopted.ok) return adopted
  const written = await patchSidecar(resolved.value, req.kind, (cur) =>
    setOrDrop(cur, 'banner', adopted.value),
  )
  return written.ok ? landed(adopted.value) : written
}
