// The one finishing pass, at the open and on Try Again: Context entries under the Contexts lock, then Space entries, then property entries under the schema lock, then the content deletes' and moves' entries in the settle's turn, the notes file's own lock innermost and never nested; each entry under a catch that logs it and counts it missed, so one that throws costs only itself and still offers Try Again. Every arm re-derives from the lists as they read now: a name a live entity holds now is skipped and dropped, and an entity gone takes its owed renames with it.

import { errText } from '../Contract/result'
import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
import { removeFromRegistry, renameSweep } from '../Properties/registryProperty'
import { deletePlan, stripProperty } from '../Properties/deleteProperty'
import { dropOptionFromDef, optionCascade } from '../Properties/optionOps'
import { collectionFolders } from './governedSweep'
import { optionsOf, type PropertyDefinition } from '../Properties/properties'
import { findOption } from '../Properties/propertyValue'
import { memberKey } from '../Files/rootValues'
import { discardFile, type TrashDeps } from '../Trash/discard'
import { type CascadeReport, deleteCascade, relinkReach, type StrippedLink } from './cascade'
import { patchRecord } from '../Bundles/record'
import { parkLinks } from '../Trash/trashedCopies'
import { findContainerById } from './treePatch'
import { pagesByIdOf } from './record'
import { type ConfigReach, reachConfig, retries } from './configReach'
import { oweWalk } from './fileEvents'
import { machine } from '../Platform/machine'
import { heldName, relocate, targetTaken } from '../Files/atomicWrite'
import { contextsDir } from '../Paths/paths'
import { basename, join } from '../Paths/posix'
import { readRegistryStrict, unlistContext } from '../Contexts/contextsRegistry'
import { contextWorldOf } from '../Contexts/contextResolve'
import {
  cascadeTitle,
  rivalTitled,
  titleHolders,
  unlinkContextKey,
  unlinkSpaceValue,
} from '../Contexts/contextCascade'
import { inSettleTurn, underContexts } from './settle'
import { dropContextOrder } from './reorder'
import { liveTreeOf, refreshTree } from './liveTree'
import {
  type ContainerEntry,
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
import { stashAndStrip } from '../Properties/unassignProperty'
import { contentPages, listBundles } from '../Bundles/bundle'
import { refillStash } from '../Properties/assignment'

type Finished<E extends Entry> = { left: E; reach: ConfigReach }

/** An arm whose list file can't be read or written leaves its entry as it stood, counting that file as missed. */
const stuck = <E extends Entry>(e: E): Finished<E> => ({
  left: e,
  reach: { skipped: 1, hosts: [] },
})

/** Counts `r` into `reach`, answering whether it missed a file a later sweep can reach; a file only a fix by hand reaches is named and let go (B-5). */
const add = (reach: ConfigReach, r: ConfigReach): boolean => {
  reach.skipped += r.skipped
  reach.refused = [...(reach.refused ?? []), ...(r.refused ?? [])]
  reach.hosts.push(...r.hosts)
  if (r.pages?.length) reach.pages = [...(reach.pages ?? []), ...r.pages]
  return retries(r) > 0
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
  await inSettleTurn(root, async () => {
    await each('container')
    await each('relink')
  })
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
      return finishContext(root, id, e, deps)
    case 'space':
      return finishSpace(root, id, e, notes, deps)
    case 'container':
      return finishContainer(root, id, e)
    case 'relink':
      return relinkReach(root, e).then((reach) => ({
        left: retries(reach) ? e : { ...e, names: {}, rekey: undefined, values: undefined },
        reach,
      }))
  }
}

/** Sweeps each of `names` that `skip` passes over, answering those a sweep missed; `reach` counts the files. While `views`, reached once after, can't be reached, every name stays owed, so the next finish reaches them again. */
async function sweepEach(
  names: string[] | undefined,
  skip: (name: string) => boolean,
  sweep: (name: string) => Promise<ConfigReach>,
  reach: ConfigReach,
  views?: () => Promise<ConfigReach>,
): Promise<string[] | undefined> {
  const left: string[] = []
  for (const name of names ?? []) {
    if (skip(name)) continue
    if (add(reach, await sweep(name))) left.push(name)
  }
  if (names && views && add(reach, await views())) return names
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
    // With no Trash entry left for the property it can't come back, so the Collections and pages the Trash holds lose it as the live ones do.
    const bundles = await listBundles(root, { kind: 'trash' })
    const kept = bundles.some((b) => b.record.entity === 'property' && b.record.id === id)
    const trashed = kept
      ? []
      : bundles.flatMap((b) =>
          b.artifactName
            ? [{ entity: b.record.entity, abs: join(root, b.bundlePath, b.artifactName) }]
            : [],
        )
    const folders = [
      ...collectionFolders(root, await liveTreeOf(root)),
      ...trashed.flatMap((b) => (b.entity === 'collection' ? [b.abs] : [])),
    ]
    const planned = await deletePlan(root, id, strip)
    const inTrash = strip.length
      ? (await Promise.all(trashed.map((b) => contentPages(b.entity, b.abs)))).flat()
      : []
    const holders = { ...planned.holders, pages: [...planned.holders.pages, ...inTrash] }
    const missed = add(reach, await stripProperty(root, id, folders, { ...planned, holders }))
    return { left: { kind: 'property', strip: missed ? strip : undefined }, reach }
  }
  const rename = await sweepEach(
    e.rename,
    (key) => key === def.key || held(key),
    (key) => renameSweep(root, key, def.key),
    reach,
  )
  const options = await finishOptions(root, def, e.options ?? {}, reach)
  // A Collection gone owes nothing more; one assigning the property refills its pages from the stash, and one that doesn't stashes and strips them.
  const byId = new Map((await liveTreeOf(root)).collections.map((c) => [c.id, c] as const))
  const collections = await sweepEach(
    e.collections,
    (cid) => !byId.has(cid),
    async (cid) => {
      const c = byId.get(cid)!
      if (!c.propertyIds.includes(id)) return stashAndStrip(root, join(root, c.path), def)
      return { skipped: await refillStash(root, join(root, c.path), id, cid), hosts: [] }
    },
    reach,
  )
  // A live definition holding a strip part only arrives by sync; its Collections aren't this entry's to purge, so the part leaves.
  const left: PropertyEntry = { kind: 'property', rename, options, collections }
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

/** A deleted Context's or Space's folder, where its delete's list step left it, into its bundle or where Trash Mode sends it. */
const leave = async (
  root: string,
  abs: string,
  bundle: string | undefined,
  deps: TrashDeps,
): Promise<void> => {
  if (bundle) await relocate(abs, join(root, bundle, basename(abs)))
  else await machine().lock(abs, () => discardFile(root, abs, deps))
  oweWalk(root)
}

async function finishContext(
  root: string,
  id: string,
  e: ContextEntry,
  deps: TrashDeps,
): Promise<Finished<ContextEntry>> {
  const reg = await readRegistryStrict(root)
  if (!reg.ok && reg.error.code !== 'not-found') return stuck(e)
  let contexts = reg.ok ? reg.value.contexts : []
  const listed = contexts.find((c) => c.id === id)?.title
  // The current title sitting in `strip` is a delete whose list step hadn't landed.
  if (listed !== undefined && e.strip?.includes(listed)) {
    const removed = await unlistContext(root, id)
    if (!removed.ok) return stuck(e)
    contexts = removed.value.contexts
  }
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
              if (await targetTaken(from, to)) return { skipped: 1, hosts: [] }
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
  const strip = await sweepEach(
    e.strip,
    (old) => contexts.some(rivalTitled(old, id)),
    async (old) => {
      const dir = join(contextsDir(root), old)
      if ((await heldName(dir)) === old) {
        await leave(root, dir, e.bundle, deps)
        if (!e.bundle) await dropContextOrder(root, id)
      }
      return unlinkContextKey(root, old, id, dir)
    },
    reach,
    () => reachConfig(root, { kind: 'property', propertyId: id }),
  )
  return { left: { ...e, rename, strip }, reach }
}

async function finishSpace(
  root: string,
  id: string,
  e: SpaceEntry,
  notes: Notes,
  deps: TrashDeps,
): Promise<Finished<SpaceEntry>> {
  const parent = notes[e.contextId]
  const { groupById, spaceById } = contextWorldOf((await liveTreeOf(root)).contexts)
  const group = groupById.get(e.contextId)
  const reach: ConfigReach = { skipped: 0, hosts: [] }
  // A Context gone or owed a delete takes its key, and every Space name in it, with it.
  if (!group || parent?.strip?.length)
    return { left: { kind: 'space', contextId: e.contextId }, reach }
  const space = spaceById.get(id)
  // A Space's folder is its list entry, so its current title sitting in `strip` is a delete; a folder still standing is the move it owes.
  const deleted = space !== undefined && !!e.strip?.includes(space.title)
  if (deleted && (await heldName(join(root, space.path))) === space.title)
    await leave(root, join(root, space.path), e.bundle, deps)
  const title = deleted ? undefined : space?.title
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
  const under = (old: string): string => join(contextsDir(root), group.def.title, old)
  const strip = await sweepEach(
    e.strip,
    (old) => group.spaces.some(rivalTitled(old, id)),
    (old) => unlinkSpaceValue(root, group.def.title, old, under(old)),
    reach,
    () => reachConfig(root, { kind: 'gone', propertyId: e.contextId, ids: [id] }),
  )
  return { left: owesRename(parent) ? e : { ...e, rename, strip }, reach }
}

async function finishContainer(
  root: string,
  id: string,
  e: ContainerEntry,
): Promise<Finished<ContainerEntry>> {
  const reach: ConfigReach = { skipped: 0, hosts: [] }
  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing; a moved Set is live by design.
  const tree = await liveTreeOf(root)
  const back = !e.within && (pagesByIdOf(tree).has(id) || !!findContainerById(tree, id))
  const gone = e.strip && !back ? await deleteCascade(root, join(root, e.at), e.strip) : null
  if (gone?.links.length) {
    if (e.bundle)
      await patchRecord(join(root, e.bundle), (raw) => ({
        links: [...((raw.links as StrippedLink[] | undefined) ?? []), ...gone.links],
      }))
    else if (e.park) await parkLinks(root, gone.links)
  }
  const stripped = !!gone && add(reach, gone.reach)
  const viewed =
    !!e.edit &&
    !back &&
    add(reach, await reachConfig(root, e.edit, e.within && join(root, e.within)))
  return {
    left: { ...e, strip: stripped ? e.strip : undefined, edit: viewed ? e.edit : undefined },
    reach,
  }
}
