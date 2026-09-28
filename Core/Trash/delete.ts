import { basename, dirname, relative, titleFromPath } from '../Paths/posix'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { goneEdit, reachConfig, reachReport } from '../Nexus/configReach'
import { pathExists } from '../Files/atomicWrite'
import { deindexPath, folderCorpus } from '../Index/indexSeed'
import { fail, ok, valueOr } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict, withContextAt } from '../Contexts/contextsRegistry'
import { unlinkContextKey, unlinkSpaceValue } from '../Contexts/contextCascade'
import type { MutateContext } from '../Nexus/mutate'
import { dropSpaceOrder } from '../Nexus/reorder'
import { type DeleteCascade, deleteCascade, joinCascades } from '../Nexus/cascade'
import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
import { machine } from '../Platform/machine'
import { discardFile, mintBundle, settleBundle } from './bundle'
import {
  buildContextRecord,
  gatherContentRecord,
  gatherContextEvidence,
  gatherSpaceRecord,
} from './gather'
import { type RecordFile, writeRecord } from './record'
import { excludedWithin, exclusionWriteRefusal, releaseExcludedFolders } from '../Settings/settings'

export async function deleteOp(
  { root, deps }: MutateContext,
  req: Extract<MutateRequest, { op: 'delete' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
  const edit = goneEdit(await liveTreeOf(root), req.kind, req.path)
  const contexts = req.kind === 'context' ? await readRegistryStrict(root) : null
  if (contexts && !contexts.ok) return contexts
  if (req.kind === 'collection' || req.kind === 'set') {
    const refused = await exclusionWriteRefusal(root, await excludedWithin(root, req.path))
    if (refused) return refused
  }
  // Write-ahead: the record lands before any sweep destroys what it describes; a Space or Context sweep runs before its artifact moves and refuses on failure, a content strip runs after, so a failed move strips nothing, and the artifact moves before the configuration pass, so a delete cut short leaves evidence rather than silence.
  const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
  const write = bundle
    ? async (record: RecordFile | null): Promise<void> => {
        if (record) await writeRecord(bundle, record)
      }
    : null
  // A refused unlink leaves nothing deleted, so its bundle goes with it.
  const unmint = async (e: unknown): Promise<never> => {
    if (bundle) await machine().remove(bundle)
    throw e
  }
  let record: RecordFile | null = null
  let titles: string[] = []
  if (req.kind === 'space') {
    const registry = write ? await readRegistryStrict(root) : null
    if (write) await write(await gatherSpaceRecord(abs, registry, null))
    const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs)).catch(unmint)
    if (write) await write(await gatherSpaceRecord(abs, registry, valueOr(swept, null)))
  } else if (req.kind === 'context') {
    const registry = contexts!.value
    const title = basename(abs)
    const at = registry.contexts.findIndex((c) => c.title === title)
    const entry = registry.contexts[at]
    const evidence = write && entry ? await gatherContextEvidence(abs, entry, at) : null
    if (write && evidence) await write(buildContextRecord(evidence, null))
    // By id, never by title: two entries sharing a title would otherwise erase both while only one folder is trashed.
    const removed = await mutateRegistryFile(root, (cur) =>
      entry ? { contexts: cur.contexts.filter((c) => c.id !== entry.id) } : cur,
    )
    if (!removed.ok) {
      if (bundle) await machine().remove(bundle)
      return removed
    }
    const swept = await unlinkContextKey(root, title, abs).catch(async (e) => {
      // A sweep cut short puts the entry back where it stood, so the Context can be deleted again.
      if (entry) await mutateRegistryFile(root, withContextAt(entry, at))
      return unmint(e)
    })
    if (entry && !bundle) await dropSpaceOrder(root, entry.id)
    if (write && evidence) await write(buildContextRecord(evidence, valueOr(swept, null)))
  } else {
    record = write ? await gatherContentRecord(root, req.kind, abs) : null
    if (write && record) await write({ ...record, partial: true })
    titles =
      req.kind === 'page'
        ? [titleFromPath(abs)]
        : (await folderCorpus(root, abs)).map(titleFromPath)
  }
  await machine().lock(abs, async () => {
    if (bundle) await settleBundle(bundle, abs)
    else await discardFile(root, abs, deps)
  })
  let gone: DeleteCascade | null = null
  if (req.kind === 'page' || req.kind === 'collection' || req.kind === 'set') {
    gone = await deleteCascade(root, abs, titles)
    if (write && record)
      await write({
        ...record,
        ...(gone.links.length ? { links: gone.links } : {}),
        ...(gone.cascade.warning ? { partial: true as const } : {}),
      })
  }
  if (req.kind === 'collection' || req.kind === 'set')
    await releaseExcludedFolders(root, relative(root, abs))
  await deindexPath(root, abs)
  const reach = edit ? reachReport(await reachConfig(root, edit)) : null
  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
  return ok({
    ...(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {}),
    ...(cascade ? { cascade } : {}),
  })
}
