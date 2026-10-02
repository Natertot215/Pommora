import { basename, extname, join, relative } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { connectionText } from '../Connections/connections'
import { ok, fail, type Result } from '../Contract/result'
import { atomicWriteBinary, pathExists } from '../Files/atomicWrite'
import { liveAssetMap, resolveAssetName } from './assetMap'
import { createDisambiguated, reservedAssetLeaf } from '../Paths/names'
import { assetsDir } from '../Paths/paths'

export async function writeAssetFile(
  root: string,
  assetDir: string,
  base: string,
  bytes: Uint8Array,
): Promise<Result<string>> {
  const dir = assetsDir(root, assetDir)
  if (reservedAssetLeaf(relative(root, join(dir, base))))
    return fail('reserved', `${base} is a reserved name at the assets root.`)
  await machine().mkdir(dir)
  const ext = extname(base)
  const map = await liveAssetMap(root)
  const taken = async (stem: string): Promise<boolean> =>
    resolveAssetName(map, `${stem}${ext}`) !== null || pathExists(join(dir, `${stem}${ext}`))
  return createDisambiguated(
    basename(base, ext),
    async (stem) => {
      const file = `${stem}${ext}`
      if (await taken(stem)) return fail('exists', `${file} already exists.`)
      const abs = join(dir, file)
      await atomicWriteBinary(abs, bytes)
      return ok(connectionText(file))
    },
    taken,
  )
}
