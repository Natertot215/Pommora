import { basename, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { isContentFile, listEntries } from '../Files/walk'
import { ID_KEY } from './identityMark'
import {
  type ContainerKind,
  type ContentKind,
  type FolderNodeKind,
  isContainerKind,
} from './entities'
import { contentIdAt, newId } from './ids'
import type { Unreadable } from './tree'
import {
  type HeldRewrite,
  readJsonStrict,
  pathExists,
  relocate,
  rewriteHeld,
  rewritePageSerialized,
  rmwJsonStrict,
} from '../Files/atomicWrite'
import { sidecarId } from '../Files/sidecar'
import { mergeFrontmatter, parsePage, splitEnvelope } from '../Files/pageFile'
import { readIdentity } from './identity'
import { idHeld } from './heldPages'
import { asString } from './coerce'
import { recordWrite } from '../Files/writeEcho'
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
    if ((await sidecarId(absDir, slot)) !== registered) continue
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

type Stamping = { overForeign?: boolean; held?: string }

/** The rewrite that stamps each page `pages` names, recording the ID each one takes in `ids`: a page missing its ID, or holding a foreign one where its entry says `overForeign`, takes the entry's `held` ID or one minted from its file's age; one that keeps its ID is left. */
const stamping =
  (
    kind: ContentKind,
    pages: ReadonlyMap<string, Stamping>,
    ids: Map<string, string>,
  ): HeldRewrite =>
  (content, file, { birthtimeMs, mtimeMs }) => {
    const { overForeign, held }: Stamping = pages.get(file) ?? {}
    const { admission } = parsePage(content, kind)
    // The long-term approach is remembering an old ID to re-stamp in such an event; this *must* be done before any official release.
    const foreign = admission.state === 'unknown' && admission.reason === 'malformed'
    if (admission.state !== 'missing' && !(overForeign && foreign)) return null
    // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
    const id = held ?? contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
    ids.set(file, id)
    return mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], splitEnvelope(content).body)
  }

export async function stampPage(absFile: string, kind: ContentKind): Promise<string | null> {
  const ids = new Map<string, string>()
  const landed = await rewritePageSerialized(absFile, stamping(kind, new Map(), ids))
  return landed ? (ids.get(absFile) ?? null) : null
}

type AdoptableKind = Exclude<FolderKind, 'unknown'>

async function stampFolder(absDir: string, kind: FolderNodeKind): Promise<string | null> {
  const file = sidecarPath(absDir, kind)
  if (kind !== 'space' && !(await pathExists(file))) await migrateContainerSidecar(absDir, kind)
  let id: string | null = null
  const written = await rmwJsonStrict(
    file,
    (cur) => {
      id = asString(cur.id) ?? null
      if (id) return null
      id = newId()
      return { ...cur, id }
    },
    () => ({}),
  )
  return written.ok ? id : null
}

async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<void> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return
  const to = join(absDir, SIDECAR_FILENAME[kind])
  await relocate(from, to)
}

// A page the tree held under an ID when its file lost it carries that ID, which its stamp writes back unless another page holds it by then.
export type Stamp = Unreadable & { held?: string }

/** Answers every id it stamped or found written, a folder's as well as a page's: for the index, a page that arrived without one arrives when its ID lands. */
export async function stampMissing(root: string, listed: readonly Stamp[] = []): Promise<string[]> {
  const landed: string[] = []
  const pages = new Map<string, Stamping>()
  const heldBack = new Set<string>()
  for (const { path, kind, reason, held } of listed) {
    if (reason !== 'missing' && reason !== 'malformed') continue
    const abs = join(root, path)
    if (kind === 'page') {
      if (pages.has(abs)) continue
      // A held ID goes back to one page alone.
      const kept = held && !idHeld(root, held) && !heldBack.has(held) ? held : undefined
      if (kept) heldBack.add(kept)
      pages.set(abs, { overForeign: reason === 'malformed', held: kept })
    } else if (reason === 'missing') {
      const id = await stampFolder(abs, kind).catch(() => null)
      if (id !== null) landed.push(id)
    }
  }
  // The pages land as one held rewrite, so a first adoption's stamps flush a chunk at a time, each landing or failing on its own.
  const ids = new Map<string, string>()
  const done = await rewriteHeld([...pages.keys()], stamping('page', pages, ids))
  for (const [file, id] of ids) if (done.get(file)?.status === 'rewritten') landed.push(id)
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
  const container = isContainerKind(kind)
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

// Before the open's read: the walk stops at a folder with no sidecar and never lists an Agenda file, so these are stamped first and the read lists every page missing its ID, which `stampMissing` stamps.
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
