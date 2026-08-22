// Landing bytes in the asset directory — the one writer an adoption, a crop and the migration
// all cross, so a name that steps aside does so by the same rule wherever it came from.

import { basename, extname, join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { connectionText } from '@shared/connections'
import { ok, fail, type Result } from '@shared/result'
import { atomicWriteBinary, pathExists } from './io/atomicWrite'
import { liveAssetMap, patchHeldAssetMap, resolveAssetName } from './assetMap'
import { createDisambiguated } from './disambiguate'
import { assetsDir, relPosix } from './paths'

/** Write `bytes` into the asset root under `base`, answering the `[[Name.ext]]` that names it.
 *  A basename answers nexus-wide, so a name already held ANYWHERE under the root steps aside:
 *  landing a second file beside it would author the ambiguity resolution refuses to resolve. */
export async function writeAssetFile(
  root: string,
  assetDir: string,
  base: string,
  bytes: Buffer,
): Promise<Result<string>> {
  const dir = assetsDir(root, assetDir)
  await mkdir(dir, { recursive: true })
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
