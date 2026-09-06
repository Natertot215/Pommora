import { basename, extname, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { relPosix } from '../Paths/paths'
import { assetSubRoot } from '../Paths/nexusPaths'
import { WEB_ADDRESS } from '../Paths/url'
import { neverWatched } from '../Paths/exclusion'
import { setOrDrop } from '../Files/atomicWrite'
import { readWatchScope, updateCrops } from '../Settings/settings'
import { connectionText, embeddableTitle } from '../Connections/connections'
import { fault, ok, type Result } from '../Contract/result'
import { ASSET_MIME } from './assetMime'
import { AMBIGUOUS, indexable, liveAssetMap, resolveAssetName } from './assetMap'
import {
  assetFileToDelete,
  NOT_A_PROPERTY_DIR_MESSAGE,
  underAssetRoot,
  validPropertyDir,
} from './assetRoots'
import { writeAssetFile } from './assetWrite'

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

export async function adoptFile(
  root: string,
  absSource: string,
  opts: { allow: 'image' | 'any'; subfolder?: string },
): Promise<Result<string>> {
  const base = basename(absSource)
  if (!base || !embeddableTitle(base) || neverWatched(base))
    return fault('That file’s name can’t be written as a link.')
  if (opts.allow === 'image' && !(extname(base).toLowerCase() in ASSET_MIME))
    return fault('That file isn’t an image Pommora can show.')
  const { assetDir } = await readWatchScope(root)
  const dir = assetSubRoot(assetDir, opts.subfolder)
  if (opts.subfolder !== undefined && !validPropertyDir(opts.subfolder, assetDir))
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  // Resolving the SUBFOLDER, not the root, is what catches a segment inside the root that is a symlink out.
  const canonical = await resolveUnderRoot(root, dir)
  if (!canonical.ok && canonical.error.code !== 'not-found') return canonical
  if (
    opts.subfolder &&
    canonical.ok &&
    !underAssetRoot(relPosix(await machine().realpath(root), canonical.value), assetDir)
  )
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  const hit = resolveAssetName(await liveAssetMap(root), base)
  if (hit === AMBIGUOUS) return fault(`More than one file is named ${base}.`)

  // A pick from a hidden folder under the root would mint a reference that never resolves; it copies instead.
  const srcRel = relPosix(await machine().realpath(root), await machine().realpath(absSource))
  if (underAssetRoot(srcRel, assetDir) && indexable(srcRel, assetDir))
    return ok(connectionText(base))

  const bytes = await machine()
    .readBytes(absSource)
    .catch(() => null)
  if (!bytes) return fault('That file could not be read.')
  const held = hit
    ? await machine()
        .readBytes(join(root, hit))
        .catch(() => null)
    : null
  if (held && sameBytes(bytes, held)) return ok(connectionText(base))
  return writeAssetFile(root, dir, base, bytes)
}

export const adoptImageSource = (root: string, source: string): Promise<Result<string>> =>
  WEB_ADDRESS.test(source)
    ? Promise.resolve(ok(source))
    : adoptFile(root, source, { allow: 'image' })

export async function dropReplacedAsset(
  root: string,
  prev: string | null,
  next: string | null,
  trash: (absPath: string) => Promise<void>,
): Promise<void> {
  if (!prev || prev === (await assetFileToDelete(root, next))) return
  await trash(join(root, prev)).catch(() => {})
  await updateCrops(root, (b) => setOrDrop(b, prev, null)).catch(() => {})
}
