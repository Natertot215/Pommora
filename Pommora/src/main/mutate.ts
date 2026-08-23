// The single write orchestration behind the `mutate` IPC: resolves nexus-relative paths under
// the session root, runs the matching crud/* op, applies the cascade policy. Never throws
// across the boundary.
//
// Cascade policy, owned here so no call site re-invents it: a page rename reverts if
// renameCascade's inbound-[[links]] rewrite fails; a context/space delete unlinks the
// parenthesized key/value everywhere BEFORE the folder is removed, so no member file keeps a
// dangling reference. System-trash is injected (deps.trashToSystem) so this stays testable.

import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { readFile, realpath, rm } from 'node:fs/promises'
import { sessionRoot } from './session'
import { resolveUnderRoot } from './pathSafety'
import { createPage, renamePage, movePage, updatePageProperty } from './crud/page'
import { setChildOrder, setStateOrder } from './crud/reorder'
import { createFolderEntity, renameFolderEntity, moveFolderEntity } from './crud/folderEntity'
import {
  createContextGroup,
  createSpace,
  loadContextWorld,
  setContextOnPath,
  setSpaceColor,
} from './crud/contextWrite'
import {
  renameContextOp,
  renameSpaceOp,
  unlinkContextKey,
  unlinkSpaceValue,
} from './crud/contextCascade'
import { mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import {
  buildContextRecord,
  emptyBundle,
  gatherContentRecord,
  gatherContextEvidence,
  gatherSpaceRecord,
  type RecordFile,
  restoreArtifact,
  writeRecord,
} from './provenance'
import { setSpaceOrder } from './crud/reorder'
import { renameCascade } from './crud/cascade'
import { rewriteBlockConnections } from './blocks'
import {
  mintBundle,
  settleBundle,
  pathExists,
  readJsonObject,
  rmwJsonStrict,
  atomicWriteBinary,
  atomicWriteFile,
} from './io/atomicWrite'
import { recordWrite } from './io/writeEcho'
import { readNavigationFile, writeNavigationState } from './io/navigationFile'
import {
  assetFilePath,
  assetFileToDelete,
  NOT_A_PROPERTY_DIR_MESSAGE,
  underAssetRoot,
  validPropertyDir,
} from './assetRoots'
import { createDisambiguated } from './disambiguate'
import { writeAssetFile } from './assetWrite'
import { serializeOnFile } from './io/fileLock'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './io/pageFile'
import { basenameNoMd } from './coerce'
import { nexusConfig, relPosix, sidecarPath, NEXUS_CONFIG_FILES } from './paths'
import { resolveFolderKind } from './folderKind'
import { readWatchScope, updateSettings } from './settings'
import { newId } from './ids'
import { mintDefaultView, VIEW_ID_PREFIX } from '@shared/views'
import { ok, fail, errText, type Result } from '@shared/result'
import { NEW_PAGE_SLOT, type MutateReply, type MutateRequest } from '@shared/mutate'
import type { PropertyDefinition } from '@shared/properties'
import type { PropertyValue } from '@shared/propertyValue'
import { NO_NEXUS } from './ipc'
import type { TrashMode } from './appConfig'
import { readRegistry } from './io/propertiesRegistry'
import { deindexPath, indexWrittenPage, moveIndexPaths, seedContentIndex } from './indexSeed'
import { NON_CORPUS_TOP, TRASH_DIR, assetSubRoot } from '@shared/nexusPaths'
import { connectionText, embeddableTitle } from '@shared/connections'
import { ASSET_MIME } from '@shared/assetMime'
import { neverWatched } from './exclusion'
import { AMBIGUOUS, indexable, liveAssetMap, patchHeldAssetMap, resolveAssetName } from './assetMap'

/** What the orchestration needs from the Electron layer (injected to keep this testable). */
export interface MutateDeps {
  trashMode: TrashMode
  /** Move a path to the OS trash (shell.trashItem). The 'system' trashMode and the emptying op
   *  with the switch off both use it. */
  trashToSystem: (absPath: string) => Promise<void>
  /** `personalization.permanentDelete` — what emptying a bundle means. Read main-side per
   *  operation: the renderer never carries the flag that chooses between recoverable and gone. */
  permanentDelete?: boolean
}

const relJoin = (parent: string, child: string): string => (parent ? `${parent}/${child}` : child)

function decodeImageDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  const m = /^data:image\/([a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)
  if (!m) return null
  const subtype = m[1].toLowerCase()
  return { ext: subtype === 'jpeg' ? 'jpg' : subtype, buffer: Buffer.from(m[2], 'base64') }
}

/** The profile photo is a crop rather than a chosen file — bytes with no source name to keep —
 *  so it wears the name the nexus gives its own singleton, and a later crop rewrites that same
 *  file instead of minting one beside it. */
const NEXUS_ICON = 'nexus-icon.png'

/** Delete the file a replaced image value named, unless the new value names it too. The stored
 *  spellings are not comparable: a wikilink and a path can mean one file, and a singleton
 *  rewritten in place is stored under the very name it replaced. */
async function dropReplacedAsset(
  root: string,
  prev: string | null,
  next: string | null,
): Promise<void> {
  if (!prev || prev === (await assetFileToDelete(root, next))) return
  await rm(join(root, prev), { force: true }).catch(() => {})
}

/** Adopt the file behind an absolute path and answer the `[[Name.ext]]` that names it. A file
 *  already sitting under an asset root is referenced where it is; one whose bytes already sit
 *  there under the same name is referenced rather than copied a second time.
 *
 *  THE adoption seam — every guard that makes an adoption safe lives here rather than in
 *  `writeAssetFile`, which is the inner byte-lander. `allow` is what separates a banner (which
 *  must be an image the app can render) from a file property (which takes whatever the user
 *  picked); `subfolder` is where that property says its files land. Deleting the file a
 *  replacement leaves behind is the CALLER's policy — this never removes anything. */
export async function adoptFile(
  root: string,
  absSource: string,
  opts: { allow: 'image' | 'any'; subfolder?: string },
): Promise<Result<string>> {
  const base = basename(absSource)
  // A name the map would never hold resolves to nothing — refused at adoption rather than copied
  // in and left blank.
  if (!base || !embeddableTitle(base) || neverWatched(base))
    return fault('That file’s name can’t be written as a link.')
  if (opts.allow === 'image' && !(extname(base).toLowerCase() in ASSET_MIME))
    return fault('That file isn’t an image Pommora can show.')
  const { assetDir } = await readWatchScope(root)
  // The destination is renderer-supplied and reaches `mkdir` + a write, so it is refused HERE
  // rather than at a caller: `rootSegs` drops empty segments but not `..`, and `join` then
  // collapses them straight past the root. The check also refuses a folder the map could never
  // index, so a write can't land somewhere its own reference will never resolve from.
  const dir = assetSubRoot(assetDir, opts.subfolder)
  if (opts.subfolder !== undefined && !validPropertyDir(opts.subfolder, assetDir))
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  // The one hole a lexical check can't see is a segment inside the root that is a symlink out.
  // A folder that already exists settles it by realpath; one that doesn't has no link to follow,
  // and `writeAssetFile`'s mkdir creates real directories. Resolving the SUBFOLDER rather than
  // the root is what makes the existing-symlink case reachable at all.
  const canonical = await resolveUnderRoot(root, dir)
  if (!canonical.ok && canonical.error.code !== 'not-found') return canonical
  // `resolveUnderRoot` bounds the NEXUS, which a link pointing at the content tree satisfies — so
  // where a real SUBFOLDER answers, the boundary that matters is re-read from its canonical path.
  // A link out of the nexus is already refused above; this is the one that lands bytes among the
  // user's pages, under a name the asset map will never index. The root itself is exempt because
  // `underAssetRoot` reads strictly below its root, and where the root is a link that is the asset
  // directory setting's business rather than adoption's.
  if (
    opts.subfolder &&
    canonical.ok &&
    !underAssetRoot(relPosix(await realpath(root), canonical.value), assetDir)
  )
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  const hit = resolveAssetName(await liveAssetMap(root), base)
  // A name several files answer to has no reference that means one of them — authoring it would
  // spell exactly what the resolver refuses to answer.
  if (hit === AMBIGUOUS) return fault(`More than one file is named ${base}.`)

  // In place only where the map can answer for it: `underAssetRoot` admits a dot-prefixed segment
  // that `indexable` drops forever, so a pick from a hidden folder under the root would mint a
  // reference that renders permanently unresolved with no error anywhere. Such a pick falls
  // through to the copy instead, which lands the bytes where they resolve.
  const srcRel = relPosix(await realpath(root), await realpath(absSource))
  if (underAssetRoot(srcRel, assetDir) && indexable(srcRel, assetDir))
    return ok(connectionText(base))

  let bytes: Buffer
  try {
    bytes = await readFile(absSource)
  } catch {
    return fault('That file could not be read.')
  }
  if (hit && bytes.equals(await readFile(join(root, hit)).catch(() => Buffer.alloc(0))))
    return ok(connectionText(base))
  return writeAssetFile(root, dir, base, bytes)
}

/** The nexus icon. It rewrites the file the setting ALREADY names — the one Pommora last wrote
 *  there — so cropping twice leaves one icon rather than a trail of them. A file the setting does
 *  not name is someone else's, even under this name, so the first crop mints beside it. */
async function writeNexusIcon(
  root: string,
  dataUrl: string,
  current: unknown,
): Promise<Result<string>> {
  const decoded = decodeImageDataUrl(dataUrl)
  if (!decoded) return fault('Unsupported image data.')
  const { assetDir } = await readWatchScope(root)
  const mine = await assetFilePath(root, current)
  if (mine && underAssetRoot(mine, assetDir)) {
    await atomicWriteBinary(join(root, mine), decoded.buffer)
    // Same name, same paths: only the version tells the renderer to re-request the image.
    patchHeldAssetMap(root, mine, 'change')
    return ok(connectionText(basename(mine)))
  }
  return writeAssetFile(root, assetDir, NEXUS_ICON, decoded.buffer)
}

/** The nexus's own machinery — never a renderer-mutable entity. The read side skips these,
 *  so the write side refuses to rename/delete them (defense against a buggy/hostile renderer
 *  message). Contexts live UNDER `.nexus/contexts/<Title>/` and stay mutable — only the root,
 *  `.nexus` itself, and `.trash` are off-limits. `abs` is canonical (resolveUnderRoot realpaths
 *  it), so the root is canonicalized too — else a symlinked root (e.g. macOS /var→/private/var)
 *  makes `relative` mismatch and the guard silently passes. */
async function isReserved(root: string, abs: string): Promise<boolean> {
  const rel = relative(await realpath(root), abs)
  return rel === '' || NON_CORPUS_TOP.has(rel) || rel.startsWith(`${TRASH_DIR}${sep}`)
}

const fault = (message: string): Result<never> => fail('operation-failed', message)

/** The choke point every move passes: a page or Set may only land somewhere that holds pages —
 *  a guard against a programmatic accident bypassing the UI's own constraints, and the ONE
 *  main-side check, rather than a rule re-stated per caller.
 *
 *  The empty registration is the honest reading, not a shortcut past one: the resolver consults it
 *  in a single branch — the destination carries an agenda config — and every outcome of that
 *  branch is a kind this refuses, so no registration can change the answer. Building a real one
 *  costs a sidecar read per root folder, on a drag. */
async function movesInto(root: string, dst: string): Promise<Result<null>> {
  const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  const depth = dirname(dst) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(dst, depth, {
    agenda: {},
    homed: new Set(),
    root,
    sidecarMode: !!identity?.id,
  })
  return kind === 'collection' || kind === 'set'
    ? ok(null)
    : fail('invalid-path', 'Pages live in Collections and Sets.')
}

/** Set one field on a config/sidecar record, or drop the key when there's no value — the
 *  no-empties rule the banner, heading-icon and icon writers all follow. */
function setOrDrop(
  cur: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const next = { ...cur }
  if (value) next[key] = value
  else delete next[key]
  return next
}

export async function handleMutate(req: MutateRequest, deps: MutateDeps): Promise<MutateReply> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  // A CRUD/fs/trash throw (e.g. shell.trashItem rejecting, EACCES/ENOSPC) becomes a fault
  // Result here, not a rejected IPC promise callers would silently swallow.
  try {
    return await dispatch(req, deps, root)
  } catch (e) {
    return fault(errText(e))
  }
}

async function dispatch(req: MutateRequest, deps: MutateDeps, root: string): Promise<MutateReply> {
  switch (req.op) {
    case 'createPage': {
      // '' parentPath = the nexus root (e.g. a page directly under an adopted root); '.'
      // is the existing dir resolveUnderRoot validates. relJoin keeps '' for the rel path.
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return parent
      // Seed definitions resolve here, never renderer-side; a seed naming a dead property drops.
      let values: { def: PropertyDefinition; value: PropertyValue }[] | undefined
      if (req.seeds) {
        const defs = (await readRegistry(root)).defs
        values = Object.entries(req.seeds).flatMap(([id, value]) => {
          const def = defs[id]
          return def ? [{ def, value }] : []
        })
      }
      const r = await createDisambiguated(req.name, (name) =>
        createPage(parent.value, name, { values }),
      )
      if (!r.ok) return r
      if (req.order)
        await setChildOrder(
          parent.value,
          'page_order',
          req.order.map((x) => (x === NEW_PAGE_SLOT ? r.value.id : x)),
        )
      await indexWrittenPage(root, r.value.path)
      return ok({
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      })
    }

    case 'createContainer': {
      // '' parentPath = the nexus root (new top-level Collection). See createPage.
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return parent
      const extra: Record<string, unknown> = {}
      // Creation-seed: an app-made container is born with its default view on disk, so no
      // surface ever meets an empty views[]. The ULID mints here in main (the sentinel can't).
      extra.views = [{ ...mintDefaultView([]), id: `${VIEW_ID_PREFIX}${newId()}` }]
      const r = await createDisambiguated(req.name, (name) =>
        createFolderEntity(parent.value, req.kind, name, extra),
      )
      if (!r.ok) return r
      return ok({
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      })
    }

    case 'rename': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      const abs = resolved.value
      if (await isReserved(root, abs)) return fault('That item can’t be renamed.')
      if (req.kind === 'page') {
        const oldTitle = basenameNoMd(basename(abs))
        const relParent = req.path.split('/').slice(0, -1).join('/')
        const renamedReply = (landedPath: string): MutateReply => {
          const file = basename(landedPath)
          return ok({ renamed: { path: relJoin(relParent, file), name: basenameNoMd(file) } })
        }
        if (req.fromCreate) {
          // A just-created page's first commit is part of the creation: it disambiguates the
          // way every create does instead of rejecting, and skips the link cascade outright —
          // a page this new has no inbound links, and a cascade keyed on the literal
          // "Untitled" could rewrite unrelated [[Untitled]] links.
          const r = await createDisambiguated(req.newName, (name) => renamePage(abs, name))
          if (!r.ok) return r
          await moveIndexPaths(root, abs, r.value.path)
          return renamedReply(r.value.path)
        }
        const r = await renamePage(abs, req.newName)
        if (!r.ok) return r
        // renameCascade rewrites inbound [[links]] nexus-wide.
        try {
          const cascade = await renameCascade(root, oldTitle, req.newName)
          if (!cascade.ok) {
            await renamePage(r.value.path, oldTitle)
            return cascade
          }
        } catch {
          await renamePage(r.value.path, oldTitle)
          return fault('Rename cascade failed; the rename was reverted.')
        }
        // Heal markdown-block bodies too (renameCascade skips .nexus-resident, id-less block files).
        // Best-effort AFTER the page cascade committed: a failure here leaves blocks stale (re-runnable),
        // never un-reverts the now-successful page rename.
        try {
          await rewriteBlockConnections(root, oldTitle, req.newName)
        } catch {}
        await moveIndexPaths(root, abs, r.value.path)
        return renamedReply(r.value.path)
      }
      // No link cascade — [[links]] target pages, and a container's title is referenced nowhere else.
      const r = await renameFolderEntity(abs, req.newName)
      if (!r.ok) return r
      await moveIndexPaths(root, abs, r.value.path)
      return ok({})
    }

    case 'delete': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      const abs = resolved.value
      if (await isReserved(root, abs)) return fault('That item can’t be deleted.')
      if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
      // Write-ahead. The bundle is minted while the artifact is still live, the record lands
      // inside it before the sweep that destroys what it describes, and the artifact moves in
      // LAST — so a delete cut short leaves evidence rather than silence. Facts that only exist
      // mid-delete (a sweep's captured membership) are patched in on the way past; `partial`
      // is recomputed by the gatherers, never cleared, so a thin record always says so.
      //
      // System-trash mode records nothing: the artifact leaves the nexus entirely and there is
      // nowhere valid for a record to live. `write` is null there, and every gather with it.
      const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
      const write = bundle
        ? async (record: RecordFile | null): Promise<void> => {
            if (record) await writeRecord(bundle, record)
          }
        : null
      if (req.kind === 'space') {
        // The registry entry and the Space's own sidecar are read BEFORE the sweep — after it,
        // the membership they anchor is already gone.
        const registry = write ? await readRegistryStrict(root) : null
        if (write) await write(await gatherSpaceRecord(abs, registry, null))
        // Unlink the Space's title as a value everywhere BEFORE the folder trashes.
        const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs))
        if (write)
          await write(await gatherSpaceRecord(abs, registry, swept.ok ? swept.value : null))
      } else if (req.kind === 'context') {
        const title = basename(abs)
        // The title→id window closes at the registry erase, so the evidence is taken first.
        const evidence = write
          ? await gatherContextEvidence(abs, title, await readRegistryStrict(root))
          : null
        if (write && evidence) await write(buildContextRecord(evidence, null))
        // Unlink the parenthesized key everywhere OUTSIDE the folder being trashed — the
        // subtree's own roots are passengers whose links stay true in the trash; then drop
        // the registry entry; the folder tree (its Spaces included) trashes recoverably below.
        const swept = await unlinkContextKey(root, title, abs)
        // By id, never by title: the gather already resolved which entry this is, and two entries
        // sharing a title would otherwise erase both while only one folder is trashed.
        await mutateRegistryFile(root, (cur) => {
          const id = evidence?.entry.id ?? cur.contexts.find((c) => c.title === title)?.id
          return id ? { contexts: cur.contexts.filter((c) => c.id !== id) } : cur
        })
        if (write && evidence)
          await write(buildContextRecord(evidence, swept.ok ? swept.value : null))
      } else if (write) {
        await write(await gatherContentRecord(root, req.kind, abs))
      }
      if (bundle) await settleBundle(bundle, abs)
      else {
        recordWrite(abs) // in-nexus trash records inside settleBundle; the OS route records here
        await deps.trashToSystem(abs)
      }
      deindexPath(root, abs)
      return ok({})
    }

    case 'restore': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const r = await restoreArtifact(root, resolved.value, req.destination)
      if (!r.ok) return r
      // A restore lands an arbitrary subtree back in the corpus; the stat-gated seed reads
      // exactly the files that returned.
      await seedContentIndex(root)
      return ok({})
    }

    case 'emptyBundle': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const r = await emptyBundle(root, resolved.value, deps)
      return r.ok ? ok({}) : r
    }

    case 'setProfileSubtitle': {
      // Read-merge-write settings.json (≤30 chars), preserving every foreign key.
      const subtitle = req.subtitle.slice(0, 30)
      await updateSettings(root, (cur) => ({ ...cur, profile_subtitle: subtitle }))
      return ok({})
    }

    case 'setProfileImage': {
      // Profile avatar → the nexus icon in the asset directory, named by wikilink in
      // settings.profile_image (read-merge-write, other keys preserved).
      const settingsPath = nexusConfig(root, NEXUS_CONFIG_FILES.settings)
      const existing = await readJsonObject(settingsPath)
      const prev = await assetFileToDelete(root, existing?.profile_image)
      let rel: string | null = null
      if (req.dataUrl) {
        const written = await writeNexusIcon(root, req.dataUrl, existing?.profile_image)
        if (!written.ok) return written
        rel = written.value
      }
      // Set the field first, then delete a replaced file — a failed write never leaves
      // profile_image pointing at a deleted file (mirrors the banner/cover ordering).
      await updateSettings(root, (cur) => setOrDrop(cur, 'profile_image', rel))
      await dropReplacedAsset(root, prev, rel)
      return ok({})
    }

    case 'setProfileIcon': {
      // Glyph identity fallback → `settings.profile_icon` (read-merge-write, other keys preserved);
      // null clears it. No asset write — it's a symbol name, not an image.
      await updateSettings(root, (cur) => setOrDrop(cur, 'profile_icon', req.icon))
      return ok({})
    }

    case 'setBanner': {
      // Adoption stays inside each owner arm, AFTER that owner has been validated — a picked file
      // must not land in the asset directory for a banner the write is about to refuse.
      const adopt = async (): Promise<Result<string | null>> =>
        req.source ? adoptFile(root, req.source, { allow: 'image' }) : ok(null)
      // A page's banner is the `cover` key in its `.md` frontmatter, not a JSON sidecar.
      // Foreign frontmatter + body survive.
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        // Under the page's file lock — a banner (cover) write and a property cascade both rewrite
        // this page's frontmatter, so they must serialize rather than clobber from a stale read.
        return serializeOnFile(resolved.value, async () => {
          let existing: string
          try {
            existing = await readFile(resolved.value, 'utf8')
          } catch {
            return fault('That page could not be read.')
          }
          const { body } = splitEnvelope(existing)
          const fields = readFrontmatterFields(existing)
          const prev = await assetFileToDelete(root, fields.cover)
          const adopted = await adopt()
          if (!adopted.ok) return adopted
          const rel = adopted.value
          // Set the field first; only THEN delete a replaced file, so a failed write never
          // leaves `cover` pointing at a deleted file.
          await atomicWriteFile(
            resolved.value,
            mergeFrontmatter(existing, rel ? { cover: rel } : {}, ['cover'], body),
          )
          await dropReplacedAsset(root, prev, rel)
          return ok({})
        })
      }
      // The NavView's banner rides navigation.json — the pointer is the only linkage, so the
      // one serialized patch-writer is what keeps the arrays and the banner from dropping
      // each other.
      if (req.kind === 'navview') {
        // Resolved rather than trusted: the read gate now admits a wikilink, which names a
        // file rather than a path, and one several files answer to deletes nothing at all.
        const prevNav = await assetFileToDelete(root, (await readNavigationFile(root)).banner)
        const adopted = await adopt()
        if (!adopted.ok) return adopted
        await writeNavigationState(root, { banner: adopted.value ?? undefined })
        await dropReplacedAsset(root, prevNav, adopted.value)
        return ok({})
      }
      // Resolve the config holding the banner field, per owner kind: the homepage is a singleton
      // (.nexus/homepage.json); the rest are folder sidecars.
      let cfgPath: string
      // The singleton legitimately seeds from nothing; a folder sidecar never does — one that
      // vanishes mid-op fails not-found rather than being re-minted around a banner.
      let seed: (() => Record<string, unknown>) | undefined
      let existing: Record<string, unknown> | null
      if (req.kind === 'homepage') {
        cfgPath = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
        seed = () => ({})
        existing = await readJsonObject(cfgPath)
      } else {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        if (await isReserved(root, resolved.value)) return fault('That item can’t take a banner.')
        cfgPath = sidecarPath(resolved.value, req.kind)
        existing = await readJsonObject(cfgPath)
      }
      const prev = await assetFileToDelete(root, existing?.banner)
      const adopted = await adopt()
      if (!adopted.ok) return adopted
      // Same ordering as the page arm above: field first, then delete.
      const written = await rmwJsonStrict(
        cfgPath,
        (cur) => setOrDrop(cur, 'banner', adopted.value),
        seed,
      )
      if (!written.ok) return written
      await dropReplacedAsset(root, prev, adopted.value)
      return ok({})
    }

    case 'setHeadingIconHidden': {
      // The banner-heading icon show/hide flag → `heading_icon_hidden` in the owner's config
      // (homepage.json for the singleton, the folder sidecar otherwise). Absent = shown.
      let cfgPath: string
      let fallback: Record<string, unknown>
      if (req.kind === 'navview') return fault('The NavView has no heading icon.')
      if (req.kind === 'page') return fault('A page has no heading icon.')
      if (req.kind === 'homepage') {
        cfgPath = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
        fallback = {}
      } else {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        cfgPath = sidecarPath(resolved.value, req.kind)
        const id = (await readJsonObject(cfgPath))?.id
        if (typeof id !== 'string') return fault('That item has no id.')
        fallback = { id }
      }
      const written = await rmwJsonStrict(
        cfgPath,
        (cur) => setOrDrop(cur, 'heading_icon_hidden', req.hidden),
        () => fallback,
      )
      if (!written.ok) return written
      return ok({})
    }

    case 'setIcon': {
      // A bare symbol id. Pages carry it in `.md` frontmatter (`icon`); containers + contexts in their
      // JSON sidecar. `null` clears it. Foreign frontmatter/keys survive (mirrors setBanner, minus the
      // asset file).
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        return serializeOnFile(resolved.value, async () => {
          let existing: string
          try {
            existing = await readFile(resolved.value, 'utf8')
          } catch {
            return fault('That page could not be read.')
          }
          const { body } = splitEnvelope(existing)
          const fields = req.icon ? { icon: req.icon } : {}
          await atomicWriteFile(resolved.value, mergeFrontmatter(existing, fields, ['icon'], body))
          return ok({})
        })
      }
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      if (await isReserved(root, resolved.value)) return fault('That item can’t take an icon.')
      if (req.kind === 'context') {
        // A Context's icon lives on its registry entry, not a folder sidecar.
        const title = basename(resolved.value)
        const r = await mutateRegistryFile(root, (cur) => ({
          contexts: cur.contexts.map((c) => {
            if (c.title !== title) return c
            const next = { ...c }
            if (req.icon) next.icon = req.icon
            else delete next.icon
            return next
          }),
        }))
        return r.ok ? ok({}) : r
      }
      const cfgPath = sidecarPath(resolved.value, req.kind)
      // One strict read: the id gate rides inside the mutator (the throw lands as the op's
      // fault), and a vanished sidecar fails not-found rather than being reseeded.
      const written = await rmwJsonStrict(cfgPath, (cur) => {
        if (typeof cur.id !== 'string') throw new Error('That item has no id.')
        return setOrDrop(cur, 'icon', req.icon)
      })
      if (!written.ok) return written
      return ok({})
    }

    case 'setProperty': {
      // Routed through the one page-value writer so a cell edit and an option cascade stamp the
      // page identically. Drives table cross-group reassignment.
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      // Resolved inside the lock: a rename sweeps on its own chain, so a name read before the
      // lock can send the write to a key the sweep has already passed.
      return serializeOnFile(resolved.value, async () => {
        const def = (await readRegistry(root)).defs[req.propertyId]
        if (!def) return fail('not-found', 'Property not found.')
        const r = await updatePageProperty(resolved.value, def, req.value)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        return ok({})
      })
    }

    case 'movePage': {
      const src = await resolveUnderRoot(root, req.path)
      if (!src.ok) return src
      const dst = await resolveUnderRoot(root, req.newParentPath)
      if (!dst.ok) return dst
      const destOk = await movesInto(root, dst.value)
      if (!destOk.ok) return destOk
      const r = await movePage(src.value, dst.value)
      if (!r.ok) return r
      // Persist the destination's new page order (reorder + drop-at-position). The source's
      // stale id self-drops on the next read, so only the destination is rewritten. Best-effort:
      // the file has already moved, and reporting a failed order write as a failed move leaves
      // the renderer showing the page where it no longer is. Order falls back to title instead.
      if (req.order) await setChildOrder(dst.value, 'page_order', req.order)
      await moveIndexPaths(root, src.value, r.value.path)
      return ok({})
    }

    case 'moveSet': {
      // The set's pages travel inside the folder.
      const src = await resolveUnderRoot(root, req.path)
      if (!src.ok) return src
      const dst = await resolveUnderRoot(root, req.newParentPath)
      if (!dst.ok) return dst
      const destOk = await movesInto(root, dst.value)
      if (!destOk.ok) return destOk
      const r = await moveFolderEntity(src.value, dst.value)
      if (!r.ok) return r
      // Best-effort for the same reason as movePage — the folder has already moved.
      await setChildOrder(dst.value, 'set_order', req.order)
      await moveIndexPaths(root, src.value, r.value.path)
      return ok({})
    }

    case 'reorderChildren': {
      // Reorder collections within a vault / sets within a collection — order-only, no move.
      const parent = await resolveUnderRoot(root, req.parentPath)
      if (!parent.ok) return parent
      const o = await setChildOrder(parent.value, req.key, req.order)
      if (!o.ok) return o
      return ok({})
    }

    case 'reorderTop': {
      // Reorder top Collections / a Context group — persisted to .nexus/state.json.
      const o = await setStateOrder(root, req.key, req.order)
      if (!o.ok) return o
      return ok({})
    }

    case 'createContextGroup': {
      const r = await createContextGroup(root, req.name)
      if (!r.ok) return r
      return ok({ created: r.value })
    }

    case 'createSpace': {
      const r = await createDisambiguated(req.name, (name) =>
        createSpace(root, req.contextId, name),
      )
      if (!r.ok) return r
      return ok({ created: r.value })
    }

    case 'setContext': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      if (await isReserved(root, resolved.value)) return fault('That item can’t take contexts.')
      const world = await loadContextWorld(root)
      if (!world.ok) return world
      const r = await setContextOnPath(resolved.value, world.value, req.contextId, req.spaceIds)
      return r.ok ? ok({}) : r
    }

    case 'setSpaceColor': {
      const r = await setSpaceColor(root, req.spaceId, req.color)
      return r.ok ? ok({}) : r
    }

    case 'renameContext': {
      const r = await renameContextOp(root, req.contextId, req.newName)
      return r.ok ? ok({}) : r
    }

    case 'renameSpace': {
      const r = await renameSpaceOp(root, req.spaceId, req.newName)
      return r.ok ? ok({}) : r
    }

    case 'reorderContexts': {
      // Registry array position IS the order; ids the renderer missed keep their
      // relative order at the end (a concurrent create must never vanish).
      const r = await mutateRegistryFile(root, (cur) => {
        const byId = new Map(cur.contexts.map((c) => [c.id, c]))
        const ordered = req.ids.map((id) => byId.get(id)).filter((c) => c !== undefined)
        const rest = cur.contexts.filter((c) => !req.ids.includes(c.id))
        return { contexts: [...ordered, ...rest] }
      })
      return r.ok ? ok({}) : r
    }

    case 'reorderSpaces': {
      const r = await setSpaceOrder(root, req.contextId, req.ids)
      return r.ok ? ok({}) : r
    }

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}
