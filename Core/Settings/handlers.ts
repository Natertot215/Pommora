import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import { machine } from '../Platform/machine'
import { seedContentIndex } from '../Index/indexSeed'
import type { NavViewModes, SubfieldConfig } from '../Interface/chrome'
import { rootSegs } from '../Paths/exclusion'
import { relPosix } from '../Paths/paths'
import { confirmSettingsWrite } from '../Nexus/confirm'
import { refreshAfterWrite } from '../Nexus/liveTree'
import { sweepFileHistory } from '../Pages/fileHistory'
import { nexusFolderRefusal } from './codec'
import { clearExclusionData } from './exclusionScan'
import {
  readNavViewModes,
  readSubfield,
  readWatchScope,
  sanitizeExclusions,
  writeExcludedFolders,
  writeNavViewModes,
  writePersonalization,
  writeSubfield,
} from './settings'

export const settingsHandlers = {
  // Duplicates collapse on the case-folded path the matcher compares, so `archive` and `Archive` are one folder while the spelling the user typed is what's stored.
  'exclusions:set': withWriteRoot(async (root, ctx, folders: unknown) => {
    const sanitized = sanitizeExclusions(folders)
    if (!sanitized.ok) return sanitized
    const next = sanitized.value
    await writeExcludedFolders(root, next)
    // The write's own echo is suppressed, so the re-arm an external edit would trigger never fires here.
    await confirmSettingsWrite(ctx, root)
    const tree = await refreshAfterWrite(root)
    await seedContentIndex(root)
    ctx.push('nexus:changed', tree)
    await ctx.watch(root)
    return ok(next)
  }),

  'exclusions:choose': withRoot(async (root, ctx) => {
    const chosen = await ctx.pick('exclusion', {
      defaultPath: root,
      message: 'Choose a folder to exclude',
    })
    if (!chosen) return ok(null)
    const raw = relPosix(root, chosen)
    const refusal = nexusFolderRefusal(raw)
    return refusal ? fail('invalid-path', refusal) : ok(rootSegs(raw).join('/'))
  }),

  'exclusions:clear': withWriteRoot(async (root) => {
    const { excluded, assetDir } = await readWatchScope(root)
    if (excluded.length === 0) return ok(null)
    const result = await clearExclusionData(root, excluded, assetDir)
    if (!result.ok) return result
    await seedContentIndex(root)
    return ok(result.value)
  }),

  'exclusions:count': withRoot(async (root) => {
    return ok((await readWatchScope(root)).excluded.length)
  }),

  'personalization:set': withWriteRoot(async (root, ctx, key: unknown, value: unknown) => {
    if (typeof key !== 'string' || !key)
      return fail('operation-failed', 'Invalid personalization key.')
    await writePersonalization(root, key, value)
    // No renderer confirm exists for this channel (the slice patches optimistically), yet it writes a field the walk reads — the push set's membership predicate.
    await confirmSettingsWrite(ctx, root)
    if (key === 'webZoomFactor') await ctx.applyZoom()
    if (key === 'historyDays') void sweepFileHistory(root)
    return ok(null)
  }),

  'subfield:get': withRoot(
    async (root): Promise<Result<SubfieldConfig | null>> => ok(await readSubfield(root)),
    ok(null),
  ),

  'subfield:set': withWriteRoot(async (root, _ctx, config: unknown) => {
    if (!config || typeof config !== 'object')
      return fail('operation-failed', 'Invalid subfield config.')
    await writeSubfield(root, config as SubfieldConfig)
    return ok(null)
  }),

  'navViewModes:get': withRoot(
    async (root): Promise<Result<NavViewModes | null>> => ok(await readNavViewModes(root)),
    ok(null),
  ),

  'navViewModes:set': withWriteRoot(async (root, _ctx, modes: unknown) => {
    if (!modes || typeof modes !== 'object')
      return fail('operation-failed', 'Invalid nav view modes.')
    await writeNavViewModes(root, modes as NavViewModes)
    return ok(null)
  }),

  'theme:systemAccent': async (ctx) => ok(await ctx.systemAccent()),
  'host:platform': async () => ok(machine().platform),
} satisfies Partial<Handlers>
