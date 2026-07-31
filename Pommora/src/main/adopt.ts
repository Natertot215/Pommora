// Open-time write-pass that stamps a real ULID into every entity still lacking a persisted id.
// Idempotent; folder position decides kind — a root child is a Collection, anything nested a Set.

import { readdir, readFile, rename } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { basename, join } from 'node:path'
import { admitContentFile, KIND_ID_KEY, type ContentKind } from '@shared/identity'
import { newId } from './ids'
import { atomicWriteFile, readJsonObject, readJsonStrict, pathExists } from './io/atomicWrite'
import { readSidecar, writeSidecar } from './sidecarIO'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './io/pageFile'
import { asString, asStringArray } from './coerce'
import { baseSidecar } from '@shared/schemas'
import { recordWrite } from './io/writeEcho'
import { shouldSkipDir } from './exclusion'
import {
  agendaContext,
  resolveFolderKind,
  type FolderKind,
  type FolderKindContext,
} from './folderKind'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, nexusConfig } from './paths'

async function listEntries(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/**
 * Move a registered singleton back to the nexus root when it is found nested. The registration IS
 * the record — no last-known-state system is involved, because the nexus already names this exact
 * folder as canonical and the root is the only place it is valid.
 *
 * A name already taken at the root refuses rather than overwrites: two folders claiming one place
 * is the user's to resolve, and silently merging them would be worse than leaving one nested.
 */
async function reHomeRegistered(
  absDir: string,
  root: string,
  kindCtx: FolderKindContext,
): Promise<boolean> {
  const slotKind = (k: 'taskConfig' | 'eventConfig'): FolderKind =>
    k === 'taskConfig' ? 'tasks-singleton' : 'events-singleton'
  for (const [slot, kind] of [
    ['tasks', 'taskConfig'],
    ['events', 'eventConfig'],
  ] as const) {
    const registered = kindCtx.agenda[slot]
    if (!registered) continue
    const sidecar = await readSidecar(absDir, kind, baseSidecar)
    if (sidecar?.id !== registered) continue
    // Try the other slot rather than aborting the loop on one refusal.
    const target = join(root, basename(absDir))
    if (await pathExists(target)) return false
    // Ask the resolver whether this folder WOULD be the singleton once it sat at the root. That
    // one call inherits every refusal it already makes — a second agenda config, a container
    // sidecar beside it — so re-homing can never relocate a folder the resolver calls Unknown.
    if ((await resolveFolderKind(absDir, 'root', kindCtx)) !== slotKind(kind)) return false
    recordWrite(absDir)
    recordWrite(target)
    await rename(absDir, target)
    return true
  }
  return false
}

/** Stamp a single `.md` that lacks an id, under the key its FOLDER declares. Returns whether it
 *  wrote. Foreign frontmatter + body survive via the preserving merge.
 *
 *  Only a missing key is adoptable. Unknown — a key contradicting the folder, a malformed value,
 *  two keys at once — is left byte-untouched: stamping over it would erase the conflict and
 *  silently convert a mislocated file into a member of wherever it happened to land. */
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

/** The content kind a folder's members answer to. */
const MEMBER_KIND: Record<string, ContentKind> = {
  collection: 'page',
  set: 'page',
  'tasks-singleton': 'task',
  'events-singleton': 'event',
}

/** Mint + persist a folder id when it has none, reporting whether it wrote. A sidecar that exists
 *  but couldn't be read is left alone: minting over it would replace the Collection's views,
 *  schema and cache with a bare id, so the folder waits for a later open. */
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
 * — a Set dragged to the root, a Collection dragged into one. Its identity is renamed rather than
 * replaced: minting a second sidecar beside the first leaves one folder with two ids, whichever
 * one wins decided purely by where it currently sits, and any work done under the new id silently
 * reverts the moment it moves back.
 *
 * Renaming, not refusing. Refusing writes no sidecar, and the walk needs one — the folder would
 * vanish from the sidebar entirely, which is worse than losing an icon. Both sidecars present is
 * the one case that refuses: that is a real conflict, and no arm should pick.
 */
async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<boolean> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return false
  const to = join(absDir, SIDECAR_FILENAME[kind])
  // Both endpoints, or the rename reads as an external edit and buys a full re-walk.
  recordWrite(from)
  recordWrite(to)
  await rename(from, to)
  return true
}

/**
 * Stamp `absDir` then its direct `.md` members, then recurse. Accumulates the write count.
 *
 * An agenda singleton is FLAT by rule and differs in both directions: its own id already lives in
 * the config sidecar, so it is never container-stamped, and it does not recurse — there are no
 * Sets over agenda, and nothing below it is stamped as anything.
 */
async function stampTree(
  absDir: string,
  relDir: string,
  kind: FolderKind,
  excluded: string[],
  kindCtx: FolderKindContext,
  root: string,
): Promise<number> {
  const singleton = kind === 'tasks-singleton' || kind === 'events-singleton'
  const memberKind = MEMBER_KIND[kind]
  // A folder Pommora can't write — a locked sync target, a restored backup with foreign
  // ownership, an evicted cloud placeholder — costs only itself. Letting it throw would abandon
  // every folder after it in readdir order, silently, on every open.
  let count = !singleton && (await stampFolder(absDir, kind as ContainerKind).catch(() => false))
    ? 1
    : 0

  for (const e of await listEntries(absDir)) {
    if (e.isFile() && !e.name.startsWith('_') && e.name.toLowerCase().endsWith('.md')) {
      // An unreadable page, or one whose frontmatter refuses a field write, skips — adoption
      // is idempotent, so the next open retries it.
      if (await stampPage(join(absDir, e.name), memberKind).catch(() => false)) count++
    } else if (e.isDirectory() && !singleton) {
      const childRel = `${relDir}/${e.name}`
      if (shouldSkipDir(e.name, childRel, excluded)) continue
      const abs = join(absDir, e.name)
      // A folder whose own sidecar is unreadable still adopts its subtree — the children are
      // independent entities, not dependents of their parent's id.
      if (await reHomeRegistered(abs, root, kindCtx).catch(() => false)) {
        count++
        continue
      }
      const childKind = await resolveFolderKind(abs, 'nested', kindCtx)
      if (childKind === 'unknown') continue
      count += await stampTree(abs, childRel, childKind, excluded, kindCtx, root).catch(() => 0)
    }
  }
  return count
}

/**
 * Stamp every un-adopted entity under `root`, returning how many writes happened.
 * Top-level folders are Collections; everything nested is a Set. A registered agenda
 * singleton stamps its own members instead; excluded folders are left alone.
 */
export async function stampAdopted(root: string): Promise<{ stamped: number }> {
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const excluded = asStringArray(settings.excluded_folders) ?? []
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  // `sidecarMode: false` is the honest reading for adoption specifically: a container sidecar's
  // ABSENCE is what this pass exists to fix, so it must not be taken as a reason to skip. Agenda
  // configs still classify normally, which is what keeps a singleton from adopting as a Collection.
  const kindCtx = await agendaContext(root, identity, false)

  let stamped = 0
  for (const e of await listEntries(root)) {
    if (!e.isDirectory()) continue
    if (shouldSkipDir(e.name, e.name, excluded)) continue
    const abs = join(root, e.name)
    const kind = await resolveFolderKind(abs, 'root', kindCtx)
    // Unknown is left entirely alone; a registered singleton adopts its own members under the
    // agenda kind rather than the page one.
    if (kind === 'unknown') continue
    if (kind !== 'collection') {
      stamped += await stampTree(abs, e.name, kind, excluded, kindCtx, root).catch(() => 0)
      continue
    }
    // Don't fabricate a Collection from an empty, sidecar-less folder (stray junk). One that
    // already has a sidecar, or holds pages/subfolders, is real content and gets adopted.
    if (
      !(await pathExists(join(abs, SIDECAR_FILENAME.collection))) &&
      (await isEmptyOfContent(abs, e.name, excluded))
    ) {
      continue
    }
    stamped += await stampTree(abs, e.name, 'collection', excluded, kindCtx, root).catch(() => 0)
  }
  return { stamped }
}

/** True when a folder holds no adoptable content: no `.md` pages and no non-excluded subfolders. */
async function isEmptyOfContent(
  absDir: string,
  relDir: string,
  excluded: string[],
): Promise<boolean> {
  for (const e of await listEntries(absDir)) {
    if (e.isFile() && !e.name.startsWith('_') && e.name.toLowerCase().endsWith('.md')) return false
    if (e.isDirectory() && !shouldSkipDir(e.name, `${relDir}/${e.name}`, excluded)) return false
  }
  return true
}
