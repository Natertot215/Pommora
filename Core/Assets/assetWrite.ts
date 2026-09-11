import { basename, extname, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { connectionText } from '../Connections/connections'
import { ok, fail, type Result } from '../Contract/result'
import { atomicWriteBinary, pathExists } from '../Files/atomicWrite'
import { liveAssetMap, patchHeldAssetMap, resolveAssetName } from './assetMap'
import { createDisambiguated } from '../Paths/disambiguate'
import { CROPS_REL } from '../Paths/nexusPaths'
import { foldKey } from '../Paths/caseFold'
import { assetsDir, relPosix } from '../Paths/paths'

export async function writeAssetFile(
  root: string,
  assetDir: string,
  base: string,
  bytes: Uint8Array,
): Promise<Result<string>> {
  const dir = assetsDir(root, assetDir)
  if (foldKey(relPosix(root, join(dir, base))) === foldKey(CROPS_REL))
    return fail('reserved', `${base} is a reserved name at the assets root.`)
  await machine().mkdir(dir)
  const ext = extname(base)
  const map = await liveAssetMap(root)
  return createDisambiguated(basename(base, ext), async (stem) => {
    const file = `${stem}${ext}`
    const abs = join(dir, file)
    if (resolveAssetName(map, file) !== null || (await pathExists(abs)))
      return fail('exists', `${file} already exists.`)
    await atomicWriteBinary(abs, bytes)
    // `atomicWriteBinary` records the write and the echo is dropped, so the map is the writer's to keep current or the banner renders blank.
    patchHeldAssetMap(root, relPosix(root, abs), 'add')
    return ok(connectionText(file))
  })
}
