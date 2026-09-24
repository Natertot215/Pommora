import { machine } from '../Platform/machine'
import { isReserved, resolveUnderRoot } from '../Paths/pathSafety'
import { readTextOrNull, setOrDrop } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { writeNavigationState } from '../Navigation/navigationFile'
import { setGovernedRootKeys } from '../Properties/governedWrite'
import { updateNexusConfig } from '../Settings/settings'
import { adoptImageSource } from '../Assets/adoptFile'
import { fault, ok, type Result } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'

export async function setBannerOp(
  { root }: MutateContext,
  req: Extract<MutateRequest, { op: 'setBanner' }>,
): Promise<MutateReply> {
  const adopt = async (): Promise<Result<string | null>> =>
    req.source ? adoptImageSource(root, req.source) : ok(null)
  const landed = (rel: string | null): MutateReply => ok(rel ? { adopted: rel } : {})

  if (req.kind === 'page') {
    const resolved = await resolveUnderRoot(root, req.path)
    if (!resolved.ok) return resolved
    const abs = resolved.value
    return machine().lock(abs, async () => {
      if ((await readTextOrNull(abs)) === null) return fault('That page could not be read.')
      const adopted = await adopt()
      if (!adopted.ok) return adopted
      const rel = adopted.value
      await setGovernedRootKeys(root, abs, rel ? { banner: rel } : {}, ['banner'])
      return landed(rel)
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

  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  if (await isReserved(root, resolved.value)) return fault('That item can’t take a banner.')
  const adopted = await adopt()
  if (!adopted.ok) return adopted
  const written = await patchSidecar(resolved.value, req.kind, (cur) =>
    setOrDrop(cur, 'banner', adopted.value),
  )
  return written.ok ? landed(adopted.value) : written
}
