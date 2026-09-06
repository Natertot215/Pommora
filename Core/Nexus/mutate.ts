import { basename, dirname, extname, join, relative } from '../Locations/posix'
import { machine } from '../Platform/machine'
import { sessionRoot } from './session'
import { noteValueWrite } from './valuesChanged'
import { splitFrontmatter } from './readNexus'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { createPage, renamePage, movePage, updatePageProperty } from './page'
import { setChildOrder, setStateOrder } from './reorder'
import { createFolderEntity, renameFolderEntity, moveFolderEntity } from './folderEntity'
import {
  createContextGroup,
  createSpace,
  loadContextWorld,
  setContextOnPath,
  setSpaceColor,
  loadGovernedWorld,
} from '../Contexts/contextWrite'
import {
  renameContextOp,
  renameSpaceOp,
  unlinkContextKey,
  unlinkSpaceValue,
} from '../Contexts/contextCascade'
import { mutateRegistryFile, readRegistryStrict } from '../Contexts/contextsRegistry'
import {
  buildContextRecord,
  gatherContentRecord,
  gatherContextEvidence,
  gatherSpaceRecord,
} from '../Trash/gather'
import { type RecordFile, writeRecord } from '../Trash/record'
import { emptyBundle, restoreArtifact } from '../Trash/spend'
import { setSpaceOrder } from './reorder'
import { renameCascade } from './cascade'
import { applyAdoptions } from '../Properties/optionOps'
import { rewriteTileConnections } from '../Tiles/tilesFile'
import {
  pathExists,
  readJsonObject,
  readTextOrNull,
  rmwJsonStrict,
  atomicWriteFile,
} from '../IO/atomicWrite'
import { mintBundle, settleBundle } from '../Trash/bundle'
import { recordWrite } from '../IO/writeEcho'
import { readNavigationFile, writeNavigationState } from '../Navigation/navigationFile'
import {
  assetFilePath,
  assetFileToDelete,
  NOT_A_PROPERTY_DIR_MESSAGE,
  underAssetRoot,
  validPropertyDir,
} from '../Assets/assetRoots'
import { createDisambiguated } from '../Locations/disambiguate'
import { writeAssetFile } from '../Assets/assetWrite'
import { splitEnvelope, mergeFrontmatter, readFrontmatterFields } from '../IO/pageFile'
import { basenameNoMd } from '../Locations/coerce'
import { nexusConfig, relPosix, sidecarPath, NEXUS_CONFIG_FILES } from '../Locations/paths'
import { resolveFolderKind } from './folderKind'
import { readWatchScope, updateCrops, updateSettings } from '../Settings/settings'
import { newId } from '../Locations/ids'
import { mintDefaultView, VIEW_ID_PREFIX } from '../Views/views'
import { ok, fail, errText, NO_NEXUS, type Result } from '../Contract/result'
import { NEW_PAGE_SLOT, type MutateReply, type MutateRequest } from '../Pages/mutateRequest'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import type { TrashMode } from '../Trash/trashRow'
import { readRegistry } from '../Properties/propertiesRegistry'
import { deindexPath, indexWrittenPage, moveIndexPaths, seedContentIndex } from '../Index/indexSeed'
import { NON_CORPUS_TOP, TRASH_DIR, assetSubRoot, cropKeyFor } from '../Locations/nexusPaths'
import { WEB_ADDRESS } from '../Locations/url'
import { clampZoom } from '../Assets/cropGeometry'
import { connectionText, embeddableTitle } from '../Connections/connections'
import { ASSET_MIME } from '../Assets/assetMime'
import { neverWatched } from '../Locations/exclusion'
import { AMBIGUOUS, indexable, liveAssetMap, resolveAssetName } from '../Assets/assetMap'

export interface MutateDeps {
  trashMode: TrashMode
  trashToSystem: (absPath: string) => Promise<void>
  permanentDelete?: boolean
}

const relJoin = (parent: string, child: string): string => (parent ? `${parent}/${child}` : child)

async function dropReplacedAsset(
  root: string,
  prev: string | null,
  next: string | null,
  trash: (absPath: string) => Promise<void>,
): Promise<void> {
  if (!prev || prev === (await assetFileToDelete(root, next))) return
  await trash(join(root, prev)).catch(() => {})
  await updateCrops(root, (b) => setOrDrop(b, prev, null)).catch(() => {})
}

export async function adoptFile(
  root: string,
  absSource: string,
  opts: { allow: 'image' | 'any'; subfolder?: string },
): Promise<Result<string>> {
  const base = basename(absSource)
  if (!base || !embeddableTitle(base) || neverWatched(base))
    return fault('That file’s name can’t be written as a link.')
  if (opts.allow === 'image' && !(extname(base).toLowerCase() in ASSET_MIME))
    return fault('That file isn’t an image Pommora can show.')
  const { assetDir } = await readWatchScope(root)
  const dir = assetSubRoot(assetDir, opts.subfolder)
  if (opts.subfolder !== undefined && !validPropertyDir(opts.subfolder, assetDir))
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  // Resolving the SUBFOLDER, not the root, is what catches a segment inside the root that is a symlink out.
  const canonical = await resolveUnderRoot(root, dir)
  if (!canonical.ok && canonical.error.code !== 'not-found') return canonical
  if (
    opts.subfolder &&
    canonical.ok &&
    !underAssetRoot(relPosix(await machine().realpath(root), canonical.value), assetDir)
  )
    return fault(NOT_A_PROPERTY_DIR_MESSAGE)
  const hit = resolveAssetName(await liveAssetMap(root), base)
  if (hit === AMBIGUOUS) return fault(`More than one file is named ${base}.`)

  // A pick from a hidden folder under the root would mint a reference that never resolves; it copies instead.
  const srcRel = relPosix(await machine().realpath(root), await machine().realpath(absSource))
  if (underAssetRoot(srcRel, assetDir) && indexable(srcRel, assetDir))
    return ok(connectionText(base))

  const bytes = await machine()
    .readBytes(absSource)
    .catch(() => null)
  if (!bytes) return fault('That file could not be read.')
  const held = hit
    ? await machine()
        .readBytes(join(root, hit))
        .catch(() => null)
    : null
  if (held && sameBytes(bytes, held)) return ok(connectionText(base))
  return writeAssetFile(root, dir, base, bytes)
}

async function isReserved(root: string, abs: string): Promise<boolean> {
  const rel = relative(await machine().realpath(root), abs)
  return rel === '' || NON_CORPUS_TOP.has(rel) || rel.startsWith(`${TRASH_DIR}/`)
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

const fault = (message: string): Result<never> => fail('operation-failed', message)

async function movesInto(root: string, dst: string): Promise<Result<null>> {
  const depth = dirname(dst) === root ? 'root' : 'nested'
  const kind = await resolveFolderKind(dst, depth, { agenda: {}, homed: new Set(), root })
  return kind === 'collection' || kind === 'set'
    ? ok(null)
    : fail('invalid-path', 'Pages live in Collections and Sets.')
}

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
  try {
    return await dispatch(req, deps, root)
  } catch (e) {
    return fault(errText(e))
  }
}

const adoptImageSource = (root: string, source: string): Promise<Result<string>> =>
  WEB_ADDRESS.test(source)
    ? Promise.resolve(ok(source))
    : adoptFile(root, source, { allow: 'image' })

async function dispatch(req: MutateRequest, deps: MutateDeps, root: string): Promise<MutateReply> {
  switch (req.op) {
    case 'createPage': {
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return parent
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
      noteValueWrite(root, r.value.path)
      return ok({
        created: { id: r.value.id, path: relJoin(req.parentPath, basename(r.value.path)) },
      })
    }

    case 'createContainer': {
      const parent = await resolveUnderRoot(root, req.parentPath || '.')
      if (!parent.ok) return parent
      const extra: Record<string, unknown> = {}
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
          const r = await createDisambiguated(req.newName, (name) => renamePage(abs, name))
          if (!r.ok) return r
          await moveIndexPaths(root, abs, r.value.path)
          return renamedReply(r.value.path)
        }
        const r = await renamePage(abs, req.newName)
        if (!r.ok) return r
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
        try {
          await rewriteTileConnections(root, oldTitle, req.newName)
        } catch {}
        await moveIndexPaths(root, abs, r.value.path)
        return renamedReply(r.value.path)
      }
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
      // Write-ahead: the record lands before the sweep destroys what it describes, and the artifact
      // moves LAST, so a delete cut short leaves evidence rather than silence.
      const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
      const write = bundle
        ? async (record: RecordFile | null): Promise<void> => {
            if (record) await writeRecord(bundle, record)
          }
        : null
      if (req.kind === 'space') {
        const registry = write ? await readRegistryStrict(root) : null
        if (write) await write(await gatherSpaceRecord(abs, registry, null))
        const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs))
        if (write)
          await write(await gatherSpaceRecord(abs, registry, swept.ok ? swept.value : null))
      } else if (req.kind === 'context') {
        const title = basename(abs)
        const evidence = write
          ? await gatherContextEvidence(abs, title, await readRegistryStrict(root))
          : null
        if (write && evidence) await write(buildContextRecord(evidence, null))
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
      return ok(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {})
    }

    case 'restore': {
      const resolved = await resolveUnderRoot(root, req.bundlePath)
      if (!resolved.ok) return resolved
      const r = await restoreArtifact(root, resolved.value, req.destination)
      if (!r.ok) return r
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
      const subtitle = req.subtitle.slice(0, 30)
      await updateSettings(root, (cur) => ({ ...cur, profile_subtitle: subtitle }))
      return ok({})
    }

    case 'setProfileImage': {
      const settingsPath = nexusConfig(root, NEXUS_CONFIG_FILES.settings)
      const existing = await readJsonObject(settingsPath)
      const prev = await assetFileToDelete(root, existing?.profile_image)
      const adopted = req.source ? await adoptImageSource(root, req.source) : ok(null)
      if (!adopted.ok) return adopted
      // Field first, then the replaced file: a failed write never points at a deleted file.
      await updateSettings(root, (cur) => setOrDrop(cur, 'profile_image', adopted.value))
      await dropReplacedAsset(root, prev, adopted.value, deps.trashToSystem)
      return ok(adopted.value ? { adopted: adopted.value } : {})
    }

    case 'setProfileIcon': {
      await updateSettings(root, (cur) => setOrDrop(cur, 'profile_icon', req.icon))
      return ok({})
    }

    case 'setCrop': {
      const key = cropKeyFor(await assetFilePath(root, req.image), req.image)
      if (!key) return fault('That image can’t be framed.')
      await updateCrops(root, (b) =>
        setOrDrop(b, key, req.crop && { ...req.crop, zoom: clampZoom(req.crop.zoom) }),
      )
      return ok({})
    }

    case 'setBanner': {
      const adopt = async (): Promise<Result<string | null>> =>
        req.source ? adoptImageSource(root, req.source) : ok(null)
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        return machine().lock(resolved.value, async () => {
          const existing = await readTextOrNull(resolved.value)
          if (existing === null) return fault('That page could not be read.')
          const { body } = splitEnvelope(existing)
          const fields = readFrontmatterFields(existing)
          const prev = await assetFileToDelete(root, fields.banner)
          const adopted = await adopt()
          if (!adopted.ok) return adopted
          const rel = adopted.value
          // Field first, then the replaced file: a failed write never points at a deleted file.
          await atomicWriteFile(
            resolved.value,
            mergeFrontmatter(existing, rel ? { banner: rel } : {}, ['banner'], body),
          )
          noteValueWrite(root, resolved.value)
          await dropReplacedAsset(root, prev, rel, deps.trashToSystem)
          return ok(rel ? { adopted: rel } : {})
        })
      }
      if (req.kind === 'navview') {
        const prevNav = await assetFileToDelete(root, (await readNavigationFile(root)).banner)
        const adopted = await adopt()
        if (!adopted.ok) return adopted
        await writeNavigationState(root, { banner: adopted.value ?? undefined })
        await dropReplacedAsset(root, prevNav, adopted.value, deps.trashToSystem)
        return ok(adopted.value ? { adopted: adopted.value } : {})
      }
      let cfgPath: string
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
      const written = await rmwJsonStrict(
        cfgPath,
        (cur) => setOrDrop(cur, 'banner', adopted.value),
        seed,
      )
      if (!written.ok) return written
      await dropReplacedAsset(root, prev, adopted.value, deps.trashToSystem)
      return ok(adopted.value ? { adopted: adopted.value } : {})
    }

    case 'setHeadingIconHidden': {
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
      if (req.kind === 'page') {
        const resolved = await resolveUnderRoot(root, req.path)
        if (!resolved.ok) return resolved
        return machine().lock(resolved.value, async () => {
          const existing = await readTextOrNull(resolved.value)
          if (existing === null) return fault('That page could not be read.')
          const { body } = splitEnvelope(existing)
          const fields = req.icon ? { icon: req.icon } : {}
          await atomicWriteFile(resolved.value, mergeFrontmatter(existing, fields, ['icon'], body))
          noteValueWrite(root, resolved.value)
          return ok({})
        })
      }
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      if (await isReserved(root, resolved.value)) return fault('That item can’t take an icon.')
      if (req.kind === 'context') {
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
      const written = await rmwJsonStrict(cfgPath, (cur) => {
        if (typeof cur.id !== 'string') throw new Error('That item has no id.')
        return setOrDrop(cur, 'icon', req.icon)
      })
      if (!written.ok) return written
      return ok({})
    }

    case 'setDisclosureLock': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      const cfgPath = sidecarPath(resolved.value, req.kind)
      const written = await rmwJsonStrict(cfgPath, (cur) => {
        if (typeof cur.id !== 'string') throw new Error('That item has no id.')
        return setOrDrop(cur, 'disclosure_locked', req.locked)
      })
      if (!written.ok) return written
      return ok({})
    }

    case 'setProperty': {
      const resolved = await resolveUnderRoot(root, req.path)
      if (!resolved.ok) return resolved
      // Resolved inside the lock: a rename sweeps on its own chain, so a name read before the
      // lock can send the write to a key the sweep has already passed.
      const adoptions = await machine().lock(resolved.value, async () => {
        const def = (await readRegistry(root)).defs[req.propertyId]
        if (!def) return fail('not-found', 'Property not found.')
        const content = await readTextOrNull(resolved.value)
        if (content === null) return fail('not-found', 'That page could not be read.')
        const world = await loadGovernedWorld(root, resolved.value, splitFrontmatter(content))
        const r = await updatePageProperty(resolved.value, def, req.value, world)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        return r
      })
      if (!adoptions.ok) return adoptions
      await applyAdoptions(root, adoptions.value)
      return ok({})
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
      if (req.order) await setChildOrder(dst.value, 'page_order', req.order)
      await moveIndexPaths(root, src.value, r.value.path)
      noteValueWrite(root, r.value.path)
      return ok({})
    }

    case 'moveSet': {
      const src = await resolveUnderRoot(root, req.path)
      if (!src.ok) return src
      const dst = await resolveUnderRoot(root, req.newParentPath)
      if (!dst.ok) return dst
      const destOk = await movesInto(root, dst.value)
      if (!destOk.ok) return destOk
      const r = await moveFolderEntity(src.value, dst.value)
      if (!r.ok) return r
      await setChildOrder(dst.value, 'set_order', req.order)
      await moveIndexPaths(root, src.value, r.value.path)
      noteValueWrite(root, r.value.path)
      return ok({})
    }

    case 'reorderChildren': {
      const parent = await resolveUnderRoot(root, req.parentPath)
      if (!parent.ok) return parent
      const o = await setChildOrder(parent.value, req.key, req.order)
      if (!o.ok) return o
      return ok({})
    }

    case 'reorderTop': {
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
      const r = await setContextOnPath(
        root,
        resolved.value,
        world.value,
        req.contextId,
        req.spaceIds,
      )
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
