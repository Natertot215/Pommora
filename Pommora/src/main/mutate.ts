// The single write orchestration behind the `mutate` IPC: resolves nexus-relative paths under
// the session root, runs the matching crud/* op, applies the cascade policy. Never throws
// across the boundary.
//
// Cascade policy, owned here so no call site re-invents it: a page rename reverts if
// renameCascade's inbound-[[links]] rewrite fails; a context/space delete unlinks the
// parenthesized key/value everywhere BEFORE the folder is removed, so no member file keeps a
// dangling reference. System-trash is injected (deps.trashToSystem) so this stays testable.

import { basename, dirname, join, relative, sep } from 'node:path'
import { mkdir, readFile, realpath, rm } from 'node:fs/promises'
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
import { mutateRegistryFile } from './contextsRegistry'
import { setSpaceOrder } from './crud/reorder'
import { renameCascade } from './crud/cascade'
import { rewriteBlockConnections } from './blocks'
import {
  trashWithTimestamp,
  pathExists,
  readJsonObject,
  rmwJsonStrict,
  atomicWriteBinary,
  atomicWriteFile,
} from './io/atomicWrite'
import { recordWrite } from './io/writeEcho'
import { isAssetPath, readNavigationFile, writeNavigationState } from './io/navigationFile'
import { serializeOnFile } from './io/fileLock'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from './io/pageFile'
import { basenameNoMd } from './coerce'
import { nexusConfig, SIDECAR_FILENAME, NEXUS_CONFIG_FILES } from './paths'
import { ensureIdentity } from './identity'
import { updateSettings } from './settings'
import { newId } from './ids'
import { mintDefaultView, VIEW_ID_PREFIX } from '@shared/views'
import { ok, fail, errText, type Result } from '@shared/result'
import type { MutateRequest, MutateResult } from '@shared/mutate'
import type { TrashMode } from './appConfig'
import { readRegistry } from './io/propertiesRegistry'

/** What the orchestration needs from the Electron layer (injected to keep this testable). */
export interface MutateDeps {
  trashMode: TrashMode
  /** Move a path to the OS trash (shell.trashItem). Only the 'system' trashMode uses it. */
  trashToSystem: (absPath: string) => Promise<void>
}

/** A nested Set's `parent_id` = its parent container's sidecar id (a Collection at depth-1,
 *  a Set deeper), set once at create time — a move does not re-heal it. Position (the folder
 *  nesting) is what the app itself walks, so a missing parent sidecar here is non-fatal; the
 *  create just omits the field. */
async function parentContainerId(parentDir: string): Promise<string | undefined> {
  for (const kind of ['collection', 'set'] as const) {
    const sc = await readJsonObject(join(parentDir, SIDECAR_FILENAME[kind]))
    if (sc && typeof sc.id === 'string') return sc.id
  }
  return undefined
}

const relJoin = (parent: string, child: string): string => (parent ? `${parent}/${child}` : child)

function decodeImageDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  const m = /^data:image\/([a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)
  if (!m) return null
  const subtype = m[1].toLowerCase()
  return { ext: subtype === 'jpeg' ? 'jpg' : subtype, buffer: Buffer.from(m[2], 'base64') }
}

/** A FRESH filename per write is deliberate: a stable name gave every image the same URL, so the
 *  renderer's <img> served the browser-cached previous image on Change/replace. */
async function writeImageAsset(
  root: string,
  assetKey: string,
  dataUrl: string,
  prefix: string,
): Promise<string | null> {
  const decoded = decodeImageDataUrl(dataUrl)
  if (!decoded) return null
  const file = `${prefix}-${Math.random().toString(36).slice(2, 10)}.${decoded.ext}`
  const rel = assetKey ? `.nexus/assets/${assetKey}/${file}` : `.nexus/assets/${file}`
  const absAsset = join(root, '.nexus', 'assets', assetKey, file)
  await mkdir(dirname(absAsset), { recursive: true })
  await atomicWriteBinary(absAsset, decoded.buffer)
  return rel
}

/** The nexus's own machinery — never a renderer-mutable entity. The read side skips these,
 *  so the write side refuses to rename/delete them (defense against a buggy/hostile renderer
 *  message). Contexts live UNDER `.nexus/contexts/<Title>/` and stay mutable — only the root,
 *  `.nexus` itself, and `.trash` are off-limits. `abs` is canonical (resolveUnderRoot realpaths
 *  it), so the root is canonicalized too — else a symlinked root (e.g. macOS /var→/private/var)
 *  makes `relative` mismatch and the guard silently passes. */
async function isReserved(root: string, abs: string): Promise<boolean> {
  const rel = relative(await realpath(root), abs)
  return rel === '' || rel === '.nexus' || rel === '.trash' || rel.startsWith(`.trash${sep}`)
}

function relay<T>(r: Result<T>): MutateResult {
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

const fault = (message: string): MutateResult => ({
  ok: false,
  error: { code: 'operation-failed', message },
})

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

/** Strict read-modify-write of one config file, locked on the file itself — the block-doc
 *  writers share homepage.json, and two unlocked read-merge-writes lose whole keys. */
function patchConfig(
  cfgPath: string,
  patch: (cur: Record<string, unknown>) => Record<string, unknown>,
  seed?: () => Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> {
  return serializeOnFile(cfgPath, () => rmwJsonStrict(cfgPath, patch, seed))
}

/**
 * Create with a base name, disambiguating on collision: base, "base 2", "base 3", … The
 * "New …" UX — a fresh entity should always appear, never silently fail on a name clash.
 * Only creates disambiguate; rename stays strict (renaming onto an existing name is an error).
 */
async function createDisambiguated(
  baseName: string,
  attempt: (name: string) => Promise<Result<{ id: string; path: string }>>,
): Promise<Result<{ id: string; path: string }>> {
  let last = await attempt(baseName)
  for (let n = 2; n <= 50 && !last.ok && last.error.code === 'exists'; n++) {
    last = await attempt(`${baseName} ${n}`)
  }
  return last
}

export async function handleMutate(req: MutateRequest, deps: MutateDeps): Promise<MutateResult> {
  const root = sessionRoot()
  if (root === null) return fault('No nexus is open.')
  // A CRUD/fs/trash throw (e.g. shell.trashItem rejecting, EACCES/ENOSPC) becomes a fault
  // Result here, not a rejected IPC promise callers would silently swallow.
  try {
    return await dispatch(req, deps, root)
  } catch (e) {
    return fault(errText(e))
  }
}

async function dispatch(req: MutateRequest, deps: MutateDeps, root: string): Promise<MutateResult> {
  switch (req.op) {
    case 'createPage': {
      // '' parentPath = the nexus root (e.g. a page directly under an adopted root); '.'
      // is the existing dir resolveUnderRoot validates. relJoin keeps '' for the rel path.
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return relay(parent)
      const r = await createDisambiguated(req.name, (name) => createPage(parent.value, name))
      if (!r.ok) return relay(r)
      return {
        ok: true,
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      }
    }

    case 'createContainer': {
      // '' parentPath = the nexus root (new top-level Collection). See createPage.
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return relay(parent)
      const extra: Record<string, unknown> = {}
      if (req.kind === 'set') {
        const pid = await parentContainerId(parent.value)
        if (pid) extra.parent_id = pid
      }
      // Creation-seed: an app-made container is born with its default view on disk, so no
      // surface ever meets an empty views[]. The ULID mints here in main (the sentinel can't).
      extra.views = [{ ...mintDefaultView([]), id: `${VIEW_ID_PREFIX}${newId()}` }]
      const r = await createDisambiguated(req.name, (name) =>
        createFolderEntity(parent.value, req.kind, name, extra),
      )
      if (!r.ok) return relay(r)
      return {
        ok: true,
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      }
    }

    case 'rename': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return relay(resolved)
      const abs = resolved.value
      if (await isReserved(root, abs)) return fault('That item can’t be renamed.')
      if (req.kind === 'page') {
        const oldTitle = basenameNoMd(basename(abs))
        const r = await renamePage(abs, req.newName)
        if (!r.ok) return relay(r)
        // renameCascade rewrites inbound [[links]] nexus-wide.
        try {
          const cascade = await renameCascade(root, oldTitle, req.newName)
          if (!cascade.ok) {
            await renamePage(r.value.path, oldTitle)
            return relay(cascade)
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
        return { ok: true }
      }
      // No link cascade — [[links]] target pages, and a container's title is referenced nowhere else.
      const r = await renameFolderEntity(abs, req.newName)
      if (!r.ok) return relay(r)
      return { ok: true }
    }

    case 'delete': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return relay(resolved)
      const abs = resolved.value
      if (await isReserved(root, abs)) return fault('That item can’t be deleted.')
      if (req.kind === 'space') {
        // Unlink the Space's title as a value everywhere BEFORE the folder trashes.
        await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs))
      }
      if (req.kind === 'context') {
        // Unlink the parenthesized key everywhere, then drop the registry entry; the folder
        // tree (its Spaces included) trashes recoverably below.
        const title = basename(abs)
        await unlinkContextKey(root, title)
        await mutateRegistryFile(root, (cur) => ({
          contexts: cur.contexts.filter((c) => c.title !== title),
        }))
      }
      const removed = await removeViaMode(root, abs, deps)
      if (!removed.ok) return relay(removed)
      return { ok: true }
    }

    case 'setProfileSubtitle': {
      // Read-merge-write settings.json (≤30 chars), preserving every foreign key.
      const subtitle = req.subtitle.slice(0, 30)
      await updateSettings(root, (cur) => ({ ...cur, profile_subtitle: subtitle }))
      return { ok: true }
    }

    case 'setProfileImage': {
      // Profile avatar → `.nexus/assets/<nexusID>/profile-<token>.<ext>`; the path is recorded
      // in settings.profile_image (read-merge-write, other keys preserved).
      const settingsPath = nexusConfig(root, NEXUS_CONFIG_FILES.settings)
      const existing = await readJsonObject(settingsPath)
      const prev = isAssetPath(existing?.profile_image) ? existing.profile_image : null
      if (req.dataUrl) {
        const { id: nexusId } = await ensureIdentity(root)
        const rel = await writeImageAsset(root, nexusId, req.dataUrl, 'profile')
        if (!rel) return fault('Unsupported image data.')
        // Set the field first, then delete a replaced file — a failed write never leaves
        // profile_image pointing at a deleted file (mirrors the banner/cover ordering).
        await updateSettings(root, (cur) => ({ ...cur, profile_image: rel }))
        if (prev && prev !== rel) await rm(join(root, prev), { force: true }).catch(() => {})
      } else {
        await updateSettings(root, (cur) => {
          const next = { ...cur }
          delete next.profile_image
          return next
        })
        if (prev) await rm(join(root, prev), { force: true }).catch(() => {})
      }
      return { ok: true }
    }

    case 'setProfileIcon': {
      // Glyph identity fallback → `settings.profile_icon` (read-merge-write, other keys preserved);
      // null clears it. No asset write — it's a symbol name, not an image.
      await updateSettings(root, (cur) => {
        const next = { ...cur }
        if (req.icon) next.profile_icon = req.icon
        else delete next.profile_icon
        return next
      })
      return { ok: true }
    }

    case 'setBanner': {
      // A page's banner is the `cover` key in its `.md` frontmatter (not a JSON
      // sidecar); the asset folder is keyed by the page id. Foreign frontmatter + body survive.
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return relay(resolved)
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
          const id = typeof fields.id === 'string' ? fields.id : null
          if (!id) return fault('That page has no id to key its banner.')
          const prev = isAssetPath(fields.cover) ? fields.cover : null
          if (req.dataUrl) {
            const rel = await writeImageAsset(root, id, req.dataUrl, 'banner')
            if (!rel) return fault('Unsupported image data.')
            await atomicWriteFile(
              resolved.value,
              mergeFrontmatter(existing, { cover: rel }, ['cover'], body),
            )
            if (prev && prev !== rel) await rm(join(root, prev), { force: true }).catch(() => {})
          } else {
            await atomicWriteFile(resolved.value, mergeFrontmatter(existing, {}, ['cover'], body))
            if (prev) await rm(join(root, prev), { force: true }).catch(() => {})
          }
          return { ok: true }
        })
      }
      // The NavView's banner rides navigation.json — the pointer is the only linkage, so the
      // image sits in shared assets with no per-owner folder, and the one serialized patch-writer
      // is what keeps the arrays and the banner from dropping each other.
      if (req.kind === 'navview') {
        // The read gate (isAssetPath) already vetted this pointer — the rm below can only
        // ever aim inside shared assets.
        const prevNav = (await readNavigationFile(root)).banner ?? null
        let next: string | undefined
        if (req.dataUrl) {
          const rel = await writeImageAsset(root, '', req.dataUrl, 'banner')
          if (!rel) return fault('Unsupported image data.')
          next = rel
        }
        await writeNavigationState(root, { banner: next })
        if (prevNav && prevNav !== next) await rm(join(root, prevNav), { force: true }).catch(() => {})
        return { ok: true }
      }
      // Resolve the config holding the banner field + the asset-folder key, per owner kind. The
      // homepage is a singleton (.nexus/homepage.json); the rest are folder sidecars keyed by
      // their entity id (assets/<id>/).
      let cfgPath: string
      let assetKey: string
      // The singleton legitimately seeds from nothing; a folder sidecar never does — one that
      // vanishes mid-op fails not-found rather than being re-minted around a banner.
      let seed: (() => Record<string, unknown>) | undefined
      let existing: Record<string, unknown> | null
      if (req.kind === 'homepage') {
        cfgPath = nexusConfig(root, NEXUS_CONFIG_FILES.homepage)
        assetKey = req.kind
        seed = () => ({})
        existing = await readJsonObject(cfgPath)
      } else {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return relay(resolved)
        if (await isReserved(root, resolved.value)) return fault('That item can’t take a banner.')
        cfgPath = `${resolved.value}/${SIDECAR_FILENAME[req.kind]}`
        existing = await readJsonObject(cfgPath)
        const id = typeof existing?.id === 'string' ? existing.id : null
        if (!id) return fault('That item has no id to key its banner.')
        assetKey = id
      }
      const prev = isAssetPath(existing?.banner) ? existing.banner : null
      if (req.dataUrl) {
        const rel = await writeImageAsset(root, assetKey, req.dataUrl, 'banner')
        if (!rel) return fault('Unsupported image data.')
        // Set the field first; only THEN delete a replaced file, so a failed write never
        // leaves `banner` pointing at a deleted file (mirrors the cover/photo ordering).
        const written = await patchConfig(cfgPath, (cur) => setOrDrop(cur, 'banner', rel), seed)
        if (!written.ok) return relay(written)
        if (prev && prev !== rel) await rm(join(root, prev), { force: true }).catch(() => {})
      } else {
        const written = await patchConfig(
          cfgPath,
          (cur) => setOrDrop(cur, 'banner', undefined),
          seed,
        )
        if (!written.ok) return relay(written)
        if (prev) await rm(join(root, prev), { force: true }).catch(() => {})
      }
      return { ok: true }
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
        if (!resolved.ok) return relay(resolved)
        cfgPath = `${resolved.value}/${SIDECAR_FILENAME[req.kind]}`
        const id = (await readJsonObject(cfgPath))?.id
        if (typeof id !== 'string') return fault('That item has no id.')
        fallback = { id }
      }
      const written = await patchConfig(
        cfgPath,
        (cur) => setOrDrop(cur, 'heading_icon_hidden', req.hidden),
        () => fallback,
      )
      if (!written.ok) return relay(written)
      return { ok: true }
    }

    case 'setIcon': {
      // A bare symbol id. Pages carry it in `.md` frontmatter (`icon`); containers + contexts in their
      // JSON sidecar. `null` clears it. Foreign frontmatter/keys survive (mirrors setBanner, minus the
      // asset file).
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return relay(resolved)
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
          return { ok: true }
        })
      }
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return relay(resolved)
      if (await isReserved(root, resolved.value)) return fault('That item can’t take an icon.')
      if (req.kind === 'context') {
        // A Context's icon lives on its registry entry, not a folder sidecar.
        const title = basename(resolved.value)
        return relay(
          await mutateRegistryFile(root, (cur) => ({
            contexts: cur.contexts.map((c) => {
              if (c.title !== title) return c
              const next = { ...c }
              if (req.icon) next.icon = req.icon
              else delete next.icon
              return next
            }),
          })),
        )
      }
      const cfgPath = `${resolved.value}/${SIDECAR_FILENAME[req.kind]}`
      // One strict read: the id gate rides inside the mutator (the throw lands as the op's
      // fault), and a vanished sidecar fails not-found rather than being reseeded.
      const written = await patchConfig(cfgPath, (cur) => {
        if (typeof cur.id !== 'string') throw new Error('That item has no id.')
        return setOrDrop(cur, 'icon', req.icon)
      })
      if (!written.ok) return relay(written)
      return { ok: true }
    }

    case 'setProperty': {
      // Routed through the one page-value writer so a cell edit and an option cascade stamp the
      // page identically. Drives table cross-group reassignment.
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return relay(resolved)
      // Resolved inside the lock: a rename sweeps on its own chain, so a name read before the
      // lock can send the write to a key the sweep has already passed.
      return serializeOnFile(resolved.value, async () => {
        const def = (await readRegistry(root)).defs[req.propertyId]
        if (!def) return relay(fail('not-found', 'Property not found.'))
        return updatePageProperty(resolved.value, def, req.value).then(relay)
      })
    }

    case 'movePage': {
      const src = await resolveUnderRoot(root, req.path)
      if (!src.ok) return relay(src)
      const dst = await resolveUnderRoot(root, req.newParentPath)
      if (!dst.ok) return relay(dst)
      const r = await movePage(src.value, dst.value)
      if (!r.ok) return relay(r)
      // Persist the destination's new page order (reorder + drop-at-position). The source's
      // stale id self-drops on the next read, so only the destination is rewritten.
      if (req.order) {
        const o = await setChildOrder(dst.value, 'page_order', req.order)
        if (!o.ok) return relay(o)
      }
      return { ok: true }
    }

    case 'moveSet': {
      // The set's pages travel inside the folder.
      const src = await resolveUnderRoot(root, req.path)
      if (!src.ok) return relay(src)
      const dst = await resolveUnderRoot(root, req.newParentPath)
      if (!dst.ok) return relay(dst)
      const r = await moveFolderEntity(src.value, dst.value)
      if (!r.ok) return relay(r)
      const o = await setChildOrder(dst.value, 'set_order', req.order)
      if (!o.ok) return relay(o)
      return { ok: true }
    }

    case 'reorderChildren': {
      // Reorder collections within a vault / sets within a collection — order-only, no move.
      const parent = await resolveUnderRoot(root, req.parentPath)
      if (!parent.ok) return relay(parent)
      const o = await setChildOrder(parent.value, req.key, req.order)
      if (!o.ok) return relay(o)
      return { ok: true }
    }

    case 'reorderTop': {
      // Reorder top Collections / a Context group — persisted to .nexus/state.json.
      const o = await setStateOrder(root, req.key, req.order)
      if (!o.ok) return relay(o)
      return { ok: true }
    }

    case 'createContextGroup': {
      const r = await createContextGroup(root, req.name)
      if (!r.ok) return relay(r)
      return { ok: true, created: r.value }
    }

    case 'createSpace': {
      const r = await createDisambiguated(req.name, (name) =>
        createSpace(root, req.contextId, name),
      )
      if (!r.ok) return relay(r)
      return { ok: true, created: r.value }
    }

    case 'setContext': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return relay(resolved)
      if (await isReserved(root, resolved.value)) return fault('That item can’t take contexts.')
      const world = await loadContextWorld(root)
      if (!world.ok) return relay(world)
      return relay(await setContextOnPath(resolved.value, world.value, req.contextId, req.spaceIds))
    }

    case 'setSpaceColor':
      return relay(await setSpaceColor(root, req.spaceId, req.color))

    case 'renameContext':
      return relay(await renameContextOp(root, req.contextId, req.newName))

    case 'renameSpace':
      return relay(await renameSpaceOp(root, req.spaceId, req.newName))

    case 'reorderContexts': {
      // Registry array position IS the order; ids the renderer missed keep their
      // relative order at the end (a concurrent create must never vanish).
      const r = await mutateRegistryFile(root, (cur) => {
        const byId = new Map(cur.contexts.map((c) => [c.id, c]))
        const ordered = req.ids.map((id) => byId.get(id)).filter((c) => c !== undefined)
        const rest = cur.contexts.filter((c) => !req.ids.includes(c.id))
        return { contexts: [...ordered, ...rest] }
      })
      return relay(r)
    }

    case 'reorderSpaces':
      return relay(await setSpaceOrder(root, req.contextId, req.ids))

    default: {
      const _exhaustive: never = req
      void _exhaustive
      return fault('Unknown operation.')
    }
  }
}

/** Remove a file/folder per the delete-target setting: in-nexus .trash (default, portable +
 *  recoverable) or the OS Trash. trashWithTimestamp is the shared primitive crud's delete*
 *  uses; this adds the mode branch the crud helpers don't cover. */
async function removeViaMode(root: string, abs: string, deps: MutateDeps): Promise<Result<null>> {
  if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
  if (deps.trashMode === 'system') {
    recordWrite(abs) // in-nexus trash records inside trashWithTimestamp; the OS route records here
    await deps.trashToSystem(abs)
  } else await trashWithTimestamp(root, abs)
  return ok(null)
}
