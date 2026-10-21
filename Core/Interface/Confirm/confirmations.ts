import type { MutateOutcome } from '../../Nexus/mutateRequest'
import type { HeldKind } from '../../Nexus/entities'
import { valueOr } from '../../Contract/result'
import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { SETTING_DEFAULTS, settingOf } from '../../Settings/personalization'
import { notifyDeleted, reportRefusal } from '../Notifications/notifications'
import { dialer } from '../../Platform/dialer'
import { itemCount } from '../../Properties/properties'
import type { FormatChange } from '../../Properties/keyFormat'

const DELETE_FACTS_FALLBACK = {
  trashMode: DEFAULT_TRASH_MODE,
  permanentDelete: SETTING_DEFAULTS.permanentDelete,
}

export interface ConfirmRequest {
  message: string
  detail: string
  action: string
  tone: 'destructive' | 'positive'
  defaultsToCancel?: boolean
}

const ask = (req: ConfirmRequest): Promise<boolean> => useSession.getState().askConfirm(req)

/** A container, a Context, and a Space each carry everything filed under them, so they ask regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. */
const ALWAYS_ASKS: ReadonlySet<HeldKind> = new Set<HeldKind>([
  'collection',
  'set',
  'space',
  'context',
])

const waived = (kind?: HeldKind): boolean =>
  (kind === undefined || !ALWAYS_ASKS.has(kind)) &&
  !settingOf(personalizationOf(useSession.getState()), 'confirmDeletion')

const armed = new Map<string, () => void>()

/** A bundle restored or deleted from anywhere spends the Undo its delete's notice offered, so neither the label nor the chord retries it. */
export function spendBundle(bundlePath: string): void {
  armed.get(bundlePath)?.()
  armed.delete(bundlePath)
}

/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. */
export function notifyTrashed(
  title: string,
  { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
  retry?: () => void,
): void {
  const spend = notifyDeleted(
    title,
    bundled &&
      (async () => {
        spendBundle(bundled.bundlePath)
        await useSession.getState().mutate({ op: 'restore', bundlePath: bundled.bundlePath })
      }),
    cascade,
    retry,
  )
  if (bundled) armed.set(bundled.bundlePath, spend)
}

export const confirmDelete = async (target: {
  path: string
  kind: HeldKind
  title: string
}): Promise<void> => {
  if (!waived(target.kind)) {
    const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
    const yes = await ask({
      message: `Delete “${target.title}”?`,
      detail:
        trashMode === 'system'
          ? 'It will be moved to the system trash.'
          : 'It will be moved to the nexus’s .trash folder (recoverable).',
      action: 'Delete',
      tone: 'destructive',
    })
    if (!yes) return
  }
  const done = await useSession
    .getState()
    .mutate({ op: 'delete', path: target.path, kind: target.kind })
  if (done) notifyTrashed(target.title, done)
}

export const askRemoveTile = (): Promise<boolean> =>
  waived()
    ? Promise.resolve(true)
    : ask({
        message: 'Remove this tile?',
        detail: 'This action is only reversible within a short timeframe.',
        action: 'Remove',
        tone: 'destructive',
      })

export const askDeleteView = (from: 'container' | 'tile' = 'container'): Promise<boolean> =>
  ask({
    message: 'Delete this view?',
    detail: `Its configuration is removed from the ${from}; pages are untouched.`,
    action: 'Delete',
    tone: 'destructive',
  })

const askHolding = async (
  propertyId: string,
  of: string | FormatChange | undefined,
  req: (held: string) => ConfirmRequest,
  asksPastOne = false,
): Promise<boolean> => {
  const r = await dialer().ask('property:holders', propertyId, of)
  if (!reportRefusal(r)) return false
  return (asksPastOne && r.value <= 1) || ask(req(itemCount(r.value)))
}

export const askDestroyProperty = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(propertyId, undefined, (held) => ({
    message: `Delete “${label}” everywhere?`,
    detail: `It is removed from every collection and stripped from ${held}; a restorable record lands in the nexus’s .trash folder.`,
    action: 'Delete',
    tone: 'destructive',
  }))

export const askRemoveOption = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(propertyId, label, (held) => ({
    message: `Remove “${label}”?`,
    detail: `The option is deleted from the property and its value stripped from ${held}.`,
    action: 'Remove',
    tone: 'destructive',
  }))

export const askClearOption = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(
    propertyId,
    label,
    (held) => ({
      message: `Clear “${label}” from ${held}?`,
      detail: 'The option stays; only its assigned values are removed.',
      action: 'Clear',
      tone: 'destructive',
    }),
    true,
  )

export const askFormatChange = (propertyId: string, change: FormatChange): Promise<boolean> =>
  askHolding(
    propertyId,
    change,
    (held) => ({
      message: `This action would rewrite metadata in ${held}.`,
      detail: `Each ${'key_format' in change ? 'key' : 'value'} changes to the new format; its display label stays the same.`,
      action: 'Rewrite',
      tone: 'positive',
    }),
    true,
  )

export const askEmptyTrash = async (message: string): Promise<boolean> => {
  const { permanentDelete } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
  return ask({
    message,
    detail: permanentDelete
      ? 'It will be erased from this computer. This cannot be undone.'
      : 'It will move to your system trash, which is where you would get it back from.',
    action: 'Delete',
    tone: 'destructive',
    defaultsToCancel: true,
  })
}

export const askRestoreSnapshot = (): Promise<boolean> =>
  ask({
    message:
      'Restoring this snapshot will replace the current version of this file; the overwritten snapshot will remain recoverable.',
    detail: '',
    action: 'Restore',
    tone: 'positive',
  })

export const askDeleteSnapshots = (): Promise<boolean> =>
  ask({
    message:
      'Deleting these snapshots will permanently delete them from history; this cannot be undone.',
    detail: '',
    action: 'Delete',
    tone: 'destructive',
  })

export const askClearHistory = (): Promise<boolean> =>
  ask({
    message: 'Permanently delete stored snapshots for all files; this cannot be undone.',
    detail: '',
    action: 'Clear',
    tone: 'destructive',
    defaultsToCancel: true,
  })

export const askClearExclusions = (folderCount: number): Promise<boolean> =>
  ask({
    message: `Clear Pommora’s data from ${folderCount === 1 ? 'the excluded folder' : `${folderCount} excluded folders`}?`,
    detail:
      'Pommora’s container files are removed and each page’s identity key and Context keys are dropped; every other key a page holds stays. This cannot be undone.',
    action: 'Clear',
    tone: 'destructive',
    defaultsToCancel: true,
  })
