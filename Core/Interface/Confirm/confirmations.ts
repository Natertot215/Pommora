import type { MutateOutcome, RestoreDestination } from '../../Nexus/mutateRequest'
import { type Counted, countPhrase, type HeldKind, itemCount } from '../../Nexus/entities'
import { valueOr } from '../../Contract/result'
import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { SETTING_DEFAULTS, settingOf } from '../../Settings/personalization'
import { notifyDeleted, notifyUndoable, reportRefusal } from '../Notifications/notifications'
import { dialer } from '../../Platform/dialer'
import type { FormatChange } from '../../Properties/keyFormat'
import type { CountedChange } from '../../Properties/properties'

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

type Asked = Counted & { title: string }

/** What a delete asks of what it acts on: one by its title, more by their count. */
const deleteQuestion = (targets: readonly Asked[]): string =>
  targets.length === 1 ? `Delete “${targets[0].title}”?` : `Delete these ${countPhrase(targets)}?`

/** A container, a Context, and a Space each carry everything filed under them, so deleting one asks regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. An archive removes nothing, so it asks under its own switch alone. */
const ALWAYS_ASKS: ReadonlySet<Counted['kind']> = new Set<Counted['kind']>([
  'collection',
  'set',
  'space',
  'context',
])

const waived = (key: 'confirmDeletion' | 'confirmArchiving', kind?: Counted['kind']): boolean =>
  (kind === undefined || !ALWAYS_ASKS.has(kind)) &&
  !settingOf(personalizationOf(useSession.getState()), key)

const armed = new Map<string, () => void>()

/** A bundle restored or deleted from anywhere spends the Undo its notice offered, a delete's or an archive's, so neither the label nor the chord retries it. */
export function spendUndo(bundlePath: string): void {
  armed.get(bundlePath)?.()
  armed.delete(bundlePath)
}

/** Posts through `post` with the one Undo that restores every bundle an act minted, to `destination` when given, arming each so a restore of any one from elsewhere spends it; an act that minted none offers none. */
export function offerUndo(
  bundlePaths: readonly string[],
  post: (undo?: () => Promise<void>) => () => void,
  destination?: RestoreDestination,
): void {
  const spend = post(
    bundlePaths.length > 0
      ? async () => {
          for (const bundlePath of bundlePaths) {
            spendUndo(bundlePath)
            await useSession.getState().mutate({ op: 'restore', bundlePath, destination })
          }
        }
      : undefined,
  )
  for (const bundlePath of bundlePaths) armed.set(bundlePath, spend)
}

/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. `undoTo` returns it where the delete took it from rather than to its origin. */
export function notifyTrashed(
  title: string,
  { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
  retry?: () => void,
  undoTo?: RestoreDestination,
): void {
  offerUndo(
    bundled ? [bundled.bundlePath] : [],
    (undo) => notifyDeleted(title, undo, cascade, retry),
    undoTo,
  )
}

/** The one question a move into the Trash asks, put once for a batch: unasked only while Confirm Before Deletion is off and nothing in it always asks. */
export const askTrashing = async (targets: readonly Asked[]): Promise<boolean> => {
  if (targets.every(({ kind }) => waived('confirmDeletion', kind))) return true
  const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
  const it = targets.length > 1 ? 'They' : 'It'
  return ask({
    message: deleteQuestion(targets),
    detail:
      trashMode === 'system'
        ? `${it} will be moved to the system trash.`
        : `${it} will be moved to the nexus’s .trash folder (recoverable).`,
    action: 'Delete',
    tone: 'destructive',
  })
}

export const confirmDelete = async (target: {
  path: string
  kind: HeldKind
  title: string
  undoTo?: RestoreDestination
}): Promise<boolean> => {
  if (!(await askTrashing([target]))) return false
  const done = await useSession
    .getState()
    .mutate({ op: 'delete', path: target.path, kind: target.kind })
  if (done) notifyTrashed(target.title, done, undefined, target.undoTo)
  return done !== null
}

export const confirmArchive = async (target: {
  path: string
  kind: 'page' | 'set'
  title: string
}): Promise<void> => {
  if (!waived('confirmArchiving')) {
    const yes = await ask({
      message: `Archive “${target.title}”?`,
      detail: `“${target.title}” will be moved to this Collection’s archive, where it can be restored.`,
      action: 'Archive',
      tone: 'positive',
    })
    if (!yes) return
  }
  const done = await useSession
    .getState()
    .mutate({ op: 'archive', path: target.path, kind: target.kind })
  if (done)
    offerUndo(done.bundled ? [done.bundled.bundlePath] : [], (undo) =>
      notifyUndoable(`Archived “${target.title}”`, undo),
    )
}

export const askRemoveTile = (): Promise<boolean> =>
  waived('confirmDeletion')
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
  change: CountedChange,
  req: (held: number) => ConfirmRequest,
  asksPastOne = false,
): Promise<boolean> => {
  const r = await dialer().ask('property:holders', propertyId, change)
  if (!reportRefusal(r)) return false
  return (asksPastOne && r.value <= 1) || ask(req(r.value))
}

export const askDestroyProperty = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(propertyId, { of: 'property' }, (held) => ({
    message: `Delete “${label}” everywhere?`,
    detail: `It is removed from every collection${held ? ` and stripped from ${itemCount(held)}` : ''}; a restorable record lands in the nexus’s .trash folder.`,
    action: 'Delete',
    tone: 'destructive',
  }))

export const askRemoveOption = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(propertyId, { of: 'option', label }, (held) => ({
    message: `Remove “${label}”?`,
    detail: `The option is deleted from the property${held ? ` and its value stripped from ${itemCount(held)}` : ''}.`,
    action: 'Remove',
    tone: 'destructive',
  }))

export const askClearOption = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(
    propertyId,
    { of: 'option', label },
    (held) => ({
      message: `Clear “${label}” from ${itemCount(held)}?`,
      detail: 'The option stays; only its assigned values are removed.',
      action: 'Clear',
      tone: 'destructive',
    }),
    true,
  )

export const askFormatChange = (propertyId: string, change: FormatChange): Promise<boolean> =>
  askHolding(
    propertyId,
    { of: 'format', change },
    (held) => ({
      message: `This action would rewrite metadata in ${itemCount(held)}.`,
      detail: `Each ${'key_format' in change ? 'key' : 'value'} changes to the new format; its display label stays the same.`,
      action: 'Rewrite',
      tone: 'positive',
    }),
    true,
  )

export const askEmptyTrash = async (targets: readonly Asked[]): Promise<boolean> => {
  const { permanentDelete } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
  const [it, back] = targets.length > 1 ? ['They', 'them'] : ['It', 'it']
  return ask({
    message: deleteQuestion(targets),
    detail: permanentDelete
      ? `${it} will be erased from this computer. This cannot be undone.`
      : `${it} will move to your system trash, which is where you would get ${back} back from.`,
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
