import { basename, dirname, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { isContentFile, listEntries } from '../Files/walk'
import { admitContentFile, ID_KEY, type ContentKind } from './identityMark'
import { contentIdAt, newId } from './ids'
import {
  readJsonObject,
  readJsonStrict,
  pathExists,
  rewritePreservingTimes,
} from '../Files/atomicWrite'
import { readSidecar, writeSidecar } from '../Files/sidecar'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter } from '../Files/pageFile'
import { asString } from './coerce'
import { baseSidecar } from './schemas'
import { recordWrite } from '../Files/writeEcho'
import { shouldSkipDir, type WatchScope } from '../Paths/exclusion'
import { readSettingsLeaves, scopeOf } from '../Settings/codec'
import {
  AGENDA_SLOTS,
  agendaContext,
  resolveFolderKind,
  type FolderKind,
  type FolderKindContext,
} from './folderKind'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, nexusConfig } from '../Paths/paths'

async function reHomeRegistered(
  absDir: string,
  root: string,
  kindCtx: FolderKindContext,
): Promise<boolean> {
  for (const { slot, sidecar: sidecarKind, kind } of AGENDA_SLOTS) {
    const registered = kindCtx.agenda[slot]
    if (!registered) continue
    if (kindCtx.homed.has(slot)) continue
    const sidecar = await readSidecar(absDir, sidecarKind, baseSidecar)
    if (sidecar?.id !== registered) continue
    const target = join(root, basename(absDir))
    if (await pathExists(target)) return false
    if ((await resolveFolderKind(absDir, 'root', kindCtx)) !== kind) return false
    recordWrite(absDir)
    recordWrite(target)
    await machine().rename(absDir, target)
    return true
  }
  return false
}

async function stampPage(absFile: string, kind: ContentKind): Promise<boolean> {
  const content = await machine().readText(absFile)
  if (content === null) return false
  if (admitContentFile(splitFrontmatter(content), kind).state !== 'missing') return false
  const { body } = splitEnvelope(content)
  const st = await machine().stat(absFile)
  if (!st) return false
  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
  const { birthtimeMs, mtimeMs } = st
  const id = contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
  await rewritePreservingTimes(absFile, mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], body))
  return true
}

type ContainerKind = 'collection' | 'set'

type AdoptableKind = Exclude<FolderKind, 'unknown'>

const MEMBER_KIND = {
  collection: 'page',
  set: 'page',
  'tasks-singleton': 'task',
  'events-singleton': 'event',
} as const satisfies Record<AdoptableKind, ContentKind>

async function stampFolder(absDir: string, kind: ContainerKind): Promise<boolean> {
  const read = await readJsonStrict(join(absDir, SIDECAR_FILENAME[kind]))
  if (!read.ok && read.error.code !== 'not-found') return false
  if (read.ok && asString(read.value.id)) return false
  if (!read.ok && (await migrateContainerSidecar(absDir, kind))) return true

  await writeSidecar(absDir, kind, { ...(read.ok ? read.value : {}), id: newId() })
  return true
}

async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<boolean> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return false
  const to = join(absDir, SIDECAR_FILENAME[kind])
  // Both endpoints — else the rename reads as an external edit and triggers a full re-walk.
  recordWrite(from)
  recordWrite(to)
  await machine().rename(from, to)
  return true
}

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
  // A folder Pommora can't write (locked sync target, foreign-owned backup, evicted cloud placeholder) costs only itself — letting it throw would silently abandon every folder after it in readdir order.
  let count = !singleton && (await stampFolder(absDir, kind).catch(() => false)) ? 1 : 0

  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) {
      if (await stampPage(join(absDir, e.name), memberKind).catch(() => false)) count++
    } else if (e.kind === 'dir' && !singleton) {
      const childRel = `${relDir}/${e.name}`
      if (shouldSkipDir(e.name, childRel, scope)) continue
      const abs = join(absDir, e.name)
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

export async function ensureFolderId(root: string, absDir: string): Promise<void> {
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  const kindCtx = await agendaContext(root, identity, false)
  const depth = dirname(absDir) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(absDir, depth, kindCtx)
  if (kind === 'collection' || kind === 'set') await stampFolder(absDir, kind)
}

export async function stampAdopted(root: string): Promise<{ stamped: number }> {
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const scope = scopeOf(readSettingsLeaves(settings))
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  const kindCtx = await agendaContext(root, identity, true)

  let stamped = 0
  for (const e of await listEntries(root)) {
    if (e.kind !== 'dir') continue
    if (shouldSkipDir(e.name, e.name, scope)) continue
    const abs = join(root, e.name)
    const kind = await resolveFolderKind(abs, 'root', kindCtx)
    if (kind === 'unknown') continue
    if (kind !== 'collection') {
      stamped += await stampTree(abs, e.name, kind, scope, kindCtx, root).catch(() => 0)
      continue
    }
    // Don't fabricate a Collection from an empty, sidecar-less folder (stray junk). One that already has a sidecar, or holds pages/subfolders, is real content and gets adopted.
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

async function isEmptyOfContent(
  absDir: string,
  relDir: string,
  scope: WatchScope,
): Promise<boolean> {
  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) return false
    if (e.kind === 'dir' && !shouldSkipDir(e.name, `${relDir}/${e.name}`, scope)) return false
  }
  return true
}
