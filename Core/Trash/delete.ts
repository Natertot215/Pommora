import { basename, dirname, relative } from '../Locations/posix'
import { isReserved, resolveUnderRoot } from '../Locations/pathSafety'
import { pathExists } from '../IO/atomicWrite'
import { recordWrite } from '../IO/writeEcho'
import { deindexPath } from '../Index/indexSeed'
import { fail, fault, ok } from '../Contract/result'
import { mutateRegistryFile, readRegistryStrict } from '../Contexts/contextsRegistry'
import { unlinkContextKey, unlinkSpaceValue } from '../Contexts/contextCascade'
import type { MutateContext } from '../Nexus/mutate'
import type { MutateReply, MutateRequest } from '../Pages/mutateRequest'
import { mintBundle, settleBundle } from './bundle'
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
  const resolved = await resolveUnderRoot(root, req.path)
  if (!resolved.ok) return resolved
  const abs = resolved.value
  if (await isReserved(root, abs)) return fault('That item can’t be deleted.')
  if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
  // Write-ahead: the record lands before the sweep destroys what it describes, and the artifact moves LAST, so a delete cut short leaves evidence rather than silence.
  const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
  const write = bundle
    ? async (record: RecordFile | null): Promise<void> => {
        if (record) await writeRecord(bundle, record)
      }
    : null
  if (req.kind === 'space') {
    const registry = write ? await readRegistryStrict(root) : null
    if (write) await write(await gatherSpaceRecord(abs, registry, null))
    const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs))
    if (write) await write(await gatherSpaceRecord(abs, registry, swept.ok ? swept.value : null))
  } else if (req.kind === 'context') {
    const title = basename(abs)
    const evidence = write
      ? await gatherContextEvidence(abs, title, await readRegistryStrict(root))
      : null
    if (write && evidence) await write(buildContextRecord(evidence, null))
    const swept = await unlinkContextKey(root, title, abs)
    // By id, never by title: the gather already resolved which entry this is, and two entries sharing a title would otherwise erase both while only one folder is trashed.
    await mutateRegistryFile(root, (cur) => {
      const id = evidence?.entry.id ?? cur.contexts.find((c) => c.title === title)?.id
      return id ? { contexts: cur.contexts.filter((c) => c.id !== id) } : cur
    })
    if (write && evidence) await write(buildContextRecord(evidence, swept.ok ? swept.value : null))
  } else if (write) {
    await write(await gatherContentRecord(root, req.kind, abs))
  }
  if (bundle) await settleBundle(bundle, abs)
  else {
    recordWrite(abs) // in-nexus trash records inside settleBundle; the OS route records here
    await deps.trashToSystem(abs)
  }
  deindexPath(root, abs)
  return ok(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {})
}
