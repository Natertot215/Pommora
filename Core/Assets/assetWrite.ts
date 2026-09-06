import { basename, extname, join } from '../Locations/posix'
import { machine } from '../Platform/machine'
import { connectionText } from '../Connections/connections'
import { ok, fail, type Result } from '../Contract/result'
import { atomicWriteBinary, pathExists } from '../IO/atomicWrite'
import { liveAssetMap, patchHeldAssetMap, resolveAssetName } from './assetMap'
import { createDisambiguated } from '../Locations/disambiguate'
import { assetsDir, relPosix } from '../Locations/paths'

export async function writeAssetFile(
  root: string,
  assetDir: string,
  base: string,
  bytes: Uint8Array,
): Promise<Result<string>> {
  const dir = assetsDir(root, assetDir)
  await machine().mkdir(dir)
  const ext = extname(base)
  const map = await liveAssetMap(root)
  return createDisambiguated(basename(base, ext), async (stem) => {
    const file = `${stem}${ext}`
    const abs = join(dir, file)
    if (resolveAssetName(map, file) !== null || (await pathExists(abs)))
      return fail('exists', `${file} already exists.`)
    await atomicWriteBinary(abs, bytes)
    // The watcher never sees this: `atomicWriteBinary` records the write and the echo is
    // dropped, so the map is the writer's to keep current or the banner renders blank.
    patchHeldAssetMap(root, relPosix(root, abs), 'add')
    return ok(connectionText(file))
  })
}
