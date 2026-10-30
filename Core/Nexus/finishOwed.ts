// The one finishing pass, at the open and on Try Again: Context and then Space entries under the Contexts lock in the settle's turn, then property entries under the schema lock, then the content deletes' and moves' entries in the settle's turn, the notes file's own lock innermost and never nested; each entry under a catch that logs it and counts it missed, so one that throws costs only itself and still offers Try Again. Every arm re-derives from the lists as they read now: a name a live entity holds now is skipped and dropped, and an entity gone takes its owed renames with it.

import { errText } from '../Contract/result'
import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
import { removeFromRegistry, renameSweep } from '../Properties/registryProperty'
import { deletePlan, stripProperty } from '../Properties/deleteProperty'
import { dropOptionFromDef, optionCascade } from '../Properties/optionOps'
import { collectionFolders } from './governedSweep'
import { optionsOf, type PropertyDefinition } from '../Properties/properties'
import { findOption } from '../Properties/propertyValue'
import { memberKey } from '../Files/rootValues'
import { type CascadeReport, deleteCascade, linkStrip, relinkReach } from './cascade'
import { parkLinks } from '../Trash/trashedCopies'
import { gatherLinks } from '../Trash/gather'
import { findContainerById } from './treePatch'
import { pagesByIdOf } from './record'
import { archivedSetIds, type ConfigReach, NO_REACH, reachConfig, retries } from './configReach'
import { oweWalk } from './fileEvents'
import { heldName, relocate, targetTaken } from '../Files/atomicWrite'
import { contextsDir } from '../Paths/paths'
import { contextDirRel } from '../Paths/nexusPaths'
import { archiveDirRel } from '../Paths/bundleLayout'
import { basename, join } from '../Paths/posix'
import { readRegistryStrict, unlistContext } from '../Contexts/contextsRegistry'
import { contextWorldOf } from '../Contexts/contextResolve'
import {
  cascadeTitle,
  moveTitled,
  rivalTitled,
  titleHolders,
  unlinkContextKey,
  unlinkSpaceValue,
} from '../Contexts/contextCascade'
import { inContextsTurn, inSettleTurn } from './settle'
import { type Departing, dropDeparture } from './reorder'
import { liveTreeOf, refreshTree } from './liveTree'
import {
  type ContainerEntry,
  type ContextEntry,
  editNote,
  type Entry,
  type MoveEntry,
  type Notes,
  type Owed,
  owedReport,
  owesRename,
  type PropertyEntry,
  readNotes,
  type SpaceEntry,
} from './owed'
import { stashAndStrip } from '../Properties/unassignProperty'
import { listBundles, ownedArchives } from '../Bundles/bundle'
import { appendLinks } from '../Bundles/record'
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

export async function finishOwed(root: string): Promise<CascadeReport> {
  const total: ConfigReach = { skipped: 0, hosts: [] }
  const each = async (kind: Entry['kind']): Promise<void> => {
    for (const [id, e] of Object.entries(await readNotes(root))) {
      if (e.kind !== kind) continue
      try {
        add(total, await finishEntry(root, id))
      } catch (err) {
        console.error('owed work could not finish:', errText(err))
        total.skipped += 1
      }
    }
  }
  await inContextsTurn(root, async () => {
    await each('context')
    await each('space')
  })
  await serializeSchemaOp(root, () => each('property'))
  await inSettleTurn(root, async () => {
    await each('container')
    await each('move')
    await each('relink')
  })
  return owedReport(root, total)
}

/** Finishes one entry inside a caller already holding its kind's lock (the pass, or a Context or Space delete), writing back what it still owes. */
export async function finishEntry(root: string, id: string): Promise<ConfigReach> {
  const notes = await readNotes(root)
  const e = notes[id]
  if (!e) return NO_REACH
  const done = await finishArm(root, id, e, notes)
  await editNote(root, id, () => done.left)
  return done.reach
}

function finishArm(root: string, id: string, e: Entry, notes: Notes): Promise<Finished<Entry>> {
  switch (e.kind) {
    case 'property':
      return finishProperty(root, id, e)
    case 'context':
      return finishContext(root, id, e)
    case 'space':
      return finishSpace(root, id, e, notes)
    case 'container':
      return finishContainer(root, id, e)
    case 'move':
      return finishMove(root, id, e)
    case 'relink':
      return relinkReach(root, e).then((reach) => ({
        left: retries(reach) ? e : { ...e, names: {}, rekey: undefined },
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
    // With no Trash entry left for the property it can't come back, so the Collections the Trash holds lose its assignment as the live ones do; every page lost its values at the delete.
    const bundles = await listBundles(root, { kind: 'trash' })
    const kept = bundles.some((b) => b.record.entity === 'property' && b.record.id === id)
    const folders = [
      ...collectionFolders(root, await liveTreeOf(root)),
      ...bundles.flatMap((b) =>
        !kept && b.record.entity === 'collection' && b.artifactName
          ? [join(root, b.bundlePath, b.artifactName)]
          : [],
      ),
    ]
    const missed = add(
      reach,
      await stripProperty(root, id, folders, await deletePlan(root, id, strip)),
    )
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

export async function leave(
  root: string,
  abs: string,
  bundle: string,
  departing?: Departing,
): Promise<void> {
  await relocate(abs, join(root, bundle, basename(abs)))
  if (departing) await dropDeparture(root, departing)
}

async function finishContext(
  root: string,
  id: string,
  e: ContextEntry,
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
            const moved = { from: contextDirRel(old), to: contextDirRel(title) }
            const [from, to] = [join(root, moved.from), join(root, moved.to)]
            // A crash between the list step and the folder move left the folder under the old title, and the open's tree read none of the Context's Spaces from the folder the list names, so the tree is read again once the folder is there; a folder already under the new title keeps the rename owed.
            if ((await heldName(from)) === old) {
              if (await targetTaken(from, to)) return { skipped: 1, hosts: [] }
              await moveTitled(root, moved)
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
        await leave(root, dir, e.bundle!, { kind: 'context', id })
        oweWalk(root)
      } else await dropDeparture(root, { kind: 'context', id })
      return unlinkContextKey(root, old, id, [dir, join(root, e.bundle!)])
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
  if (deleted && (await heldName(join(root, space.path))) === space.title) {
    await leave(root, join(root, space.path), e.bundle!, space)
    oweWalk(root)
  } else if (!space && e.bundle && e.strip?.length)
    await dropDeparture(root, { kind: 'space', contextId: e.contextId, id })
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
    (old) => unlinkSpaceValue(root, group.def.title, old, [under(old), join(root, e.bundle!)]),
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
  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets neither the tree nor an Archive its Collection still owns holds.
  const tree = await liveTreeOf(root)
  const back = pagesByIdOf(tree).has(id) || !!findContainerById(tree, id)
  const owedEdit = async (): Promise<ContainerEntry['edit']> => {
    if (e.edit?.kind !== 'gone') return back ? undefined : e.edit
    const unheld = e.edit.ids.filter((x) => !findContainerById(tree, x))
    if (!unheld.length) return undefined
    const archived: string[] = []
    for (const { id: owner, owned } of await ownedArchives(root, tree))
      if (owned) archived.push(...(await archivedSetIds(root, join(root, archiveDirRel(owner)))))
    const ids = unheld.filter((x) => !archived.includes(x))
    return ids.length ? { ...e.edit, ids } : undefined
  }
  const edit = await owedEdit()
  const strip = back ? undefined : e.strip
  const taken = strip && (await linkStrip(root, [e.at, ...(e.bundle ? [e.bundle] : [])], strip))
  if (taken) {
    const links = await gatherLinks(root, taken)
    await (e.bundle ? appendLinks(join(root, e.bundle), links) : parkLinks(root, links))
  }
  const stripped = !!strip && add(reach, await deleteCascade(root, taken || null))
  const viewed = !!edit && add(reach, await reachConfig(root, edit))
  return {
    left: { ...e, strip: stripped ? e.strip : undefined, edit: viewed ? e.edit : undefined },
    reach,
  }
}

/** A moved Set is live by design, so it owes nothing while it stands where it left, its move never made or made undone. */
async function finishMove(root: string, id: string, e: MoveEntry): Promise<Finished<MoveEntry>> {
  const back = findContainerById(await liveTreeOf(root), id)?.path === e.at
  const reach = back || !e.edit ? NO_REACH : await reachConfig(root, e.edit, join(root, e.within))
  return { left: retries(reach) ? e : { ...e, edit: undefined }, reach }
}
