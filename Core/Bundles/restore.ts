import { basename, dirname, join, relative } from '../Paths/posix'
import { originPathOf } from '../Paths/bundleLayout'
import { fault, ok } from '../Contract/result'
import type { MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
import { machine } from '../Platform/machine'
import { relocate } from '../Files/atomicWrite'
import { liveTreeOf } from '../Nexus/liveTree'
import { nexusPages } from '../Nexus/heldPages'
import { pageIndexOf } from '../Nexus/record'
import { settledIndex } from '../Nexus/settle'
import { arrive } from '../Nexus/arrival'
import { joinCascades } from '../Nexus/cascade'
import { OWED, owedName, readNotes, restoreNote } from '../Nexus/owed'
import { mutateRegistryFile, unlistContext, withContextAt } from '../Contexts/contextsRegistry'
import { restoreProperty } from '../Trash/restoreProperty'
import {
  contentPages,
  fileInto,
  ITEM_GONE,
  type OpenBundle,
  originPagesOf,
  spendBundle,
} from './bundle'
import { NO_DESTINATION, placeAmong, placeRecord } from './placement'
import { recordedPartly } from './record'
import { parkLinks } from '../Trash/gather'

const restored = (unrestored: string[]) => (unrestored.length ? { unrestored } : {})

/** The one restore, for either store's bundle: a property rebuilt in the registry, or an item placed against the current tree and moved back, or, as a delete from the Archive's Undo, filed back into the Archive it left; then the arrival every item back from a store runs. A restore from the Archive answers the archive that takes it back. */
export async function restoreBundle(
  root: string,
  bundle: OpenBundle,
  destination?: RestoreDestination,
): Promise<MutateReply> {
  const { store, record: stored, artifact } = bundle
  if (stored.entity === 'property') {
    if (destination) return fault(NO_DESTINATION)
    const rebuilt = await restoreProperty(root, stored)
    if (!rebuilt.ok) return rebuilt
    const { unrestored, dropped, ...said } = rebuilt.value
    await parkLinks(root, dropped)
    // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
    await spendBundle(root, bundle)
    return ok({ ...restored(unrestored), ...said })
  }
  if (!artifact) return ITEM_GONE
  const tree = await liveTreeOf(root)
  const { byId } = await nexusPages(root, tree)
  const placed = await placeRecord(
    root,
    stored,
    destination,
    { abs: bundle.abs, artifact },
    tree,
    byId,
  )
  if (!placed.ok) return placed
  const { record, placement, writeOrder, landedAs, into } = placed.value
  const { dir, finalName, finalTitle } = placement
  const title = finalTitle ?? finalName
  const back = await originPagesOf(root, await contentPages(record.entity, artifact))
  // A Context's or Space's own owed titles never refuse it; another's do, since the work still due would land on it. Placement lands a Space only under the live Context its record's `parent` names.
  const landing =
    record.entity === 'context'
      ? { owner: { kind: 'context' as const }, name: title, except: record.registry.id }
      : record.entity === 'space' && record.parent.kind === 'context'
        ? {
            owner: { kind: 'space' as const, contextId: record.parent.id },
            name: title,
            except: record.id,
          }
        : null
  if (landing && owedName(await readNotes(root), landing)) return OWED
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything moves: a refused write leaves the bundle intact — the restore is retryable — where an entry written after the move would destroy the evidence on failure and reply ok.
  if (record.entity === 'context') {
    const { id } = record.registry
    const committed = await mutateRegistryFile(root, (cur) =>
      withContextAt(
        { ...record.registry, title },
        placeAmong(
          cur.contexts.map((c) => c.id),
          id,
          record.place,
        ).indexOf(id),
      )(cur),
    )
    if (!committed.ok) return committed
  }
  let landed = join(root, dir, finalName)
  try {
    // The Undo of a delete from the Archive files back at the address it left, in the Archive that holds it now, and nothing lands in the tree.
    if (into && (record.entity === 'page' || record.entity === 'set')) {
      const { links, ...filed } = record
      const origin = join(root, originPathOf(root, artifact))
      landed = (await fileInto(root, into, origin, artifact, filed, dir)).landed
    } else {
      await machine().mkdir(dirname(landed))
      await relocate(artifact, landed)
    }
  } catch (e) {
    // The move is the irreversible half and a Context's entry the reversible one. Reversing it keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context') await unlistContext(root, record.registry.id)
    return fault(e)
  }
  // A conversion that can't land leaves the item live with its delete still owed: the next finish moves it back into its bundle, and the restore can be repeated.
  if (landing) {
    const converted = await restoreNote(root, landing.except)
    if (!converted.ok) return converted
  }
  await writeOrder?.()
  const arrived = await arrive(root, {
    opened: bundle,
    record,
    title,
    landed: {
      abs: landed,
      rekey:
        record.entity === 'context' && title !== record.registry.title
          ? [record.registry.title, title]
          : undefined,
    },
    filed: !!into,
    back,
    live: pageIndexOf(tree),
    after: await settledIndex(root),
  })
  const cascade = joinCascades(arrived.cascade, recordedPartly(stored, title))
  const archived = store.kind === 'archive' && (stored.entity === 'page' || stored.entity === 'set')
  return ok({
    ...restored(arrived.unrestored),
    ...(cascade ? { cascade } : {}),
    ...(landedAs ? { landedAs } : {}),
    ...(archived
      ? {
          undo: {
            op: 'archive',
            path: relative(root, landed),
            kind: stored.entity,
            back: {
              at: relative(root, bundle.inner ? artifact : bundle.abs),
              name: basename(artifact),
              record: stored,
            },
          },
        }
      : {}),
  })
}
