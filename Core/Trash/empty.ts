import { join, relative } from '../Paths/posix'
import { archiveDirRel, archiveStoreOf, originPathOf } from '../Paths/bundleLayout'
import type { MutateReply } from '../Nexus/mutateRequest'
import { fail, fault, ok } from '../Contract/result'
import { readLiveSetting } from '../Settings/settings'
import { serializeSchemaOp } from '../Properties/propertiesRegistry'
import { asString } from '../Nexus/coerce'
import { contentPages, openBundle, pageIdsOf, spendBundle } from '../Bundles/bundle'
import { parkLinks } from './gather'
import { pathExists } from '../Files/atomicWrite'
import { listMarkdownFiles } from '../Files/walk'
import { dropPageMetadata } from '../Nexus/pageMetadata'
import { machine } from '../Platform/machine'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import { archivedSetIds, goneContainers } from '../Nexus/configReach'
import {
  containerNote,
  distinct,
  editNote,
  owedReport,
  propertyNote,
  runNoted,
} from '../Nexus/owed'
import { finishEntry } from '../Nexus/finishOwed'

// Nothing is gone for good until the first disposal lands, so one that fails takes the note back and leaves the bundle whole; a Collection's Archive goes first, so the Collection stays listed while it can still lose anything, and the bundle goes last, so a failed removal leaves a record with no artifact, litter the listing skips.
export async function emptyBundle(root: string, bundleAbs: string): Promise<MutateReply> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  const { store, record, artifact: artifactAbs } = opened.value
  if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
  const permanent = await readLiveSetting(root, 'permanentDelete')
  const dispose = async (abs: string): Promise<void> => {
    recordWrite(abs)
    if (permanent) await machine().remove(abs)
    else
      await (machine().trashToSystem?.(abs) ??
        Promise.reject(new Error('This host has no system trash.')))
    await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
  }
  if (record.entity === 'property') {
    // Gone for good once its bundle goes, so its delete's finish takes its assignment from the Collections the Trash holds too; what it misses stays owed, so Try Again reaches it.
    const key = asString(record.def.key)
    const noted = await editNote(root, record.id, (e) => ({
      ...propertyNote(e),
      strip: distinct(propertyNote(e).strip, key ? [key] : []),
    }))
    if (!noted.ok) return noted
    await dispose(bundleAbs)
    const reach = await serializeSchemaOp(root, () => finishEntry(root, record.id))
    return ok({ cascade: owedReport(root, reach) })
  }
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
  const pages = await contentPages(record.entity, artifactAbs)
  const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key. Noted first, keyed by what it empties, so what the strip misses is owed and parked before a finish strips it.
  const id = relative(root, bundleAbs)
  return runNoted(root, id, {
    note: () =>
      containerNote(
        relative(root, artifactAbs),
        [...pages.map((file) => originPathOf(root, file)), ...(archive?.origins ?? [])],
        archive?.sets.length ? goneContainers(archive.sets) : null,
      ),
    list: async () => {
      try {
        await dispose(archive?.abs ?? artifactAbs)
      } catch (e) {
        return fault(e)
      }
      if (archive) await dispose(artifactAbs)
      await dropPageMetadata(root, pageIds)
      await parkLinks(root, 'links' in record ? (record.links ?? []) : [])
      await spendBundle(root, opened.value)
      return ok(null)
    },
    sweep: () => finishEntry(root, id),
  })
}

/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. */
async function collectionArchive(
  root: string,
  id: string | undefined,
): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
  const store = archiveStoreOf(id)
  if (!store) return null
  const abs = join(root, archiveDirRel(store.id))
  if (!(await pathExists(abs))) return null
  const files = await listMarkdownFiles(abs)
  return {
    abs,
    files,
    origins: files.map((f) => originPathOf(root, f)),
    sets: await archivedSetIds(root, abs),
  }
}
