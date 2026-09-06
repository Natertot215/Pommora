import { type Handlers, withRoot } from '../Contract/handlers'
import { fail, ok } from '../Contract/result'
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
import { migrateAssets } from './assetMigrate'
import { assetSubfolder, validPropertyDir } from './assetRoots'

// Bounded by the pick, not the root — the renderer never names a path the host did not choose.
const pickedPaths = new Set<string>()

export const assetsHandlers = {
  'assets:map': async () => {
    const root = sessionRoot()
    return root === null ? EMPTY_ASSET_MAP : liveAssetMap(root)
  },

  // A property's answer is relative to the ASSET root; the nexus's is relative to the nexus.
  'assets:chooseDir': withRoot(async (root, ctx, scope?: 'nexus' | 'property', at?: unknown) => {
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
    // Containment BEFORE the subtraction: a folder outside the asset root would otherwise have its leading segments sliced off and re-read as a plausible subfolder.
    const below = assetSubfolder(relPosix(root, chosen), assetDir)
    return below !== null && validPropertyDir(below, assetDir) ? ok(below) : NOT_A_PROPERTY_DIR
  }),

  'assets:setDir': withRoot(async (root, ctx, dir: unknown) => {
    if (typeof dir !== 'string') return fail('operation-failed', 'A folder path is required.')
    const trimmed = dir.trim()
    let next = ''
    if (trimmed) {
      const valid = await validateAssetDir(root, join(root, trimmed))
      if (!valid.ok) return valid
      next = valid.value
    }
    await writeAssetDirectory(root, next)
    // A failure leaves every reference where it was rather than failing the change.
    try {
      await migrateAssets(root)
    } catch (e) {
      console.error('assets: the migration failed; references are unchanged:', e)
    }
    // The write's own echo is suppressed, so the structural re-arm an external edit would trigger never fires here.
    await confirmSettingsWrite(ctx)
    const tree = await refreshAfterWrite(root)
    await seedContentIndex(root)
    const assets = await refreshAssetMap(root)
    ctx.push('nexus:changed', tree)
    ctx.push('assets:changed', assets)
    await ctx.watch(root)
    return ok(next)
  }),

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

  // Bounded by the pick; the DESTINATION is refused inside `adoptFile`, at the write.
  'assets:adopt': withRoot(async (root, ctx, source: string, subfolder?: string) => {
    if (!pickedPaths.has(source)) return fail('invalid-path', 'That file was not picked here.')
    const adopted = await adoptFile(root, source, {
      allow: 'any',
      ...(subfolder ? { subfolder } : {}),
    })
    if (adopted.ok) pushAssetWrites(ctx)
    return adopted
  }),
} satisfies Partial<Handlers>
