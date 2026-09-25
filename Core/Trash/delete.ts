import { basename, dirname, relative } from '../Paths/posix'
import { mutableTarget } from '../Nexus/liveTree'
import { pathExists } from '../Files/atomicWrite'
import { deindexPath } from '../Index/indexSeed'
import { fail, ok, valueOr } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from '../Contexts/contextsRegistry'
import { unlinkContextKey, unlinkSpaceValue } from '../Contexts/contextCascade'
import type { MutateContext } from '../Nexus/mutate'
import { dropContextOrder } from '../Nexus/reorder'
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

export async function deleteOp(
  { root, deps }: MutateContext,
  req: Extract<MutateRequest, { op: 'delete' }>,
): Promise<MutateReply> {
  const resolved = await mutableTarget(root, req.path, [req.kind])
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
  const contexts = req.kind === 'context' ? await readRegistryStrict(root) : null
  if (contexts && !contexts.ok) return contexts
  // Write-ahead: the record lands before the sweep destroys what it describes, and the artifact moves LAST, so a delete cut short leaves evidence rather than silence.
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
    const evidence = write ? await gatherContextEvidence(abs, title, registry) : null
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
      if (entry)
        await mutateRegistryFile(root, (cur) => ({
          contexts: [...cur.contexts.slice(0, at), entry, ...cur.contexts.slice(at)],
        }))
      return unmint(e)
    })
    if (entry) await dropContextOrder(root, entry.id)
    if (write && evidence) await write(buildContextRecord(evidence, valueOr(swept, null)))
  } else if (write) {
    await write(await gatherContentRecord(root, req.kind, abs))
  }
  if (bundle) await settleBundle(bundle, abs)
  else await discardFile(root, abs, deps)
  deindexPath(root, abs)
  return ok(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {})
}
