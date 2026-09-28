import { basename, dirname, join, relative } from '../Paths/posix'
import { fault, ok, type Result, valueOr } from '../Contract/result'
import { machine } from '../Platform/machine'
import { isContentFile, listEntries } from '../Files/walk'
import { admitContentFile, ID_KEY, type ContentKind } from './identityMark'
import { contentIdAt, isAdoptedId, newId } from './ids'
import { getLiveTree } from './liveTree'
import { pageAt } from './treePatch'
import { patchPageFromDisk } from './watchPatch'
import { indexWrittenPage } from '../Index/indexSeed'
import {
  readJsonStrict,
  readTextOrNull,
  pathExists,
  rewritePageSerialized,
  rmwJsonStrict,
} from '../Files/atomicWrite'
import { readSidecar } from '../Files/sidecar'
import { splitEnvelope, mergeFrontmatter, splitFrontmatter } from '../Files/pageFile'
import { readIdentity } from './identity'
import { asString } from './coerce'
import { baseSidecar } from './schemas'
import { recordWrite } from '../Files/writeEcho'
import { renamedSidecar } from './migrateConfig'
import { outsideContent, type WatchScope } from '../Paths/exclusion'
import { readSettings, scopeOf } from '../Settings/codec'
import {
  agendaContext,
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

async function stampPage(absFile: string, kind: ContentKind): Promise<string | null> {
  const st = await machine().stat(absFile)
  if (!st) return null
  // A filesystem with no birthtime reports 0 or null, and mtime is then the honest floor.
  const { birthtimeMs, mtimeMs } = st
  let id: string | null = null
  const landed = await rewritePageSerialized(absFile, (content) => {
    if (admitContentFile(splitFrontmatter(content), kind).state !== 'missing') return null
    id = contentIdAt(birthtimeMs ? Math.min(birthtimeMs, mtimeMs) : mtimeMs, kind)
    return mergeFrontmatter(content, { [ID_KEY]: id }, [ID_KEY], splitEnvelope(content).body)
  })
  return landed ? id : null
}

async function pageAdmission(absFile: string) {
  const content = await readTextOrNull(absFile)
  return content === null ? null : admitContentFile(splitFrontmatter(content), 'page')
}

export async function ensurePageId(absFile: string): Promise<Result<string>> {
  let admission = await pageAdmission(absFile)
  if (admission === null) return fault('That page could not be read.')
  if (admission.state === 'missing') {
    const stamped = await stampPage(absFile, 'page')
    if (stamped !== null) return ok(stamped)
    admission = await pageAdmission(absFile)
  }
  return admission?.state === 'member'
    ? ok(admission.id)
    : fault('That page has no ID Pommora can file.')
}

/** A page the tree lists without an ID is given one, and the tree and the index learn it. */
export async function stampListed(root: string, file: string): Promise<string | null> {
  const rel = relative(root, file)
  const tree = getLiveTree()
  const listed = tree && pageAt(tree, rel)
  if (!listed || !isAdoptedId(listed.id)) return null
  const id = valueOr(await ensurePageId(file), null)
  if (!id) return null
  await patchPageFromDisk(root, rel)
  await indexWrittenPage(root, file)
  return id
}

type ContainerKind = 'collection' | 'set'

type AdoptableKind = Exclude<FolderKind, 'unknown'>

async function stampFolder(absDir: string, kind: ContainerKind): Promise<void> {
  const file = sidecarPath(absDir, kind)
  if (!(await pathExists(file))) await migrateContainerSidecar(absDir, kind)
  await rmwJsonStrict(
    file,
    (cur) => {
      const renamed = renamedSidecar(cur)
      if (asString(cur.id)) return renamed
      return { ...(renamed ?? cur), id: newId() }
    },
    () => ({}),
  )
}

async function migrateContainerSidecar(absDir: string, kind: ContainerKind): Promise<void> {
  const other: ContainerKind = kind === 'collection' ? 'set' : 'collection'
  const from = join(absDir, SIDECAR_FILENAME[other])
  const read = await readJsonStrict(from)
  if (!read.ok || !asString(read.value.id)) return
  const to = join(absDir, SIDECAR_FILENAME[kind])
  // Both endpoints — else the rename reads as an external edit and triggers a full re-walk.
  recordWrite(from)
  recordWrite(to)
  await machine().rename(from, to)
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
  const memberKind: ContentKind = container ? 'page' : agendaKind(kind)
  // A folder Pommora can't write (locked sync target, foreign-owned backup, evicted cloud placeholder) costs only itself — letting it throw would silently abandon every folder after it in readdir order.
  if (container) await stampFolder(absDir, kind).catch(() => {})

  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) {
      await stampPage(join(absDir, e.name), memberKind).catch(() => {})
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

export async function ensureFolderId(root: string, absDir: string): Promise<void> {
  const identity = await readIdentity(root)
  const kindCtx = await agendaContext(root, identity, false)
  const depth = dirname(absDir) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(absDir, depth, kindCtx)
  if (kind === 'collection' || kind === 'set') await stampFolder(absDir, kind)
}

export async function stampAdopted(root: string): Promise<void> {
  const scope = scopeOf(await readSettings(root))
  const identity = await readIdentity(root)
  const kindCtx = await agendaContext(root, identity, true)

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
    // Don't fabricate a Collection from an empty, sidecar-less folder (stray junk). One that already has a sidecar, or holds pages/subfolders, is real content and gets adopted.
    if (
      !(await pathExists(join(abs, SIDECAR_FILENAME.collection))) &&
      (await isEmptyOfContent(abs, e.name, scope))
    ) {
      continue
    }
    await stampTree(abs, e.name, 'collection', scope, kindCtx, root).catch(() => {})
  }
}

async function isEmptyOfContent(
  absDir: string,
  relDir: string,
  scope: WatchScope,
): Promise<boolean> {
  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) return false
    if (e.kind === 'dir' && !outsideContent(`${relDir}/${e.name}`, scope)) return false
  }
  return true
}
