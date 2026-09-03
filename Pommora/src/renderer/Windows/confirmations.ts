import type { MutableKind } from '@shared/mutate'
import { useSession } from '@renderer/store'
import { notifyDeleted } from '@renderer/Interface/notifications'

export interface ConfirmRequest {
  message: string
  detail: string
  action: string
  tone: 'destructive' | 'positive'
  defaultsToCancel?: boolean
}

/** Puts a question up from anywhere, inside a callback or not — the answer is what matters, never a subscription to it. */
const ask = (req: ConfirmRequest): Promise<boolean> => useSession.getState().askConfirm(req)

/** The nexus's Confirm Before Deletion switch, off. A Collection or a Set carries a schema and
 *  everything filed under it, so it asks regardless of the switch. */
const waived = (kind?: MutableKind): boolean =>
  kind !== 'collection' &&
  kind !== 'set' &&
  useSession.getState().personalization.confirmDeletion === false

/** Ask, then delete — the one route a delete gesture takes, wherever the gesture happened. */
export const confirmDelete = async (target: {
  path: string
  kind: MutableKind
  title: string
}): Promise<void> => {
  if (!waived(target.kind)) {
    const { trashMode } = await window.nexus.deleteFacts()
    const yes = await ask({
      message: `Delete “${target.title}”?`,
      detail:
        trashMode === 'system'
          ? 'It will be moved to the system Trash.'
          : 'It will be moved to the nexus’s .trash folder (recoverable).',
      action: 'Delete',
      tone: 'destructive',
    })
    if (!yes) return
  }
  let bundlePath: string | undefined
  const ok = await useSession
    .getState()
    .mutate({ op: 'delete', path: target.path, kind: target.kind }, undefined, undefined, (t) => {
      bundlePath = t?.bundlePath
    })
  // A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name.
  if (!ok) return
  const bundle = bundlePath
  notifyDeleted(target.title, bundle ? () => void undoTrashed(bundle) : undefined)
}

const undoTrashed = (bundlePath: string): Promise<boolean> =>
  useSession.getState().mutate({ op: 'restore', bundlePath })

export const askRemoveTile = (): Promise<boolean> =>
  waived()
    ? Promise.resolve(true)
    : ask({
        message: 'Remove this block?',
        detail:
          'A markdown block’s file moves to the nexus’s .trash (recoverable); embeds only remove the tile.',
        action: 'Remove',
        tone: 'destructive',
      })

export const askDeleteView = (): Promise<boolean> =>
  ask({
    message: 'Delete this view?',
    detail: 'Its configuration is removed from the container; pages are untouched.',
    action: 'Delete',
    tone: 'destructive',
  })

export const askDestroyProperty = (name: string): Promise<boolean> =>
  ask({
    message: `Delete “${name}” everywhere?`,
    detail:
      'It is removed from every collection; a restorable record lands in the nexus’s .trash folder.',
    action: 'Delete',
    tone: 'destructive',
  })

export const askRemoveOption = (name: string): Promise<boolean> =>
  ask({
    message: `Remove “${name}”?`,
    detail:
      'The option is deleted from the property and its value stripped from every page that had it.',
    action: 'Remove',
    tone: 'destructive',
  })

export const askClearOption = (name: string): Promise<boolean> =>
  ask({
    message: `Clear “${name}” from every page?`,
    detail: 'The option stays; only its assigned values are removed.',
    action: 'Clear',
    tone: 'destructive',
  })

export const askEmptyTrash = async (count: number): Promise<boolean> => {
  const { permanentDelete } = await window.nexus.deleteFacts()
  return ask({
    message: count === 1 ? 'Delete this item?' : `Delete these ${count} items?`,
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
      'Deleting this snapshot will permanently delete it from history; this cannot be undone.',
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
