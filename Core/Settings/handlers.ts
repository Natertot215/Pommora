import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { isKeyOf } from '../Contract/validators'
import { fail, ok, fault } from '../Contract/result'
import { machine } from '../Platform/machine'
import { rootSegs } from '../Paths/exclusion'
import { relative } from '../Paths/posix'
import { confirmRescope, confirmSettingsWrite } from '../Nexus/confirm'
import { sweepFileHistory } from '../Pages/fileHistory'
import { nexusFolderRefusal } from './codec'
import { personalizationSchema, settingValue } from './personalization'
import { clearExclusionData } from './exclusionScan'
import {
  readWatchScope,
  sanitizeExclusions,
  writeExcludedFolders,
  writePersonalization,
} from './settings'

export const settingsHandlers = {
  'exclusions:set': withWriteRoot(async (root, ctx, folders: unknown) => {
    const sanitized = sanitizeExclusions(folders)
    if (!sanitized.ok) return sanitized
    await writeExcludedFolders(root, sanitized.value)
    await confirmRescope(ctx, root)
    return sanitized
  }),

  'exclusions:choose': withRoot(async (root, ctx) => {
    const chosen = await ctx.pick('exclusion', {
      defaultPath: root,
      message: 'Choose a folder to exclude',
    })
    if (!chosen) return ok(null)
    const raw = relative(root, chosen)
    const refusal = nexusFolderRefusal(raw)
    return refusal ? fail('invalid-path', refusal) : ok(rootSegs(raw).join('/'))
  }),

  'exclusions:clear': withWriteRoot(async (root) => {
    const scope = await readWatchScope(root)
    return scope.excluded.length ? clearExclusionData(root, scope) : ok(null)
  }),

  'personalization:set': withWriteRoot(async (root, ctx, key: unknown, value: unknown) => {
    if (!isKeyOf(personalizationSchema.shape, key)) return fault('Invalid personalization key.')
    await writePersonalization(root, key, settingValue(key, value))
    // No renderer confirm exists for this channel (the slice patches optimistically), yet it writes a field the walk reads — the push set's membership predicate.
    await confirmSettingsWrite(ctx, root)
    if (key === 'webZoomFactor') await ctx.applyZoom()
    if (key === 'historyDays') void sweepFileHistory(root)
    return ok(null)
  }),

  'host:platform': async () => ok(machine().platform),
} satisfies Partial<Handlers>
