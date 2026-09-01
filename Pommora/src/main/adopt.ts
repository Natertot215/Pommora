// Open-time write-pass that stamps a real ULID into every entity still lacking a persisted id.
// Idempotent. Folder position decides kind: a root child is a Collection, anything nested a Set.

import { readFile, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { isContentFile, listEntries } from './IO/walk'
import { admitContentFile, KIND_ID_KEY, type ContentKind } from '@shared/identity'
import { newId } from './ids'
import { atomicWriteFile, readJsonObject, readJsonStrict, pathExists } from './IO/atomicWrite'
import { readSidecar, writeSidecar } from './sidecarIO'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './IO/pageFile'
import { asString } from './coerce'
import { baseSidecar } from '@shared/schemas'
import { recordWrite } from './IO/writeEcho'
import { shouldSkipDir, type WatchScope } from './exclusion'
import { readSettingsLeaves, scopeOf } from './readNexus'
import {
  AGENDA_SLOTS,
  agendaContext,
  resolveFolderKind,
  type FolderKind,
  type FolderKindContext,
} from './folderKind'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, nexusConfig } from './paths'

/** Move a registered singleton back to the nexus root when found nested — the registration is the
 *  only record of where it belongs, since the root is the sole valid place for it. Refuses rather
 *  than overwrites if the name is already taken at the root; that conflict is the user's to resolve. */
async function reHomeRegistered(
  absDir: string,
  root: string,
  kindCtx: FolderKindContext,
): Promise<boolean> {
  for (const { slot, sidecar: sidecarKind, kind } of AGENDA_SLOTS) {
    const registered = kindCtx.agenda[slot]
    if (!registered) continue
    // Already homed means this folder is a copy, not the displaced original — leave it be.
    if (kindCtx.homed.has(slot)) continue
    const sidecar = await readSidecar(absDir, sidecarKind, baseSidecar)
    if (sidecar?.id !== registered) continue
    const target = join(root, basename(absDir))
    if (await pathExists(target)) return false
    // Confirms the resolver would still call this the singleton once at the root, so re-homing
    // can never relocate a folder the resolver calls Unknown (e.g. a second agenda config).
    if ((await resolveFolderKind(absDir, 'root', kindCtx)) !== kind) return false
    recordWrite(absDir)
    recordWrite(target)
    await rename(absDir, target)
    return true
  }
  return false
}

/** Stamp a single `.md` that lacks an id, under the key its FOLDER declares.
 *  Only a missing key is adoptable — Unknown (a key contradicting the folder, a malformed value,
 *  two keys at once) is left byte-untouched, since stamping over it would silently convert a
 *  mislocated file into a member of wherever it happened to land. */
async function stampPage(absFile: string, kind: ContentKind): Promise<boolean> {
  const content = await readFile(absFile, 'utf8')
  if (admitContentFile(readFrontmatterFields(content), kind).state !== 'missing') return false
  const key = KIND_ID_KEY[kind]
  const { body } = splitEnvelope(content)
  await atomicWriteFile(absFile, mergeFrontmatter(content, { [key]: newId() }, [key], body))
  return true
}

/** The two folder kinds that carry a container sidecar of their own. */
type ContainerKind = 'collection' | 'set'

/** Every kind adoption can act on; Unknown is excluded by type since letting it in would silently
 *  look up an undefined member kind. */
type AdoptableKind = Exclude<FolderKind, 'unknown'>

/** The content kind a folder's members answer to. */
const MEMBER_KIND = {
  collection: 'page',
  set: 'page',
  'tasks-singleton': 'task',
  'events-singleton': 'event',
} as const satisfies Record<AdoptableKind, ContentKind>

/** Mint + persist a folder id when it has none. A sidecar that exists but couldn't be read is left
 *  alone — minting over it would replace the Collection's views, schema and cache with a bare id. */
async function stampFolder(absDir: string, kind: ContainerKind): Promise<boolean> {
  const read = await readJsonStrict(join(absDir, SIDECAR_FILENAME[kind]))
  if (!read.ok && read.error.code !== 'not-found') return false
  if (read.ok && asString(read.value.id)) return false
  if (!read.ok && (await migrateContainerSidecar(absDir, kind))) return true

  await writeSidecar(absDir, kind, { ...(read.ok ? read.value : {}), id: newId() })
  return true
}

/**
 * A folder that crossed depth outside the app still carries the sidecar of the kind it used to be
 * (a Set dragged to the root, a Collection dragged into one). Its identity is renamed rather than
 * replaced: minting a second sidecar beside the first would leave one folder with two ids, and any
 * work done under the new one silently reverts the moment it moves back.
 *
 * Refusing instead would write no sidecar, and the walk needs one — the folder would vanish from
 * the sidebar. Both sidecars present is the one case that still refuses: a real conflict.
 */
async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<boolean> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return false
  const to = join(absDir, SIDECAR_FILENAME[kind])
  // Both endpoints — else the rename reads as an external edit and triggers a full re-walk.
  recordWrite(from)
  recordWrite(to)
  await rename(from, to)
  return true
}

/** Stamp `absDir` then its direct `.md` members, then recurse.
 *  An agenda singleton is FLAT by rule: its id already lives in the config sidecar, so it's never
 *  container-stamped, and it doesn't recurse — there are no Sets over agenda. */
async function stampTree(
  absDir: string,
  relDir: string,
  kind: AdoptableKind,
  scope: WatchScope,
  kindCtx: FolderKindContext,
  root: string,
): Promise<number> {
  const singleton = kind === 'tasks-singleton' || kind === 'events-singleton'
  const memberKind = MEMBER_KIND[kind]
  // A folder Pommora can't write (locked sync target, foreign-owned backup, evicted cloud
  // placeholder) costs only itself — letting it throw would silently abandon every folder after
  // it in readdir order.
  let count = !singleton && (await stampFolder(absDir, kind).catch(() => false)) ? 1 : 0

  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) {
      // Adoption is idempotent, so an unreadable page just skips — the next open retries it.
      if (await stampPage(join(absDir, e.name), memberKind).catch(() => false)) count++
    } else if (e.isDirectory() && !singleton) {
      const childRel = `${relDir}/${e.name}`
      if (shouldSkipDir(e.name, childRel, scope)) continue
      const abs = join(absDir, e.name)
      // A folder whose own sidecar is unreadable still adopts its subtree — the children are
      // independent entities, not dependents of their parent's id.
      if (await reHomeRegistered(abs, root, kindCtx).catch(() => false)) {
        count++
        continue
      }
      const childKind = await resolveFolderKind(abs, 'nested', kindCtx)
      if (childKind === 'unknown') continue
      count += await stampTree(abs, childRel, childKind, scope, kindCtx, root).catch(() => 0)
    }
  }
  return count
}

/**
 * Give ONE folder a persisted identity if it has none, resolving its kind exactly as the open-time
 * pass does. A folder the filesystem handed Pommora — made in Finder, or by an agent — carries only
 * a path-derived placeholder until an open stamps it, and a placeholder is an address, not an
 * identity: anything recording it would be recording a path in disguise. So a caller that must name
 * this folder by id asks for one first.
 */
export async function ensureFolderId(root: string, absDir: string): Promise<void> {
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  const kindCtx = await agendaContext(root, identity, false)
  const depth = dirname(absDir) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(absDir, depth, kindCtx)
  if (kind === 'collection' || kind === 'set') await stampFolder(absDir, kind)
}

/**
 * Stamp every un-adopted entity under `root`, returning how many writes happened.
 * Top-level folders are Collections; everything nested is a Set. A registered agenda
 * singleton stamps its own members instead; excluded folders are left alone.
 */
export async function stampAdopted(root: string): Promise<{ stamped: number }> {
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const scope = scopeOf(readSettingsLeaves(settings))
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  // `sidecarMode: false` is the honest reading for adoption specifically: a container sidecar's
  // ABSENCE is what this pass exists to fix, so it must not be taken as a reason to skip. Agenda
  // configs still classify normally, which is what keeps a singleton from adopting as a Collection.
  const kindCtx = await agendaContext(root, identity, false)

  let stamped = 0
  for (const e of await listEntries(root)) {
    if (!e.isDirectory()) continue
    if (shouldSkipDir(e.name, e.name, scope)) continue
    const abs = join(root, e.name)
    const kind = await resolveFolderKind(abs, 'root', kindCtx)
    // Unknown is left entirely alone; a registered singleton adopts its own members under the
    // agenda kind rather than the page one.
    if (kind === 'unknown') continue
    if (kind !== 'collection') {
      stamped += await stampTree(abs, e.name, kind, scope, kindCtx, root).catch(() => 0)
      continue
    }
    // Don't fabricate a Collection from an empty, sidecar-less folder (stray junk). One that
    // already has a sidecar, or holds pages/subfolders, is real content and gets adopted.
    if (
      !(await pathExists(join(abs, SIDECAR_FILENAME.collection))) &&
      (await isEmptyOfContent(abs, e.name, scope))
    ) {
      continue
    }
    stamped += await stampTree(abs, e.name, 'collection', scope, kindCtx, root).catch(() => 0)
  }
  return { stamped }
}

/** True when a folder holds no adoptable content: no `.md` pages and no non-excluded subfolders. */
async function isEmptyOfContent(
  absDir: string,
  relDir: string,
  scope: WatchScope,
): Promise<boolean> {
  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) return false
    if (e.isDirectory() && !shouldSkipDir(e.name, `${relDir}/${e.name}`, scope)) return false
  }
  return true
}
