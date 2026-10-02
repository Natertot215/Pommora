import { basename, join } from '../Paths/posix'
import { fault, ok, type Result } from '../Contract/result'
import { machine } from '../Platform/machine'
import { isContentFile, listEntries } from '../Files/walk'
import { ID_KEY } from './identityMark'
import type { ContainerKind, ContentKind, FolderNodeKind } from './entities'
import { contentIdAt, newId } from './ids'
import type { Unreadable } from './tree'
import {
  readJsonStrict,
  readTextOrNull,
  pathExists,
  relocate,
  rewritePageSerialized,
  rmwJsonStrict,
} from '../Files/atomicWrite'
import { readSidecar } from '../Files/sidecar'
import { mergeFrontmatter, NO_FILEABLE_ID, parsePage, splitEnvelope } from '../Files/pageFile'
import { readIdentity } from './identity'
import { asString } from './coerce'
import { baseSidecar } from './schemas'
import { recordWrite, STILL_MS } from '../Files/writeEcho'
import { renamedSidecar } from './migrateConfig'
import { outsideContent, type WatchScope } from '../Paths/exclusion'
import { readSettings, scopeOf } from '../Settings/codec'
import {
  agendaContext,
  adoptsAsCollection,
  resolveFolderKind,
  type FolderKind,
  type FolderKindContext,
} from './folderKind'
import { sidecarPath } from '../Paths/paths'
import { AGENDA_FOLDERS, agendaKind, SIDECAR_FILENAME } from '../Paths/nexusPaths'

async function reHomeRegistered(
  absDir: string,
  root: string,
  kindCtx: FolderKindContext,
): Promise<boolean> {
  for (const slot of AGENDA_FOLDERS) {
    const registered = kindCtx.agenda[slot]
    if (!registered) continue
    if (kindCtx.homed.has(slot)) continue
    const sidecar = await readSidecar(absDir, slot, baseSidecar)
    if (sidecar?.id !== registered) continue
    const target = join(root, basename(absDir))
    if (await pathExists(target)) return false
    if ((await resolveFolderKind(absDir, 'root', kindCtx)) !== slot) return false
    recordWrite(absDir)
    recordWrite(target)
    await machine().rename(absDir, target)
    return true
  }
  return false
}

export async function stampPage(
  absFile: string,
  kind: ContentKind,
  overForeign = false,
): Promise<string | null> {
  const st = await machine().stat(absFile)
  if (!st) return null
  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
  const { birthtimeMs, mtimeMs } = st
  let id: string | null = null
  const landed = await rewritePageSerialized(absFile, (content) => {
    const { admission } = parsePage(content, kind)
    const foreign = admission.state === 'unknown' && admission.reason === 'malformed'
    if (admission.state !== 'missing' && !(overForeign && foreign)) return null
    id = contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
    return mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], splitEnvelope(content).body)
  })
  return landed ? id : null
}

async function pageAdmission(absFile: string) {
  const content = await readTextOrNull(absFile)
  return content === null ? null : parsePage(content).admission
}

export async function ensurePageId(absFile: string): Promise<Result<string>> {
  let admission = await pageAdmission(absFile)
  if (admission === null) return fault('That page could not be read.')
  if (admission.state === 'missing') {
    const stamped = await stampPage(absFile, 'page')
    if (stamped !== null) return ok(stamped)
    admission = await pageAdmission(absFile)
  }
  return admission?.state === 'member' ? ok(admission.id) : NO_FILEABLE_ID
}

type AdoptableKind = Exclude<FolderKind, 'unknown'>

async function stampFolder(absDir: string, kind: FolderNodeKind): Promise<boolean> {
  const file = sidecarPath(absDir, kind)
  if (kind !== 'space' && !(await pathExists(file))) await migrateContainerSidecar(absDir, kind)
  const written = await rmwJsonStrict(
    file,
    (cur) => {
      const renamed = renamedSidecar(cur)
      if (asString(cur.id)) return renamed
      return { ...(renamed ?? cur), id: newId() }
    },
    () => ({}),
  )
  return written.ok
}

async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<void> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return
  const to = join(absDir, SIDECAR_FILENAME[kind])
  await relocate(from, to)
}

// A page missing its ID that changed within STILL_MS may still be mid-write, and a stamp's rename would cut off the bytes still coming, so it isn't stamped here; a folder's read leaves it out of its listing too, since the watcher reports the file once it is still; a walk installs what it read, so there it stays listed until that report, Try Again, or the next walk.
export async function onlyStill(
  root: string,
  listed: readonly Unreadable[] = [],
): Promise<Unreadable[]> {
  const now = Date.now()
  const still = await Promise.all(
    listed.map(async (u) => {
      if (u.kind !== 'page' || u.reason !== 'missing') return true
      const st = await machine().stat(join(root, u.path))
      return !st || now - st.mtimeMs >= STILL_MS
    }),
  )
  return listed.filter((_, i) => still[i])
}

export async function stampMissing(
  root: string,
  listed: readonly Unreadable[] = [],
): Promise<boolean> {
  let landed = false
  for (const { path, kind, reason } of listed) {
    if (reason !== 'missing') continue
    const abs = join(root, path)
    if (kind === 'page')
      landed = (await stampPage(abs, 'page').catch(() => null)) !== null || landed
    else landed = (await stampFolder(abs, kind).catch(() => false)) || landed
  }
  return landed
}

async function stampTree(
  absDir: string,
  relDir: string,
  kind: AdoptableKind,
  scope: WatchScope,
  kindCtx: FolderKindContext,
  root: string,
): Promise<void> {
  const container = kind === 'collection' || kind === 'set'
  // A folder Pommora can't write (locked sync target, foreign-owned backup, evicted cloud placeholder) costs only itself — letting it throw would silently abandon every folder after it in readdir order.
  if (container) await stampFolder(absDir, kind).catch(() => {})

  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) {
      if (!container) await stampPage(join(absDir, e.name), agendaKind(kind)).catch(() => {})
    } else if (e.kind === 'dir' && container) {
      const childRel = `${relDir}/${e.name}`
      if (outsideContent(childRel, scope)) continue
      const abs = join(absDir, e.name)
      if (await reHomeRegistered(abs, root, kindCtx).catch(() => false)) continue
      const childKind = await resolveFolderKind(abs, 'nested', kindCtx)
      if (childKind === 'unknown') continue
      await stampTree(abs, childRel, childKind, scope, kindCtx, root).catch(() => {})
    }
  }
}

export async function stampAdopted(root: string): Promise<void> {
  const scope = scopeOf(await readSettings(root))
  const identity = await readIdentity(root)
  const kindCtx = await agendaContext(root, identity)

  for (const e of await listEntries(root)) {
    if (e.kind !== 'dir') continue
    if (outsideContent(e.name, scope)) continue
    const abs = join(root, e.name)
    const kind = await resolveFolderKind(abs, 'root', kindCtx)
    if (kind === 'unknown') continue
    if (kind !== 'collection') {
      await stampTree(abs, e.name, kind, scope, kindCtx, root).catch(() => {})
      continue
    }
    if (!(await adoptsAsCollection(abs, e.name, scope))) continue
    await stampTree(abs, e.name, 'collection', scope, kindCtx, root).catch(() => {})
  }
}
