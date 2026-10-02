import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { ok, fault } from '../Contract/result'
import { isPlainObject, isString } from '../Contract/validators'
import { assetSubfolder, NOT_A_PROPERTY_DIR, validPropertyDir } from './assetRoots'
import { assetSubRoot } from '../Paths/nexusPaths'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { assetsDir } from '../Paths/paths'
import { join, relative } from '../Paths/posix'

import { adoptFile } from './adoptFile'
import { sessionRoot } from '../Nexus/session'
import { EMPTY_ASSET_MAP } from '../Nexus/tree'
import { validateAssetDir } from '../Settings/assetDirValidate'
import { readWatchScope, writeAssetDirectory } from '../Settings/settings'
import { liveAssetMap } from './assetMap'
import { migrateAssets } from './assetMigrate'
import { trashDeps } from '../Trash/bundle'

export const assetsHandlers = {
  'assets:map': withRoot(async (root) => ok(await liveAssetMap(root)), ok(EMPTY_ASSET_MAP)),

  'assets:chooseDir': withRoot(async (root, ctx, scope: unknown, at: unknown) => {
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
    const below = assetSubfolder(relative(root, chosen), assetDir)
    return below !== null && validPropertyDir(below, assetDir) ? ok(below) : NOT_A_PROPERTY_DIR
  }),

  'assets:setDir': withWriteRoot(async (root, ctx, dir: unknown) => {
    if (typeof dir !== 'string') return fault('A folder path is required.')
    const trimmed = dir.trim()
    let next = ''
    if (trimmed) {
      const valid = await validateAssetDir(root, join(root, trimmed))
      if (!valid.ok) return valid
      next = valid.value
    }
    await writeAssetDirectory(root, next)
    try {
      const migrated = await migrateAssets(root, await trashDeps(root, ctx))
      for (const { store, why } of migrated?.skipped ?? [])
        console.error(`assets: the legacy folder stays — ${store}: ${why}`)
    } catch (e) {
      console.error('assets: the migration stopped partway:', e)
    }
    return ok(next)
  }),

  'nexus:pickFile': async (ctx, opts: unknown) => {
    const root = sessionRoot()
    const { dir, any } = isPlainObject(opts) ? opts : {}
    const at = root && typeof dir === 'string' ? await resolveUnderRoot(root, dir) : null
    const picked = await ctx.pick(any === true ? 'file' : 'image', {
      defaultPath: at?.ok ? at.value : (root ?? undefined),
    })
    return ok(picked)
  },

  'nexus:pasteImage': async (ctx) => ok(await ctx.pasteImage()),

  'assets:adopt': withWriteRoot(async (root, _ctx, source: unknown, subfolder: unknown) => {
    if (!isString(source)) return fault('A source path is required.')
    if (subfolder !== undefined && !isString(subfolder)) return fault('Invalid subfolder.')
    return adoptFile(root, source, {
      allow: 'any',
      ...(subfolder ? { subfolder } : {}),
    })
  }),
} satisfies Partial<Handlers>
