import type { Handlers } from '../Contract/handlers'
import { fail, NO_NEXUS, ok } from '../Contract/result'
import { NOT_A_PROPERTY_DIR } from '../Contract/validators'
import { seedContentIndex } from '../Index/indexSeed'
import { assetSubRoot } from '../Locations/nexusPaths'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { assetsDir, relPosix } from '../Locations/paths'
import { join } from '../Locations/posix'
import { confirmSettingsWrite, pushAssetWrites } from '../Nexus/confirm'
import { refreshAfterWrite } from '../Nexus/liveTree'
import { adoptFile } from './adoptFile'
import { sessionRoot } from '../Nexus/session'
import { EMPTY_ASSET_MAP } from '../Nexus/tree'
import { validateAssetDir } from '../Settings/assetDirValidate'
import { readWatchScope, writeAssetDirectory } from '../Settings/settings'
import { liveAssetMap, refreshAssetMap } from './assetMap'
import { assetSubfolder, validPropertyDir } from './assetRoots'

// A picked file sits outside the nexus, so the channel that adopts one is bounded by the pick,
// not the root — the renderer never names a path the host did not choose.
const pickedPaths = new Set<string>()

export const assetsHandlers = {
  // Built on first ask and held; the watcher patches it in place.
  'assets:map': async () => {
    const root = sessionRoot()
    return root === null ? EMPTY_ASSET_MAP : liveAssetMap(root)
  },

  // A property's answer is relative to the ASSET root; the nexus's is relative to the nexus.
  'assets:chooseDir': async (ctx, scope?: 'nexus' | 'property', at?: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    const forProperty = scope === 'property'
    const { assetDir } = await readWatchScope(root)
    const from =
      forProperty && typeof at === 'string' && validPropertyDir(at, assetDir)
        ? await resolveUnderRoot(root, assetSubRoot(assetDir, at))
        : null
    const chosen = await ctx.pick('folder', {
      defaultPath: forProperty ? (from?.ok ? from.value : assetsDir(root, assetDir)) : root,
      message: forProperty
        ? 'Choose a folder for this property’s files'
        : 'Choose a folder for assets',
    })
    if (!chosen) return ok(null)
    if (!forProperty) return validateAssetDir(root, chosen)
    // Containment BEFORE the subtraction: a folder outside the asset root would otherwise have its
    // leading segments sliced off and be re-read as a plausible subfolder.
    const below = assetSubfolder(relPosix(root, chosen), assetDir)
    return below !== null && validPropertyDir(below, assetDir) ? ok(below) : NOT_A_PROPERTY_DIR
  },

  // Crosses the same validator the dialog's pick does, so a hand-typed path and a chosen one are
  // refused for identical reasons.
  'assets:setDir': async (ctx, dir: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof dir !== 'string') return fail('operation-failed', 'A folder path is required.')
    const trimmed = dir.trim()
    let next = ''
    if (trimmed) {
      const valid = await validateAssetDir(root, join(root, trimmed))
      if (!valid.ok) return valid
      next = valid.value
    }
    await writeAssetDirectory(root, next)
    // The write's own echo is suppressed, so the structural re-arm an external edit would trigger
    // never fires here.
    await confirmSettingsWrite(ctx)
    const tree = await refreshAfterWrite(root)
    await seedContentIndex(root)
    const assets = await refreshAssetMap(root)
    ctx.push('nexus:changed', tree)
    ctx.push('assets:changed', assets)
    await ctx.watch(root)
    return ok(next)
  },

  'nexus:pickFile': async (ctx, opts) => {
    const root = sessionRoot()
    const at = root && opts?.dir ? await resolveUnderRoot(root, opts.dir) : null
    const picked = await ctx.pick(opts?.any ? 'file' : 'image', {
      defaultPath: at?.ok ? at.value : (root ?? undefined),
    })
    if (picked) pickedPaths.add(picked)
    return picked
  },

  'nexus:pasteImage': async (ctx) => {
    const path = await ctx.pasteImage()
    if (path) pickedPaths.add(path)
    return path
  },

  // Bounded by the pick like every read-back of an outside path; the DESTINATION is refused
  // inside `adoptFile`, at the write.
  'assets:adopt': async (ctx, source: string, subfolder?: string) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (!pickedPaths.has(source)) return fail('invalid-path', 'That file was not picked here.')
    const adopted = await adoptFile(root, source, {
      allow: 'any',
      ...(subfolder ? { subfolder } : {}),
    })
    if (adopted.ok) pushAssetWrites(ctx)
    return adopted
  },
} satisfies Partial<Handlers>
