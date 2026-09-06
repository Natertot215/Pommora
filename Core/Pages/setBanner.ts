// The adopted file is written to its owner before the replaced one is dropped, so a failed write never points at a deleted file.

import { machine } from '../Platform/machine'
import { isReserved, resolveUnderRoot } from '../Locations/pathSafety'
import { readJsonObject, readTextOrNull, rmwJsonStrict, setOrDrop } from '../IO/atomicWrite'
import { splitFrontmatter } from '../IO/pageFile'
import { nexusConfig, sidecarPath, NEXUS_CONFIG_FILES } from '../Locations/paths'
import { readNavigationFile, writeNavigationState } from '../Navigation/navigationFile'
import { setGovernedRootKeys } from '../Properties/governedWrite'
import { updateNexusConfig } from '../Settings/settings'
import { adoptImageSource, dropReplacedAsset } from '../Assets/adoptFile'
import { assetFileToDelete } from '../Assets/assetRoots'
import { fault, ok, type Result } from '../Contract/result'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from './mutateRequest'

export async function setBannerOp(
  { root, deps }: MutateContext,
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
      const existing = await readTextOrNull(abs)
      if (existing === null) return fault('That page could not be read.')
      const prev = await assetFileToDelete(root, splitFrontmatter(existing).banner)
      const adopted = await adopt()
      if (!adopted.ok) return adopted
      const rel = adopted.value
      await setGovernedRootKeys(root, abs, rel ? { banner: rel } : {}, ['banner'])
      await dropReplacedAsset(root, prev, rel, deps.trashToSystem)
      return landed(rel)
    })
  }

  if (req.kind === 'navview') {
    const prevNav = await assetFileToDelete(root, (await readNavigationFile(root)).banner)
    const adopted = await adopt()
    if (!adopted.ok) return adopted
    await writeNavigationState(root, { banner: adopted.value ?? undefined })
    await dropReplacedAsset(root, prevNav, adopted.value, deps.trashToSystem)
    return landed(adopted.value)
  }

  let cfgPath: string
  if (req.kind === 'homepage') {
    cfgPath = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
  } else {
    const resolved = await resolveUnderRoot(root, req.path)
    if (!resolved.ok) return resolved
    if (await isReserved(root, resolved.value)) return fault('That item can’t take a banner.')
    cfgPath = sidecarPath(resolved.value, req.kind)
  }
  const prev = await assetFileToDelete(root, (await readJsonObject(cfgPath))?.banner)
  const adopted = await adopt()
  if (!adopted.ok) return adopted
  const patch = (cur: Record<string, unknown>): Record<string, unknown> =>
    setOrDrop(cur, 'banner', adopted.value)
  const written =
    req.kind === 'homepage'
      ? await updateNexusConfig(root, 'homepage', patch)
      : await rmwJsonStrict(cfgPath, patch)
  if (!written.ok) return written
  await dropReplacedAsset(root, prev, adopted.value, deps.trashToSystem)
  return landed(adopted.value)
}
