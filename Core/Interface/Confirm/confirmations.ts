import type { MutateRequest } from '../../Nexus/mutateRequest'
import { livePath } from '../../Nexus/record'
import { basename } from '../../Paths/posix'
import { type Counted, countPhrase, type HeldKind, itemCount } from '../../Nexus/entities'
import { valueOr } from '../../Contract/result'
import { useSession } from '../../Session/store'
import { storesChanged } from '../../Session/nexusSlice'
import { personalizationOf } from '../../Session/configSlice'
import { SETTING_DEFAULTS, settingOf } from '../../Settings/personalization'
import {
  type BundleVerb,
  type Bundled,
  notifyBundled,
  reportRefusal,
  type Titled,
} from '../Notifications/notifications'
import { dialer } from '../../Platform/dialer'
import type { CountedChange, SelectOption } from '../../Properties/properties'

export interface ConfirmRequest {
  message: string
  detail: string
  action: string
  tone: 'destructive' | 'positive'
  defaultsToCancel?: boolean
}

const ask = (req: ConfirmRequest): Promise<boolean> => useSession.getState().askConfirm(req)

/** What a delete asks of what it acts on: one by its title, more by their count. */
const deleteQuestion = (targets: readonly Titled[]): string =>
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
function spendUndo(bundlePath: string): void {
  armed.get(bundlePath)?.()
  armed.delete(bundlePath)
}

/** An Archive restore's Undo at the place its item stands now, followed by the id its record carries, under its new name once a rename has given it one. */
const atItemNow = (req: MutateRequest): MutateRequest => {
  const id = req.op === 'archive' ? req.back?.record.id : undefined
  if (req.op !== 'archive' || !req.back || typeof id !== 'string') return req
  const path = livePath(useSession.getState().tree, { id, path: req.path })
  return basename(path) === basename(req.path)
    ? { ...req, path }
    : { ...req, path, back: { ...req.back, name: basename(path) } }
}

/** Posts through `post` with the one Undo that runs every request an act's replies carried, each at its item's place now, as one run whose lines post together, arming each restore's bundle so a restore of it from elsewhere spends the Undo; an act that answered none offers none. */
function offerUndo(
  undos: readonly Acted[],
  post: (undo?: () => Promise<void>) => () => void,
): void {
  const spend = post(
    undos.length > 0
      ? async () => {
          for (const { req } of undos) if (req.op === 'restore') spendUndo(req.bundlePath)
          await runBundled(
            null,
            undos.map((u) => ({ ...u, req: atItemNow(u.req) })),
          )
        }
      : undefined,
  )
  for (const { req } of undos) if (req.op === 'restore') armed.set(req.bundlePath, spend)
}

type Acted = Titled & { req: MutateRequest; address?: string }

const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`

/** Sends each row's request in turn and posts one notice through `notifyBundled` for what they did, with the one Undo their replies carry: a lone row posts its refusal through the slice, a batch counts its refusals, a row's success spends the Undo armed on its `address`, a browser row's bundle, and a switch away from `nexusId`, the Nexus the act began in, stops it with nothing posted. Answers whether any row went through. */
export async function runBundled(
  verb: BundleVerb,
  rows: readonly Acted[],
  nexusId = useSession.getState().tree?.nexus.id,
): Promise<boolean> {
  const { mutate, finishOwed } = useSession.getState()
  const switched = (): boolean => useSession.getState().tree?.nexus.id !== nexusId
  const counted = rows.length > 1
  const run: Bundled = {
    done: [],
    refused: [],
    unrestored: [],
    warnings: [],
    renamed: [],
    links: 0,
  }
  const undos: Acted[] = []
  let owed = false
  for (const row of rows) {
    if (switched()) break
    const res = counted ? await mutate(row.req, { quiet: true }) : await mutate(row.req)
    ;(res ? run.done : run.refused).push(row)
    if (!res) continue
    if (row.address) spendUndo(row.address)
    run.unrestored.push(...(res.unrestored ?? []))
    const warning = res.cascade?.warning
    if (warning && !run.warnings.includes(warning)) run.warnings.push(warning)
    run.links += res.cascade?.pages.length ?? 0
    owed ||= !!res.cascade?.owed
    if (res.landedAs) run.renamed.push(steppedTo(row.title, res.landedAs))
    if (res.undo) undos.push({ title: row.title, kind: row.kind, req: res.undo })
  }
  if (counted) storesChanged.emit()
  if (switched()) return false
  offerUndo(undos, (undo) => notifyBundled(verb, run, undo, owed ? finishOwed : undefined))
  return run.done.length > 0
}

/** The one question a move into the Trash asks, put once for a batch: unasked only while Confirm Before Deletion is off and nothing in it always asks. */
export const askTrashing = async (targets: readonly Titled[]): Promise<boolean> => {
  if (targets.every(({ kind }) => waived('confirmDeletion', kind))) return true
  const it = targets.length > 1 ? 'They' : 'It'
  return ask({
    message: deleteQuestion(targets),
    detail: `${it} will be moved to the nexus’s .trash folder (recoverable).`,
    action: 'Delete',
    tone: 'destructive',
  })
}

/** A held item asks the Trash's question and a property its own, counting what holds it. */
export const confirmDelete = async (
  target: { title: string } & ({ path: string; kind: HeldKind } | { propertyId: string }),
): Promise<boolean> => {
  const { title } = target
  if ('propertyId' in target) {
    if (!(await askDestroyProperty(target.propertyId, title))) return false
    const req = { op: 'deleteProperty', propertyId: target.propertyId } as const
    return runBundled('Deleted', [{ title, kind: 'property', req }])
  }
  if (!(await askTrashing([target]))) return false
  const req = { op: 'delete', path: target.path, kind: target.kind } as const
  return runBundled('Deleted', [{ title, kind: target.kind, req }])
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
  const req = { op: 'archive', path: target.path, kind: target.kind } as const
  await runBundled('Archived', [{ title: target.title, kind: target.kind, req }])
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

const askDestroyProperty = (propertyId: string, label: string): Promise<boolean> =>
  askHolding(propertyId, { of: 'property' }, (held) => ({
    message: `Delete “${label}” everywhere?`,
    detail: `It is removed from every collection${held ? ` and stripped from ${itemCount(held)}` : ''}; a restorable record lands in the nexus’s .trash folder.`,
    action: 'Delete',
    tone: 'destructive',
  }))

type AskedOption = Pick<SelectOption, 'id' | 'label'>

export const askDeleteOption = (propertyId: string, option: AskedOption): Promise<boolean> =>
  askHolding(propertyId, { of: 'option', optionId: option.id }, (held) => ({
    message: `Delete “${option.label}”?`,
    detail: `The option is deleted from the property${held ? ` and its value stripped from ${itemCount(held)}` : ''}.`,
    action: 'Delete',
    tone: 'destructive',
  }))

export const askClearOption = (propertyId: string, option: AskedOption): Promise<boolean> =>
  askHolding(
    propertyId,
    { of: 'option', optionId: option.id },
    (held) => ({
      message: `Clear “${option.label}” from ${itemCount(held)}?`,
      detail: 'The option stays; only its assigned values are removed.',
      action: 'Clear',
      tone: 'destructive',
    }),
    true,
  )

/** The one question before a change that rewrites a written key or option word in files: it counts what the change's sweep would rewrite, so a change that moves no key, its display label alone, counts nothing and asks nothing. */
export const askRewrite = (
  propertyId: string,
  change: Extract<CountedChange, { of: 'format' | 'rename' }>,
): Promise<boolean> =>
  askHolding(
    propertyId,
    change,
    (held) => ({
      message: `This action would rewrite metadata in ${itemCount(held)}.`,
      detail:
        change.of === 'rename'
          ? `Each ${change.optionId === undefined ? 'key' : 'value'} changes to the new name.`
          : `Each ${'key_format' in change.change ? 'key' : 'value'} changes to the new format; its display label stays the same.`,
      action: 'Rewrite',
      tone: 'positive',
    }),
    true,
  )

export const askEmptyTrash = async (targets: readonly Titled[]): Promise<boolean> => {
  const permanentDelete = valueOr(
    await dialer().ask('bundles:permanentDelete'),
    SETTING_DEFAULTS.permanentDelete,
  )
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
