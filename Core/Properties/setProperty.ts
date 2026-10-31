import { machine } from '../Platform/machine'
import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
import { pageWorldOf, spaceWorldOf, writeGovernedKey } from '../Nexus/governedRoot'
import { type MutateReply, type MutateRequest, undoOf } from '../Nexus/mutateRequest'
import { valueToWrite } from './propertyValue'
import { readRegistry, NO_PROPERTY } from './propertiesRegistry'
import { sidecarPath } from '../Paths/paths'
import { isMarkdownFile } from '../Paths/posix'

type ValueRequest = Extract<MutateRequest, { op: 'setProperty' }>

// A page or a Space, its key resolved inside the file's lock: a rename sweeps under the schema lock, not this one, so a name read before the lock can send the write to a key the sweep has already passed.
export async function setPropertyOp(root: string, req: ValueRequest): Promise<MutateReply> {
  const page = isMarkdownFile(req.path)
  const resolved = await mutableTarget(root, req.path, [page ? 'page' : 'space'])
  if (!resolved.ok) return resolved
  const target = resolved.value
  return machine().lock(page ? target : sidecarPath(target, 'space'), async () => {
    const def = (await readRegistry(root)).defs[req.propertyId]
    if (!def) return NO_PROPERTY
    const value = valueToWrite(def, req.value)
    if (!value.ok) return value
    const world = page ? await pageWorldOf(root, target) : spaceWorldOf(await liveTreeOf(root))
    const was = await writeGovernedKey(target, def.key, value.value, world)
    return was.ok ? undoOf([{ file: req.path, fieldId: def.id, ...was.value }]) : was
  })
}
