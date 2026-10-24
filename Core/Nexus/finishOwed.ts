// The one finishing pass, at the open and on Try Again: Context entries under the Contexts lock, then Space entries, then property entries under the schema lock, the notes file's own lock innermost and never nested; each entry under a catch that logs it and counts it missed, so one that throws costs only itself and still offers Try Again. Every arm re-derives from the lists as they read now: a name a live entity holds now is skipped and dropped, and an entity gone takes its owed renames with it.

import { errText } from '../Contract/result'
import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
import { removeFromRegistry, renameSweep } from '../Properties/registryProperty'
import { deletePlan, stripProperty } from '../Properties/deleteProperty'
import { dropOptionFromDef, optionCascade } from '../Properties/optionOps'
import { collectionFolders } from './governedSweep'
import { optionsOf, type PropertyDefinition } from '../Properties/properties'
import { findOption } from '../Properties/propertyValue'
import { memberKey } from '../Files/rootValues'
import type { TrashDeps } from '../Trash/discard'
import type { CascadeReport } from './cascade'
import type { ConfigReach } from './configReach'
import { heldName, relocate, targetTaken } from '../Files/atomicWrite'
import { contextsDir } from '../Paths/paths'
import { join } from '../Paths/posix'
import { readRegistryStrict } from '../Contexts/contextsRegistry'
import { contextWorldOf } from '../Contexts/contextResolve'
import { cascadeTitle, rivalTitled, titleHolders } from '../Contexts/contextCascade'
import { underContexts } from './settle'
import { liveTreeOf, refreshTree } from './liveTree'
import {
  type ContextEntry,
  editNote,
  type Entry,
  type Notes,
  type Owed,
  owedReport,
  owesRename,
  type PropertyEntry,
  readNotes,
  type SpaceEntry,
  withLost,
} from './owed'

type Finished<E extends Entry> = { left: E; reach: ConfigReach }

/** An arm whose list file can't be read or written leaves its entry as it stood, counting that file as missed. */
const stuck = <E extends Entry>(e: E): Finished<E> => ({
  left: e,
  reach: { skipped: 1, hosts: [] },
})

/** Counts `r` into `reach`, answering whether it missed a file. */
const add = (reach: ConfigReach, r: ConfigReach): boolean => {
  reach.skipped += r.skipped
  reach.hosts.push(...r.hosts)
  return r.skipped > 0
}

export async function finishOwed(root: string, deps: TrashDeps): Promise<CascadeReport> {
  const total: ConfigReach = { skipped: 0, hosts: [] }
  const each = async (kind: Entry['kind']): Promise<void> => {
    for (const [id, e] of Object.entries(await readNotes(root))) {
      if (e.kind !== kind) continue
      try {
        add(total, await finishEntry(root, id, deps))
      } catch (err) {
        console.error('owed work could not finish:', errText(err))
        total.skipped += 1
      }
    }
  }
  await underContexts(root, async () => {
    await each('context')
    await each('space')
  })
  await serializeSchemaOp(root, () => each('property'))
  return withLost(root, owedReport(total))
}

/** Finishes one entry inside a caller already holding its kind's lock (the pass, or a Context or Space delete), writing back what it still owes. */
export async function finishEntry(root: string, id: string, deps: TrashDeps): Promise<ConfigReach> {
  const notes = await readNotes(root)
  const e = notes[id]
  if (!e) return { skipped: 0, hosts: [] }
  const done = await finishArm(root, id, e, notes, deps)
  await editNote(root, id, () => done.left)
  return done.reach
}

function finishArm(
  root: string,
  id: string,
  e: Entry,
  notes: Notes,
  deps: TrashDeps,
): Promise<Finished<Entry>> {
  switch (e.kind) {
    case 'property':
      return finishProperty(root, id, e)
    case 'context':
      return finishContext(root, id, e)
    case 'space':
      return finishSpace(root, id, e, notes)
  }
}

/** Sweeps each of `names` that `skip` passes over, answering those a sweep missed; `reach` counts the files. */
async function sweepEach(
  names: readonly string[] | undefined,
  skip: (name: string) => boolean,
  sweep: (name: string) => Promise<number>,
  reach: ConfigReach,
): Promise<string[] | undefined> {
  const left: string[] = []
  for (const name of names ?? []) {
    if (skip(name)) continue
    const missed = await sweep(name)
    reach.skipped += missed
    if (missed) left.push(name)
  }
  return left.length ? left : undefined
}

async function finishProperty(
  root: string,
  id: string,
  e: PropertyEntry,
): Promise<Finished<PropertyEntry>> {
  const reach: ConfigReach = { skipped: 0, hosts: [] }
  let defs = (await readRegistry(root)).defs
  // The current key sitting in `strip` is a delete whose list step hadn't landed.
  if (defs[id] && e.strip?.includes(defs[id].key)) {
    if (!(await removeFromRegistry(root, id)).ok) return stuck(e)
    defs = (await readRegistry(root)).defs
  }
  const def = defs[id]
  const held = (key: string): boolean =>
    Object.values(defs).some((d) => d.id !== id && d.key === key)
  if (!def) {
    const strip = (e.strip ?? []).filter((key) => !held(key))
    const folders = collectionFolders(root, await liveTreeOf(root))
    const missed =
      strip.length > 0 &&
      add(reach, await stripProperty(root, id, folders, await deletePlan(root, id, strip)))
    return { left: { kind: 'property', strip: missed ? strip : undefined }, reach }
  }
  const rename = await sweepEach(
    e.rename,
    (key) => key === def.key || held(key),
    (key) => renameSweep(root, key, def.key),
    reach,
  )
  const options = await finishOptions(root, def, e.options ?? {}, reach)
  // A live definition holding a strip part only arrives by sync; its Collections aren't this entry's to purge, so the part leaves.
  const left: PropertyEntry = { kind: 'property', rename, options }
  return { left: owesRename(left) ? { ...e, rename } : left, reach }
}

async function finishOptions(
  root: string,
  def: PropertyDefinition,
  options: Record<string, Owed>,
  reach: ConfigReach,
): Promise<Record<string, Owed> | undefined> {
  const left: Record<string, Owed> = {}
  for (const [optionId, o] of Object.entries(options)) {
    let option = findOption(def, optionId)
    if (option && !o.kept && o.strip?.includes(option.key)) {
      if (!(await dropOptionFromDef(root, def.id, option.id)).ok) {
        left[optionId] = o
        continue
      }
      option = undefined
    }
    const held = (word: string): boolean =>
      optionsOf(def).some((x) => x.id !== optionId && memberKey(x.key) === memberKey(word))
    const to = option?.key
    const rename = to === undefined ? [] : (o.rename ?? []).filter((w) => w !== to && !held(w))
    const strip = (o.strip ?? []).filter((w) => !held(w))
    const renamed =
      to !== undefined &&
      rename.length > 0 &&
      add(reach, await optionCascade(root, def, new Map(rename.map((w) => [w, to]))))
    const stripped =
      strip.length > 0 &&
      add(
        reach,
        await optionCascade(
          root,
          def,
          new Map(strip.map((w) => [w, null])),
          o.kept ? undefined : optionId,
        ),
      )
    if (renamed || stripped)
      left[optionId] = {
        ...o,
        rename: renamed ? rename : undefined,
        strip: stripped ? strip : undefined,
      }
  }
  return Object.keys(left).length ? left : undefined
}

async function finishContext(
  root: string,
  id: string,
  e: ContextEntry,
): Promise<Finished<ContextEntry>> {
  const reg = await readRegistryStrict(root)
  if (!reg.ok && reg.error.code !== 'not-found') return stuck(e)
  const contexts = reg.ok ? reg.value.contexts : []
  const title = contexts.find((c) => c.id === id)?.title
  const reach: ConfigReach = { skipped: 0, hosts: [] }
  const rename =
    title === undefined
      ? undefined
      : await sweepEach(
          e.rename,
          (old) => old === title || contexts.some(rivalTitled(old, id)),
          async (old) => {
            const from = join(contextsDir(root), old)
            const to = join(contextsDir(root), title)
            // A crash between the list step and the folder move left the folder under the old title, and the open's tree read none of the Context's Spaces from the folder the list names, so the tree is read again once the folder is there; a folder already under the new title keeps the rename owed.
            if ((await heldName(from)) === old) {
              if (await targetTaken(from, to)) return 1
              await relocate(from, to)
              await refreshTree(root)
            }
            return cascadeTitle(
              title,
              old,
              title,
              false,
              await titleHolders(root, title, old, false),
            )
          },
          reach,
        )
  return { left: { ...e, rename }, reach }
}

async function finishSpace(
  root: string,
  id: string,
  e: SpaceEntry,
  notes: Notes,
): Promise<Finished<SpaceEntry>> {
  const parent = notes[e.contextId]
  const { groupById, spaceById } = contextWorldOf((await liveTreeOf(root)).contexts)
  const group = groupById.get(e.contextId)
  const reach: ConfigReach = { skipped: 0, hosts: [] }
  // A Context gone or owed a delete takes its key, and every Space name in it, with it.
  if (!group || parent?.strip?.length)
    return { left: { kind: 'space', contextId: e.contextId }, reach }
  const title = spaceById.get(id)?.title
  const rename =
    title === undefined
      ? undefined
      : await sweepEach(
          e.rename,
          (old) => old === title || group.spaces.some(rivalTitled(old, id)),
          async (old) =>
            cascadeTitle(
              group.def.title,
              old,
              title,
              true,
              await titleHolders(root, group.def.title, old, true),
            ),
          reach,
        )
  return { left: owesRename(parent) ? e : { ...e, rename }, reach }
}
