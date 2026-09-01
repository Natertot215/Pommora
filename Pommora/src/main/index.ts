import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  nativeTheme,
  protocol,
  shell,
  systemPreferences,
} from 'electron'
import type { OpenDialogOptions } from 'electron'
import { assetSubRoot } from '@shared/nexusPaths'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import type {
  HoverCardSize,
  NavigationState,
  NavViewModes,
  NexusState,
  NexusTree,
  SubfieldConfig,
  ThumbRect,
} from '@shared/types'
import { type DevicePrefs, packDevicePrefs } from '@shared/devicePrefs'
import { isPlainObject } from '@shared/propertyValue'
import { caught, errText, fail, ok, type Result } from '@shared/result'
import { BUSY, NO_NEXUS, push, scopeGet, scopeSet, serveBridge } from './ipc'
import type { Creator, MutateRequest, ContextTarget } from '@shared/mutate'
import { WINDOW_BG } from '@shared/theme'
import { dropLiveTree, getLiveTree, refreshAfterWrite, refreshTree } from './liveTree'
import {
  installWebGuests,
  setGuestTileZoom,
  setHostZoom,
  setWebZoomFactor,
  wheelGuest,
} from './webGuests'
import { confirmBy, confirmMutation, confirmRegistry } from './mutatePatch'
import { patchContainerFromDisk, patchSettingsFromDisk } from './watchPatch'
import { runOpenRecord } from './record'
import { indexWrittenPage, seedContentIndex } from './indexSeed'
import { readPage } from './readPage'
import {
  convertTileToPage,
  convertTileToView,
  createMarkdownTile,
  duplicateBlockTile,
  readBlockDoc,
  readMarkdownTile,
  removeBlockTile,
  writeBlockDoc,
  writeMarkdownTile,
} from './blocks'
import { isUlid } from './ids'
import {
  blockPatchProblem,
  coerceBlockHost,
  type BlockDocPatch,
  type BlockHostRef,
} from '@shared/blocks'
import { pathExists } from './IO/atomicWrite'
import { readAppConfig, updateAppConfig, addRecent, DEFAULT_TRASH_MODE } from './appConfig'
import { liveAssetMap, refreshAssetMap, takeAssetMapPush } from './assetMap'
import { migrateAssets } from './assetMigrate'
import {
  assetSubfolder,
  NOT_A_PROPERTY_DIR_MESSAGE,
  underAssetRoot,
  validPropertyDir,
} from './assetRoots'
import { assetsDir, relPosix } from './paths'
import { rootSegs } from './exclusion'
import { excludedFolderRefusal } from './readNexus'
import { sanitizeExclusions } from './exclusionInput'
import { clearConfirmCopy, clearExclusionData } from './exclusionScan'
import { ASSET_MIME, IMAGE_EXTS } from '@shared/assetMime'
import { validateAssetDir } from './assetDirValidate'
import { sessionRoot, openSession, resolveRestorePath, isExistingDir } from './session'
import { openSessionDb, closeSessionDb, sessionDb } from './sessionDb'
import { stampAdopted } from './adopt'
import { ensureIdentity } from './identity'
import { ensureContextsRegistry } from './contextsRegistry'
import {
  readNavViewModes,
  readLivePersonalization,
  readPermanentDelete,
  readSubfield,
  readWatchScope,
  writeAssetDirectory,
  writeExcludedFolders,
  writeNavViewModes,
  writePersonalization,
  writeSubfield,
} from './settings'
import { startWatcher, stopWatcher } from './watcher'
import { resolveUnderRoot } from './pathSafety'
import { updatePageBody } from './CRUD/page'
import { listBundles } from './provenance'
import { trashRows } from './CRUD/trashRows'
import { replayPendingRename } from './CRUD/contextCascade'
import { replaySchemaCascade } from './CRUD/replaySchemaCascade'
import {
  flushNavigation,
  hasPendingNavigation,
  readNavigationState,
  writeNavigationState,
} from './IO/navigationFile'
import { readTabsState, sanitizeTabSet, writeTabsState } from './IO/tabsState'
import { readValue, writeValue } from './Database/localState'
import { readPreviewsState, sanitizePreviews, writePreviewsState } from './IO/previewState'
import { captureThumbnail, evictThumbnails } from './IO/thumbnails'
import { saveView, reorderViews, deleteView } from './CRUD/views'
import { setContainerConfig, type ContainerConfigPatch } from './CRUD/containerConfig'
import { loadValues } from './CRUD/loadValues'
import {
  createProperty,
  editProperty,
  removeFromRegistry,
  reorderRegistry,
} from './CRUD/registryProperty'
import { assignProperty, assignPropertyAt, reorderAssignment } from './CRUD/assignment'
import { removeProperty } from './CRUD/removeProperty'
import { deleteProperty as deletePropertyGlobal } from './CRUD/deleteProperty'
import {
  setOptions,
  setStatusGroups,
  renameOption,
  removeOption,
  clearOption,
  renameStatusOption,
  removeStatusOption,
  clearStatusOption,
} from './CRUD/optionOps'
import type { FileConfig, LinkConfig, NumberConfig, StatusGroup } from '@shared/properties'
import type { Option } from '@shared/optionModel'
import { savedView } from '@shared/views'
import { LINK_DISPLAYS, NUMBER_FAMILIES, propertyDefinition } from '@shared/properties'
import type { PageFrontmatter } from '@shared/schemas'
import { adoptFile, handleMutate, type MutateDeps } from './mutate'
import { showContextMenu } from './contextMenu'
import { installAppMenu } from './menu'
import { popTableMenu } from './tableMenu'
import { popGripMenu } from './gripMenu'
import { popColumnMenu } from './columnMenu'
import { popCellMenu } from './cellMenu'
import { popPageActionsMenu } from './pageActionsMenu'
import { popCardMenu } from './cardMenu'
import { popCitationMenu } from './citationMenu'
import { popConnMenu } from './connMenu'
import { popTabMenu } from './tabMenu'
import type { TabMenuContext } from '@shared/tabMenu'
import { popTrashColumnMenu, popTrashMenu } from './trashMenu'
import type { TrashColumnContext, TrashMenuContext } from '@shared/trashMenu'
import { popNavRowMenu } from './navRowMenu'
import type { NavRowMenuContext } from '@shared/navRowMenu'
import { popPropertyMenu } from './propertyMenu'
import { popOptionMenu } from './optionMenu'
import { popRowMenu } from './rowMenu'
import { popIconFavoriteMenu } from './iconFavoriteMenu'
import { iconLabel } from '@shared/toggleLabels'
import { popViewButtonMenu } from './viewButtonMenu'
import { popReturningMenu } from './returningMenu'
import { popViewRowMenu } from './viewRowMenu'
import type { ViewRowAction } from '@shared/viewRowMenu'
import { popEmbedTitleMenu, popEmbedAreaMenu } from './viewEmbedMenu'
import type {
  EmbedAreaMenuAction,
  EmbedTitleMenuAction,
  ViewButtonMenuAction,
} from '@shared/viewMenus'
import type {
  BannerMenuAction,
  IconFavoriteMenuAction,
  NexusIconAction,
  TitleMenuAction,
} from '@shared/identityMenus'
import type { AssetMap, PickFileOptions, ViewButton } from '@shared/types'
import {
  EMPTY_ASSET_MAP,
  WEB_ZOOM_DEFAULT,
  coerceScale,
  coerceViewScale,
  viewScaleZoom,
} from '@shared/types'
import { installEditorContextMenu, setFormatState, setGripHot } from './editorMenu'
import type { FormatState } from '@shared/editorMenu'
import { isValidLink, normalizeLinkUrl } from '@shared/links'
import { getTitleCache, resolveTitle, type LinkTitleCache } from './linkTitles'

// Dev affordance: opt-in CDP endpoint for headless screenshots / automation. Inert unless
// POMMORA_DEBUG_PORT is set; must be appended before the app is ready.
if (process.env.POMMORA_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.POMMORA_DEBUG_PORT)
}

// app:// serves the production renderer instead of file://: a file://-loaded ES-module bundle
// is CORS-blocked (opaque origin → blank window); a standard secure scheme gives it a real
// origin instead. Must be registered before app is ready.
const RENDERER_SCHEME = 'app'
// Banner/avatar assets ride their own privileged scheme so the renderer can <img src> them
// without inlining bytes into the reloaded state tree. Also registered before app is ready.
const ASSET_SCHEME = 'nexus-asset'
protocol.registerSchemesAsPrivileged([
  { scheme: RENDERER_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  {
    scheme: ASSET_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

const RENDERER_MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

// fs.readFile is asar-aware (the bundle lives inside app.asar); the containment check
// below rejects any path escaping the bundle dir.
function registerRendererProtocol(): void {
  const rendererRoot = join(__dirname, '../renderer')
  protocol.handle(RENDERER_SCHEME, async (request) => {
    const { pathname } = new URL(request.url)
    const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname)
    const filePath = join(rendererRoot, rel)
    if (filePath !== rendererRoot && !filePath.startsWith(rendererRoot + sep)) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = await readFile(filePath)
      const type = RENDERER_MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(new Uint8Array(data), { headers: { 'Content-Type': type } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

// Read-only and confined to the open nexus's asset roots — the configured directory and
// `.nexus/assets`, which still holds the thumbnails (resolveUnderRoot realpaths + contains;
// `underAssetRoot` pins the request to one of the two).
function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    const root = sessionRoot()
    if (!root) return new Response('No nexus open', { status: 404 })
    const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    if (!underAssetRoot(rel, (await readWatchScope(root)).assetDir))
      return new Response('Forbidden', { status: 403 })
    const resolved = await resolveUnderRoot(root, rel)
    if (!resolved.ok) return new Response('Not found', { status: 404 })
    try {
      const data = await readFile(resolved.value)
      const type = ASSET_MIME[extname(resolved.value).toLowerCase()] ?? 'application/octet-stream'
      // no-store: banners change in place; never let the renderer serve a stale cached image.
      return new Response(new Uint8Array(data), {
        headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

// Rebuilds the menu (Open Recent + session-gated items) whenever the session / recents change.
let mainWindow: BrowserWindow | null = null
function refreshMenu(): void {
  if (mainWindow) void installAppMenu(mainWindow, adoptNexus)
}

// Applies personalization.defaultViewScale — the zoom it opens at and ⌘0 resets to. Called on
// every load (launch-restore + ⌘R) and on nexus switch, where no reload fires to trigger it.
async function applyDefaultZoom(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) return
  // Empty state (no nexus) normalizes to 1.0 — the same value ⌘0 asserts there — so the welcome
  // screen never inherits a prior nexus's host zoom (Electron zoom is per-render-host, shared).
  const root = sessionRoot()
  // Both factors off one read — the guests' own scale rides the same points the window's does:
  // launch, reload, and nexus switch.
  const p = root ? await readLivePersonalization(root) : null
  setWebZoomFactor(coerceScale(p?.webZoomFactor, WEB_ZOOM_DEFAULT))
  if (!win.isDestroyed())
    setHostZoom(win.webContents, viewScaleZoom(coerceViewScale(p?.defaultViewScale)))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 832,
    show: false,
    // Native frame kept (macOS draws the corner radius + shadow) but the title bar hidden,
    // traffic lights repositioned into the sidebar. Opaque so the sidebar glass samples the window.
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: WINDOW_BG, // single source (@shared/theme) — also drives the background.window token + --bg-window
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // CommonJS preload → sandbox can stay ON, plus contextIsolation on + nodeIntegration
      // off; the preload exposes only the narrow nexus read API.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Guest webviews for the web-embed surfaces — every attach is validated and re-homed onto
      // the shared partition by installWebGuests; nothing else about the window loosens.
      webviewTag: true,
    },
  })

  // Applied before first paint so the window opens at scale instead of flashing 100% → scale;
  // finally() guarantees show() even if the (error-swallowing) read stalls.
  win.on('ready-to-show', () => void applyDefaultZoom(win).finally(() => win.show()))
  installEditorContextMenu(win)
  installWebGuests(win)
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // Open (and reload) at the nexus's default view scale — the session root is set before the window
  // is created on launch-restore, so it's known by the time the page finishes loading.
  win.webContents.on('did-finish-load', () => void applyDefaultZoom(win))

  // Deny-by-default navigation hardening (cheap, ahead of user-Markdown links).
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  // electron-vite injects ELECTRON_RENDERER_URL in dev; in production load the
  // bundle over the app:// scheme (see registerRendererProtocol).
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadURL(`${RENDERER_SCHEME}://bundle/index.html`)
  }
}

// Gallery thumbnails — capture the content-view rect on entity-open, evict on membership roll-off.
const isRect = (v: unknown): v is ThumbRect =>
  isPlainObject(v) && ['x', 'y', 'width', 'height'].every((k) => typeof v[k] === 'number')

const isCardSize = (v: unknown): v is HoverCardSize =>
  isPlainObject(v) && ['w', 'h'].every((k) => typeof v[k] === 'number' && Number.isFinite(v[k]))

// Shared by every path that opens a nexus, run after openSession and before anything reads it:
// ensures `.nexus/nexus.json` exists so sidecar mode has an identity, then stamps any un-adopted
// entity with a real ULID so every later write gets a stable id instead of a transient
// `adopted-` placeholder. Best-effort: never blocks opening the folder.
async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  try {
    await stampAdopted(path)
  } catch (e) {
    console.error('Adopt/stamp pass failed:', e)
  }
}

// Nexus adoption in flight — renderer-initiated sidecar saves are dropped for the window where the
// session root swaps, so a mid-adopt save can't land in the NEW nexus's synced sidecars (the drop
// path is non-modal, so the renderer stays interactive through the adopt). The outgoing state was
// drained at adopt start; the post-adopt load re-seeds and re-persists.
// A COUNT, not a flag: the open path runs more than one pass, and a boolean lets whichever
// finishes first clear the suppression the other is still relying on.
let adoptingDepth = 0
const adopting = (): boolean => adoptingDepth > 0

// Open a chosen nexus folder: make it the session, persist it as last-opened, and
// push it onto the recents (deduped, capped) + the OS Recent Documents list.
// `latchRecord: false` is the mid-session re-point's opt-out: only a GENUINE open latches the
// record baseline — a re-point that latched would diff the live session against the launch
// baseline, reporting every in-session change as drift and overwriting the closed-window record.
async function adoptNexus(path: string, latchRecord = true): Promise<void> {
  adoptingDepth++
  try {
    await adoptNexusInner(path, latchRecord)
  } finally {
    adoptingDepth--
  }
}

// The one open sequence — a user adopt and the launch restore both run it. Returns the
// canonical root.
async function openNexusSequence(path: string, latchRecord: boolean): Promise<string> {
  // Re-adopting the already-open nexus (Open Recent's head, a re-pick in the picker) is a
  // re-point of a live session, not a genuine open — the latch below compares roots and
  // stands down, or every in-session change would diff against the launch baseline as drift.
  const priorRoot = sessionRoot()
  await openSession(path)
  // openSession canonicalized the root (realpath); thread THAT everywhere below so the watcher's
  // session-match guard and the persistence layer key off the same string — a raw path here
  // would make the watcher treat every event as a session switch.
  const root = sessionRoot() ?? path
  await prepareOpenedNexus(root)
  // Forward-completes a crashed rename, BEFORE anything reads contexts.
  await replayPendingRename(root)
  // Best-effort: a null handle costs the session its persisted chrome, never its content.
  openSessionDb(root)
  // The record's one explicit walk — BEFORE the watcher starts, so the baseline latches what
  // the closed window left rather than whatever a sync daemon materializes first. Every root
  // switch drops and reseeds the live tree, latch or no latch — a re-point (nexus rename)
  // skips the record but must not keep serving the dead root's tree.
  if (root !== priorRoot) {
    dropLiveTree()
    if (latchRecord) {
      await runOpenRecord(root)
    } else {
      try {
        await refreshTree(root)
      } catch (e) {
        console.error('adopt: the seed walk failed; reads will retry:', errText(e))
      }
    }
    // Unconditional on every root switch, latch or no latch — a nexus rename that skipped this
    // would leave relative rows valid but the reconcile owed, and the cascades querying stale.
    await seedContentIndex(root)
    // Post-seed on purpose (warm index, warm tree — nothing it heals is read during open the
    // way contexts are); a same-root re-adopt correctly skips it, since a live session's record
    // belongs to an op still on the schema chain, which the replay would only queue behind.
    await replaySchemaCascade(root)
    // A reference still naming `.nexus/assets` under a CONFIGURED directory is one the user has
    // already asked to move. The gate is one readdir of a folder that ends empty, so the ordinary
    // open pays a listing and nothing else — and a pass that moved something re-walks, or the
    // session serves banner values naming files it just trashed.
    if (await runAssetMigration(root)) {
      try {
        await refreshTree(root)
      } catch (e) {
        console.error('adopt: the post-migration walk failed; reads will retry:', errText(e))
      }
    }
  }
  return root
}

/** The one caller shape the migration has, wherever it is asked from. Its own writes are echo-
 *  suppressed, so what it moved reaches the renderer through the map it refreshed, not the
 *  watcher. A failure is reported and never blocks the open — the references it did not move
 *  still name real files under `.nexus/assets`, which the protocol still serves. */
async function runAssetMigration(root: string): Promise<boolean> {
  try {
    const report = await migrateAssets(root)
    if (!report) return false
    const skipped = report.skipped.map((s) => `${s.store} (${s.why})`).join(', ')
    console.log(
      `assets: migrated ${report.moved.length} file(s) into the configured directory, ` +
        `${report.rewritten} reference(s) rewritten, ${report.trashed} swept to the trash` +
        (skipped ? `; skipped ${skipped}, so .nexus/assets is left alone` : ''),
    )
    return report.rewritten > 0
  } catch (e) {
    console.error('assets: the migration failed; references are unchanged:', errText(e))
  }
  return false
}

async function adoptNexusInner(path: string, latchRecord: boolean): Promise<void> {
  const root = await openNexusSequence(path, latchRecord)
  // A user-initiated open always has a window; launch-restore starts its watcher after
  // createWindow below instead.
  if (mainWindow) void startWatcher(root, mainWindow)
  // Switching nexus doesn't reload the renderer, so apply the new default scale here —
  // the launch-restore path gets it via did-finish-load instead.
  if (mainWindow) void applyDefaultZoom(mainWindow)
  // Best-effort: a config-write failure must not block opening the folder this session,
  // nor leave a half-open "ghost" session the renderer never re-reads.
  try {
    // Persist the RAW user-facing path, not the canonical `root`: a nexus under an iCloud-synced
    // ~/Documents realpaths into the Mobile Documents container, which reads as gibberish in Open
    // Recent AND breaks restore if the user later turns iCloud Desktop & Documents off (the
    // container path disappears; ~/Documents/MyNexus survives). Canonical stays on the in-process
    // locks only; what we save and reveal to the user stays the path they picked.
    await updateAppConfig(app.getPath('userData'), (cur) => ({
      lastNexusPath: path,
      recents: addRecent(cur.recents ?? [], path),
    }))
    app.addRecentDocument(path)
  } catch (e) {
    console.error('Could not persist recents / last-opened:', e)
  }
  refreshMenu()
}

// The keyed operational stores — one row per (scope, key) in nexus.db. Per-machine editor and view
// chrome, kept out of the portable `.md` and out of the synced container sidecars.
const isString = (v: unknown): v is string => typeof v === 'string'
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
const isHeightMap = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every((h) => typeof h === 'number' && Number.isFinite(h) && h > 0)
const isIndexArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0)

// View persistence — save / reorder / delete a SavedView in a container's synced `views[]` sidecar.
// (View SELECTION is the per-machine activeViews pointer above; this is the view DEFINITION.)
type ResolvedViewContainer = Result<{ folder: string; kind: 'collection' | 'set' }>
// The write channels' confirmation push — one place, so a confirmed write that moved the tree
// reaches the renderer over the same channel the watcher uses.
function pushConfirmed(tree: NexusTree | null): void {
  if (!tree) return
  // The send is deferred one macrotask so the invoke's own reply always reaches the renderer
  // FIRST: its continuation captures the pre-push tree, mounts an optimistic create in the
  // same commit as its callback state, and the confirming push reconciles a beat later.
  // Deferrals are FIFO, so consecutive confirms still arrive in completion order.
  setImmediate(() => {
    if (mainWindow && !mainWindow.isDestroyed()) push(mainWindow, 'nexus:changed', tree)
  })
}

/** Run one channel's confirmer against the session root and push what it moved. */
async function confirmWrite(work: (root: string) => Promise<NexusTree | null>): Promise<void> {
  const root = sessionRoot()
  if (root !== null) pushConfirmed(await work(root))
}

async function confirmContainerWrite(containerPath: unknown): Promise<void> {
  if (typeof containerPath !== 'string') return
  await confirmWrite((root) => confirmBy(root, () => patchContainerFromDisk(root, containerPath)))
}

/** `containerPath` names the one Collection whose assignment list the write also moved; a bare
 *  call is a registry-only def edit, which the confirmer patches without opening a sidecar. */
const confirmRegistryWrite = (containerPath?: string): Promise<void> =>
  confirmWrite((root) => confirmRegistry(root, containerPath))

const confirmSettingsWrite = (): Promise<void> =>
  confirmWrite((root) => confirmBy(root, () => patchSettingsFromDisk(root)))

async function resolveViewContainer(
  containerPath: unknown,
  kind: unknown,
): Promise<ResolvedViewContainer> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  if (kind !== 'collection' && kind !== 'set')
    return fail('operation-failed', 'kind must be "collection" or "set".')
  const resolved = await resolveUnderRoot(root, containerPath)
  if (!resolved.ok) return resolved
  return ok({ folder: resolved.value, kind })
}

// Registry+assignment-backed: defs live nexus-wide in `.nexus/properties.json`; a Collection's
// sidecar holds the assigned prop-ids. Keeps its pre-V2 names/args so the renderer is untouched —
// add = create-in-registry + assign, rename = global def edit, delete = Remove (strip
// values + cache restorably on the sidecar; the word Delete means property:delete only), reorder =
// assignment-order move, assign = append + restore-from-cache. containerPath is the schema-owning
// Collection's folder — a Set inherits the schema, so the renderer passes the ancestor's path.
async function resolveSchemaFolder(
  containerPath: unknown,
): Promise<Result<{ root: string; folder: string; rel: string }>> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  const resolved = await resolveUnderRoot(root, containerPath)
  return resolved.ok ? ok({ root, folder: resolved.value, rel: containerPath }) : resolved
}

// The bad-payload refusals more than one handler speaks — one spelling each, alongside the
// session refusals (NO_NEXUS / BUSY) the ipc module owns.
const NEEDS_PROPERTY_ID = fail('operation-failed', 'A property id is required.')
const NEEDS_ID_AND_VALUE = fail('operation-failed', 'A property id and value are required.')
const NOT_A_PROPERTY_DIR = fail('invalid-path', NOT_A_PROPERTY_DIR_MESSAGE)
const NEEDS_CONFIG_PATCH = fail('operation-failed', 'A config patch is required.')

// The three shapes the no-container property channels share. Each states the ceremony once —
// refuse without a session, refuse a malformed payload, write, confirm the registry when it
// landed — so the channels below name only what they actually do differently.

/** `(propertyId, value)`: clear or remove one option, on either the select or the status family. */
const optionValueOp = (
  write: (root: string, propertyId: string, value: string) => Promise<Result<null>>,
) => ({
  kind: 'envelope' as const,
  fn: async (propertyId: unknown, value: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
    const r = await write(root, propertyId, value)
    if (r.ok) await confirmRegistryWrite()
    return r
  },
})

/** `(propertyId, oldValue, newTitle)`: retitle one option, on either family. */
const optionRenameOp = (
  write: (
    root: string,
    propertyId: string,
    oldValue: string,
    newTitle: string,
  ) => Promise<Result<null>>,
) => ({
  kind: 'envelope' as const,
  fn: async (propertyId: unknown, oldValue: unknown, newTitle: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (
      typeof propertyId !== 'string' ||
      typeof oldValue !== 'string' ||
      typeof newTitle !== 'string'
    ) {
      return fail('operation-failed', 'propertyId, oldValue, and newTitle are required.')
    }
    const r = await write(root, propertyId, oldValue, newTitle)
    if (r.ok) await confirmRegistryWrite()
    return r
  },
})

/** Exactly what the registry's own editor accepts — never re-derived here. */
type DefChanges = Parameters<typeof editProperty>[2]

/** A registry-only def edit. The narrower is what keeps a display-config write from patching
 *  arbitrary def fields (type, options, id) through this door; `null` from it refuses the
 *  payload. Registry-only by construction: none of these touch page values. */
const defEditOp = (
  narrow: (payload: unknown) => DefChanges | null,
  // A refusal the narrower can't reach, because it needs the nexus: the narrower is sync by
  // convention, while `fn` is already async and already holds `root`.
  check?: (root: string, changes: DefChanges) => Promise<Result<null>>,
) => ({
  kind: 'envelope' as const,
  fn: async (propertyId: unknown, payload: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const changes = narrow(payload)
    if (changes === null) return NEEDS_CONFIG_PATCH
    if (check) {
      const verdict = await check(root, changes)
      if (!verdict.ok) return verdict
    }
    const r = await editProperty(root, propertyId, changes)
    if (r.ok) await confirmRegistryWrite()
    return r
  },
})

/** An `in` check rather than a truthiness one, so a caller can clear a field by passing
 *  undefined — absent means "leave it", present-and-undefined means "back to the default". */
const asPatch = (payload: unknown): Record<string, unknown> | null =>
  payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : null

const narrowLinkConfig = (payload: unknown): LinkConfig | null => {
  const p = asPatch(payload)
  if (!p) return null
  const changes: LinkConfig = {}
  if (typeof p.link_underline === 'boolean') changes.link_underline = p.link_underline
  const display = LINK_DISPLAYS.find((d) => d === p.link_display)
  if (display) changes.link_display = display
  if ('link_color' in p)
    changes.link_color = typeof p.link_color === 'string' ? p.link_color : undefined
  return changes
}

/** Where a file property's uploads land. Stored relative to the asset ROOT, so the spelling is
 *  normalized here — trimmed, slash-padding dropped — and an empty result means the root itself,
 *  which is the absence of the field rather than a stored empty string. */
const narrowFileConfig = (payload: unknown): FileConfig | null => {
  const p = asPatch(payload)
  if (!p || !('file_directory' in p)) return null
  const raw = typeof p.file_directory === 'string' ? p.file_directory : ''
  const dir = rootSegs(raw.trim()).join('/')
  return { file_directory: dir || undefined }
}

const narrowNumberFormat = (payload: unknown): NumberConfig | null => {
  const p = asPatch(payload)
  if (!p) return null
  const changes: NumberConfig = {}
  if ('number_family' in p)
    changes.number_family = NUMBER_FAMILIES.find((f) => f === p.number_family)
  if ('number_currency' in p)
    changes.number_currency = typeof p.number_currency === 'string' ? p.number_currency : undefined
  if ('number_separators' in p)
    changes.number_separators =
      typeof p.number_separators === 'boolean' ? p.number_separators : undefined
  if ('number_decimals' in p)
    changes.number_decimals =
      p.number_decimals === 'hidden' || typeof p.number_decimals === 'number'
        ? p.number_decimals
        : undefined
  if ('number_fraction' in p)
    changes.number_fraction = typeof p.number_fraction === 'boolean' ? p.number_fraction : undefined
  if ('number_denominator' in p)
    changes.number_denominator =
      typeof p.number_denominator === 'number' ? p.number_denominator : undefined
  return changes
}

// Registry-level option edits, cascading to pages. No-container-scope siblings of
// property:delete; the confirm dialog for remove/clear lives in the option menu, not here.
function isOptionArray(v: unknown): v is Option[] {
  return (
    Array.isArray(v) &&
    v.every(
      (o) =>
        o !== null &&
        typeof o === 'object' &&
        typeof (o as Record<string, unknown>).value === 'string' &&
        typeof (o as Record<string, unknown>).label === 'string',
    )
  )
}

// Markdown-block file ops. Tile ids gate on isUlid — the id becomes a filename, so a
// renderer-supplied value must never carry path segments.
const blockHostAnd = (
  host: unknown,
  tileId?: unknown,
): Result<{ root: string; h: BlockHostRef }> => {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  const h = coerceBlockHost(host)
  if (!h) return fail('not-found', 'Unknown block host.')
  if (tileId !== undefined && (typeof tileId !== 'string' || !isUlid(tileId)))
    return fail('not-found', 'Invalid tile id.')
  return ok({ root, h })
}

// The Electron-side bits the write orchestration needs: trashMode from app config +
// system-trash injected. Shared by the mutate IPC + the native context menu.
async function mutateDeps(): Promise<MutateDeps> {
  const config = await readAppConfig(app.getPath('userData'))
  const root = sessionRoot()
  return {
    trashMode: config.trashMode ?? DEFAULT_TRASH_MODE,
    trashToSystem: (p) => shell.trashItem(p),
    permanentDelete: root === null ? false : await readPermanentDelete(root),
  }
}

// What the dialog has handed the renderer this session. A picked file sits outside the nexus, so
// the channel that adopts one cannot be bounded by the root — it is bounded by the pick instead,
// and the renderer never names a path main did not choose.
const pickedPaths = new Set<string>()
async function pickFilePath(win: BrowserWindow, opts?: PickFileOptions): Promise<string | null> {
  const root = sessionRoot()
  // The renderer holds nexus-relative paths only, so the folder to open at is joined here. It
  // merely steers the dialog — a folder that has gone missing opens at the root instead.
  const at = root && opts?.dir ? await resolveUnderRoot(root, opts.dir) : null
  const defaultPath = at?.ok ? at.value : (root ?? undefined)
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    ...(defaultPath ? { defaultPath } : {}),
    ...(opts?.any ? {} : { filters: [{ name: 'Images', extensions: IMAGE_EXTS }] }),
  })
  const picked = result.canceled ? null : (result.filePaths[0] ?? null)
  if (picked) pickedPaths.add(picked)
  return picked
}

// A pasted image is read from the OS clipboard here (no bytes cross the bridge) and written to a
// temp PNG the caller adopts like any picked file — so paste rides the same source-adopt path.
async function pasteImagePath(): Promise<string | null> {
  const image = clipboard.readImage()
  if (image.isEmpty()) return null
  const path = join(tmpdir(), `pommora-paste-${Date.now()}.png`)
  await writeFile(path, image.toPNG())
  pickedPaths.add(path)
  return path
}

/** An asset a mutation adopted never reaches the watcher — `atomicWriteBinary` records its own
 *  write and the echo is dropped — so the write's own channel is what tells the renderer. */
function pushAssetWrites(): void {
  const root = sessionRoot()
  if (root === null || !mainWindow || mainWindow.isDestroyed()) return
  const moved = takeAssetMapPush(root)
  if (moved) push(mainWindow, 'assets:changed', moved)
}

serveBridge(
  {
    // The renderer's launch + post-change read. Empty status is not an error — just no nexus open.
    'nexus:state': {
      kind: 'raw',
      fn: async (): Promise<NexusState> => {
        const root = sessionRoot()
        if (root === null) return { status: 'empty' }
        try {
          const tree = getLiveTree() ?? (await refreshTree(root))
          return { status: 'open', tree }
        } catch (e) {
          return { status: 'error', error: caught(e) }
        }
      },
    },

    // The asset root's listing. Built on first ask and held; the watcher patches it in place,
    // so an image a sync delivers costs a listing exactly once.
    'assets:map': {
      kind: 'raw',
      fn: async (): Promise<AssetMap> => {
        const root = sessionRoot()
        return root === null ? EMPTY_ASSET_MAP : liveAssetMap(root)
      },
    },

    // Navigation intent — one contract over two stores (navigationFile routes each key). The
    // renderer owns the arrays; main persists. Writes are refused mid-adopt so a gesture on the old
    // nexus's still-open UI can't land in the new one.
    'nav:read': {
      kind: 'envelope',
      fn: async () => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        return ok(await readNavigationState(root))
      },
    },

    'nav:write': {
      kind: 'envelope',
      fn: async (patch: unknown) => {
        if (adopting()) return BUSY
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (!isPlainObject(patch))
          return fail('operation-failed', 'Navigation patch must be an object.')
        await writeNavigationState(root, patch as Partial<NavigationState>)
        return ok(null)
      },
    },

    // Ordered unpinned tabs + the active pointer + per-tab history targets, as one row in nexus.db.
    'tabs:load': {
      kind: 'envelope',
      fn: () => {
        if (sessionRoot() === null) return NO_NEXUS
        return ok(readTabsState())
      },
    },

    'tabs:save': {
      kind: 'envelope',
      fn: (set: unknown) => {
        if (adopting()) return BUSY
        const clean = sanitizeTabSet(set)
        if (!clean) return fail('operation-failed', 'Bad tab set.')
        if (!writeTabsState(clean)) return NO_NEXUS
        return ok(null)
      },
    },

    // The NavWindow set, the per-origin page sets, and the open pointer, as one row in nexus.db.
    'previews:load': {
      kind: 'envelope',
      fn: () => {
        if (sessionRoot() === null) return NO_NEXUS
        return ok(readPreviewsState())
      },
    },

    'previews:save': {
      kind: 'envelope',
      fn: (file: unknown) => {
        if (adopting()) return BUSY
        const clean = sanitizePreviews(file)
        if (!clean) return fail('operation-failed', 'Bad previews file.')
        if (!writePreviewsState(clean)) return NO_NEXUS
        return ok(null)
      },
    },

    // The hover card's universal size — one device-local row, validated at the boundary.
    'hoverCard:load': {
      kind: 'envelope',
      fn: () => {
        if (sessionRoot() === null) return NO_NEXUS
        return ok(readValue<HoverCardSize>('hoverCard'))
      },
    },

    'hoverCard:save': {
      kind: 'envelope',
      fn: (size: unknown) => {
        if (adopting()) return BUSY
        if (!isCardSize(size)) return fail('operation-failed', 'A card size needs finite w and h.')
        if (!writeValue('hoverCard', { w: size.w, h: size.h })) return NO_NEXUS
        return ok(null)
      },
    },

    // Device-local preferences — how this machine draws the Nexus, never the Nexus itself.
    'devicePrefs:load': {
      kind: 'envelope',
      fn: () => {
        if (sessionRoot() === null) return NO_NEXUS
        return ok(readValue<DevicePrefs>('devicePrefs'))
      },
    },

    'devicePrefs:save': {
      kind: 'envelope',
      fn: (prefs: unknown) => {
        if (adopting()) return BUSY
        if (!writeValue('devicePrefs', packDevicePrefs(prefs))) return NO_NEXUS
        return ok(null)
      },
    },

    'capture:thumbnail': {
      kind: 'window',
      fn: async (
        win: BrowserWindow | null,
        navKey: unknown,
        rect: unknown,
        scaleFactor: unknown,
      ) => {
        try {
          const root = sessionRoot()
          if (root === null) return NO_NEXUS
          if (
            !win ||
            typeof navKey !== 'string' ||
            !isRect(rect) ||
            typeof scaleFactor !== 'number'
          )
            return fail('operation-failed', 'Bad capture args.')
          const url = await captureThumbnail(win, root, navKey, rect, scaleFactor)
          return url ? ok({ url }) : fail('operation-failed', 'Capture produced no image.')
        } catch (err) {
          return fail('operation-failed', errText(err))
        }
      },
    },

    // The typed half of the Default Asset Directory row. It crosses the same validator the dialog's
    // pick does, so a hand-typed path and a chosen one are refused for identical reasons.
    'assets:setDir': {
      kind: 'envelope',
      fn: async (dir: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof dir !== 'string') return fail('operation-failed', 'A folder path is required.')
        const trimmed = dir.trim()
        let next = ''
        if (trimmed) {
          const valid = await validateAssetDir(root, resolve(root, trimmed))
          if (!valid.ok) return valid
          next = valid.value
        }
        await writeAssetDirectory(root, next)
        // Everything an EXTERNAL edit of this key gets from settle, which this write cannot
        // reach: `recordWrite` suppresses its own echo, and the settings confirmer patches
        // leaves without ever asking the scope comparison that would call this structural.
        // The folder just left the tree and the corpus, so the walk and the index owe a pass,
        // the map owes a fresh listing, and the watcher owes a re-arm against the new scope.
        await confirmSettingsWrite()
        // Setting the directory is the moment the migration becomes applicable, and it runs
        // BEFORE the walk: the banner values it rewrites are what the pushed tree carries.
        await runAssetMigration(root)
        const tree = await refreshAfterWrite(root)
        await seedContentIndex(root)
        const assets = await refreshAssetMap(root)
        if (mainWindow && !mainWindow.isDestroyed()) {
          push(mainWindow, 'nexus:changed', tree)
          push(mainWindow, 'assets:changed', assets)
          await startWatcher(root, mainWindow)
        }
        return ok(next)
      },
    },

    // The whole exclusion list, written at once. Each entry crosses the same refusal a hand-edited
    // settings.json meets; duplicates collapse on the case-folded path the matcher compares, so
    // `archive` and `Archive` are one folder while the spelling the user typed is what's stored.
    'exclusions:set': {
      kind: 'envelope',
      fn: async (folders: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        const sanitized = sanitizeExclusions(folders)
        if (!sanitized.ok) return sanitized
        const next = sanitized.value
        await writeExcludedFolders(root, next)
        // The re-arm an external edit would get from settle, which this write cannot reach:
        // recordWrite suppresses its own echo and the settings confirmer never asks the scope
        // comparison. The folders just left (or rejoined) the tree and corpus, so the walk, the
        // index and the watcher each owe a pass against the new scope.
        await confirmSettingsWrite()
        const tree = await refreshAfterWrite(root)
        await seedContentIndex(root)
        if (mainWindow && !mainWindow.isDestroyed()) {
          push(mainWindow, 'nexus:changed', tree)
          await startWatcher(root, mainWindow)
        }
        return ok(next)
      },
    },

    // A sheet on the calling window that adopts nothing — it answers the folder's nexus-relative
    // path and leaves the write to the row that asked. A pick outside the nexus fails the same
    // refusal a typed path does.
    'exclusions:choose': {
      kind: 'window',
      fn: async (win: BrowserWindow | null) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        const opts = {
          properties: ['openDirectory'],
          defaultPath: root,
          message: 'Choose a folder to exclude',
        } satisfies OpenDialogOptions
        try {
          const result = win
            ? await dialog.showOpenDialog(win, opts)
            : await dialog.showOpenDialog(opts)
          const [chosen] = result.filePaths
          if (result.canceled || !chosen) return ok(null)
          const raw = relPosix(root, chosen)
          const refusal = excludedFolderRefusal(raw)
          return refusal ? fail('invalid-path', refusal) : ok(rootSegs(raw).join('/'))
        } catch (e) {
          return fail('operation-failed', errText(e))
        }
      },
    },

    // Re-seed after a confirmed clear: the sweep re-indexes every page it rewrites and the watcher
    // never corrects an excluded folder, so the cleared pages would otherwise linger in the index.
    'exclusions:clear': {
      // A `window` handler has no envelope net, so this wraps its own throws — the destructive
      // filesystem work must never reject across the boundary.
      kind: 'window',
      fn: async (win: BrowserWindow | null) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        try {
          const { excluded, assetDir } = await readWatchScope(root)
          if (excluded.length === 0 || !win) return ok(null)
          const preserve = (await readLivePersonalization(root)).preservePropertiesOnClear !== false
          const { response } = await dialog.showMessageBox(win, {
            type: 'warning',
            buttons: ['Clear', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            ...clearConfirmCopy(excluded.length, preserve),
          })
          if (response !== 0) return ok(null)
          const result = await clearExclusionData(root, excluded, assetDir, preserve)
          if (!result.ok) return result
          await seedContentIndex(root)
          return ok(result.value)
        } catch (e) {
          return fail('operation-failed', errText(e))
        }
      },
    },

    'nav:evictThumbs': {
      kind: 'envelope',
      fn: async (liveKeys: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (!Array.isArray(liveKeys)) return fail('operation-failed', 'Live keys must be an array.')
        await evictThumbnails(
          root,
          liveKeys.filter((k): k is string => typeof k === 'string'),
        )
        return ok(null)
      },
    },

    // A sheet on the calling window. Unlike `nexus:choose` this adopts nothing — it answers the
    // folder's nexus-relative path and leaves the write to the row that asked.
    // `scope` rather than a sibling channel: the two differ by a starting folder, a message and a
    // validator, which is an argument's worth against a twin's bridge entry, binding and dialog.
    // A property's answer is relative to the ASSET root; the nexus's is relative to the nexus.
    'assets:chooseDir': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, scope?: 'nexus' | 'property', at?: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        const forProperty = scope === 'property'
        const { assetDir } = await readWatchScope(root)
        // Open where the property already points, so re-choosing starts from what it is rather
        // than from the root every time. `at` is asset-root-relative, like the field that stores
        // it; a folder that has gone missing steers nowhere and the root answers instead.
        const from =
          forProperty && typeof at === 'string' && validPropertyDir(at, assetDir)
            ? await resolveUnderRoot(root, assetSubRoot(assetDir, at))
            : null
        const opts = {
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: forProperty ? (from?.ok ? from.value : assetsDir(root, assetDir)) : root,
          message: forProperty
            ? 'Choose a folder for this property’s files'
            : 'Choose a folder for assets',
        } satisfies OpenDialogOptions
        // A `window` handler has no envelope net of its own.
        try {
          const result = win
            ? await dialog.showOpenDialog(win, opts)
            : await dialog.showOpenDialog(opts)
          const [chosen] = result.filePaths
          if (result.canceled || !chosen) return ok(null)
          if (!forProperty) return validateAssetDir(root, chosen)
          // Containment BEFORE the subtraction: a folder outside the asset root would otherwise
          // have its leading segments sliced off and be re-read as a plausible subfolder of it.
          const below = assetSubfolder(relPosix(root, chosen), assetDir)
          return below !== null && validPropertyDir(below, assetDir)
            ? ok(below)
            : NOT_A_PROPERTY_DIR
        } catch (e) {
          return fail('operation-failed', errText(e))
        }
      },
    },

    // A sheet on the calling window; on success the renderer re-reads nexus:state.
    'nexus:choose': {
      kind: 'window',
      fn: async (win: BrowserWindow | null) => {
        const opts = {
          properties: ['openDirectory', 'createDirectory'],
          message: 'Choose a nexus folder',
        } satisfies OpenDialogOptions
        try {
          const result = win
            ? await dialog.showOpenDialog(win, opts)
            : await dialog.showOpenDialog(opts)
          if (result.canceled) return ok(false)
          const [chosen] = result.filePaths
          if (!chosen) return ok(false)
          await adoptNexus(chosen)
          return ok(true)
        } catch (e) {
          return fail('operation-failed', errText(e))
        }
      },
    },

    // The preload resolves the dropped File to an absolute path (webUtils) and sends it here —
    // the one place a renderer-origin path enters. Accepted only if it's an existing directory.
    'nexus:openPath': {
      kind: 'envelope',
      fn: async (p: unknown) => {
        if (typeof p !== 'string' || p.length === 0) return ok(false)
        if (!(await isExistingDir(p))) return ok(false)
        await adoptNexus(p)
        return ok(true)
      },
    },

    // resolveUnderRoot canonicalizes the renderer's nexus-relative path under the open nexus root
    // and rejects anything that escapes (traversal, absolute, or an in-nexus symlink pointing out).
    'page:open': {
      kind: 'envelope',
      fn: async (relPath: unknown) => {
        const root = sessionRoot()
        if (root === null) {
          return NO_NEXUS
        }
        if (typeof relPath !== 'string') {
          return fail('operation-failed', 'A page path is required.')
        }
        const resolved = await resolveUnderRoot(root, relPath)
        if (!resolved.ok) {
          return resolved
        }
        // resolveUnderRoot is the guard; readPage re-joins root + relPath and keeps the
        // relative path as the page's identity (PageDetail.path), so pass relPath, not
        // the canonical absolute (which would leak an abs path + mis-key the detail).
        const page = await readPage(root, relPath)
        return ok(page)
      },
    },

    // Reconstructs the file via updatePageBody (frontmatter-preserving) + atomic write.
    // Structurally distinct from the one-shot `mutate` ops, so it gets its own channel.
    'page:updateBody': {
      kind: 'envelope',
      fn: async (relPath: unknown, body: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof relPath !== 'string') return fail('operation-failed', 'A page path is required.')
        if (typeof body !== 'string') return fail('operation-failed', 'A body string is required.')
        const resolved = await resolveUnderRoot(root, relPath)
        if (!resolved.ok) return resolved
        const r = await updatePageBody(resolved.value, body)
        if (r.ok) await indexWrittenPage(root, resolved.value)
        return r.ok ? ok(null) : r
      },
    },

    'folds:get': { kind: 'raw', fn: scopeGet<string[]>('folds') },
    'folds:set': {
      kind: 'envelope',
      fn: scopeSet('folds', isStringArray, 'Fold keys must be a string array.'),
    },
    'embedHeights:get': { kind: 'raw', fn: scopeGet<Record<string, number>>('embedHeights') },
    'embedHeights:set': {
      kind: 'envelope',
      fn: scopeSet('embedHeights', isHeightMap, 'Embed heights must map ids to positive numbers.'),
    },
    'embedZooms:get': { kind: 'raw', fn: scopeGet<Record<string, number>>('embedZooms') },
    'embedZooms:set': {
      kind: 'envelope',
      fn: scopeSet('embedZooms', isHeightMap, 'Embed scales must map ids to positive numbers.'),
    },
    'webGuestZoom:set': {
      kind: 'envelope',
      fn: (guestId: number, factor: number) => {
        setGuestTileZoom(guestId, factor)
        return ok(null)
      },
    },
    'activeViews:get': { kind: 'raw', fn: scopeGet<string>('activeView') },
    'activeViews:set': {
      kind: 'envelope',
      fn: scopeSet('activeView', isString, 'A view id is required.'),
    },
    'viewOrders:get': { kind: 'raw', fn: scopeGet<string[]>('viewOrder') },
    'viewOrders:set': {
      kind: 'envelope',
      fn: scopeSet('viewOrder', isStringArray, 'An order of page ids is required.'),
    },
    'tableHeadingCols:get': { kind: 'raw', fn: scopeGet<number[]>('headingCols') },
    'tableHeadingCols:set': {
      kind: 'envelope',
      fn: scopeSet(
        'headingCols',
        isIndexArray,
        'Table indices must be a non-negative-integer array.',
      ),
    },
    // Whether a page's heading icon is hidden. The icon itself is on-page in frontmatter; only
    // whether the header draws it is chrome, so it keys by PageID here like folds and heading
    // columns rather than writing a display toggle into the user's own file.
    'headingIcon:get': { kind: 'raw', fn: scopeGet<boolean>('headingIcon') },
    'headingIcon:set': {
      kind: 'envelope',
      fn: scopeSet(
        'headingIcon',
        (v: unknown): v is boolean => typeof v === 'boolean',
        'Hidden must be a boolean.',
      ),
    },
    // Whether a page shows its footnotes section. A row exists only where someone overrode the
    // nexus-wide default, so a null clears it and the default reaches the page again.
    'citations:get': { kind: 'raw', fn: scopeGet<boolean>('citations') },
    'citations:set': {
      kind: 'envelope',
      fn: scopeSet(
        'citations',
        (v: unknown): v is boolean | null => typeof v === 'boolean' || v === null,
        'Shown must be a boolean.',
      ),
    },
    // The aliases a page has been given. The alias itself lives on-page in universal syntax; this
    // is an accelerator for offering one back, so losing it costs a suggestion and never a link.
    'aliases:get': { kind: 'raw', fn: scopeGet<string[]>('aliases') },
    'aliases:set': {
      kind: 'envelope',
      fn: scopeSet('aliases', isStringArray, 'Aliases must be a string array.'),
    },

    'views:save': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, view: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        const parsed = savedView.safeParse(view)
        if (!parsed.success) return fail('operation-failed', 'Invalid view payload.')
        const { folder, kind: k } = c.value
        const r = await saveView(folder, k, parsed.data)
        if (r.ok) await confirmContainerWrite(containerPath)
        return r.ok ? ok({ id: r.value.id }) : r
      },
    },
    'views:reorder': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, orderedIds: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        if (!Array.isArray(orderedIds) || !orderedIds.every((x) => typeof x === 'string')) {
          return fail('operation-failed', 'orderedIds must be a string array.')
        }
        const { folder, kind: k } = c.value
        const r = await reorderViews(folder, k, orderedIds)
        if (r.ok) await confirmContainerWrite(containerPath)
        return r.ok ? ok(null) : r
      },
    },
    'views:delete': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, viewId: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        if (typeof viewId !== 'string') return fail('operation-failed', 'A view id is required.')
        const { folder, kind: k } = c.value
        const r = await deleteView(folder, k, viewId)
        if (r.ok) await confirmContainerWrite(containerPath)
        return r.ok ? ok(null) : r
      },
    },

    // Per-container non-view settings (open_in / view_button) — the synced sidecar write
    // behind the ViewDropdown context menu + the Configuration/Open In row.
    'container:configure': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, patch: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        if (patch === null || typeof patch !== 'object') return NEEDS_CONFIG_PATCH
        const { folder, kind: k } = c.value
        const r = await setContainerConfig(folder, k, patch as ContainerConfigPatch)
        if (r.ok) await confirmContainerWrite(containerPath)
        return r.ok ? ok(null) : r
      },
    },

    // Batch frontmatter read for a container's view pipeline (pageId → frontmatter), lazy on open.
    'view:loadValues': {
      kind: 'raw',
      fn: async (containerPath: unknown): Promise<Record<string, PageFrontmatter>> => {
        const root = sessionRoot()
        if (root === null || typeof containerPath !== 'string') return {}
        const resolved = await resolveUnderRoot(root, containerPath)
        if (!resolved.ok) return {}
        return loadValues(root, containerPath)
      },
    },

    'schema:add': {
      kind: 'envelope',
      fn: async (containerPath: unknown, def: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        const parsed = propertyDefinition.safeParse(def)
        if (!parsed.success) return fail('operation-failed', 'Invalid property definition.')
        const created = await createProperty(c.value.root, parsed.data)
        if (!created.ok) return created
        const assigned = await assignProperty(c.value.root, c.value.folder, created.value.id)
        if (!assigned.ok) {
          // Don't orphan the just-created def in the registry when the assign leg fails.
          await removeFromRegistry(c.value.root, created.value.id)
          return assigned
        }
        await confirmRegistryWrite(c.value.rel)
        return ok({ id: created.value.id })
      },
    },

    'schema:rename': {
      kind: 'envelope',
      fn: async (containerPath: unknown, propertyId: unknown, newName: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        if (typeof propertyId !== 'string' || typeof newName !== 'string') {
          return fail('operation-failed', 'propertyId and newName must be strings.')
        }
        const r = await editProperty(c.value.root, propertyId, { name: newName })
        if (r.ok) await confirmRegistryWrite()
        return r.ok ? ok(null) : r
      },
    },

    'schema:reorder': {
      kind: 'envelope',
      fn: async (containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        if (typeof propertyId !== 'string' || typeof toIndex !== 'number') {
          return fail('operation-failed', 'propertyId (string) and toIndex (number) are required.')
        }
        const r = await reorderAssignment(c.value.folder, propertyId, toIndex)
        if (r.ok) await confirmRegistryWrite(c.value.rel)
        return r.ok ? ok(null) : r
      },
    },

    'schema:delete': {
      kind: 'envelope',
      fn: async (containerPath: unknown, propertyId: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        const r = await removeProperty(c.value.root, c.value.folder, propertyId)
        if (r.ok) await confirmRegistryWrite(c.value.rel)
        return r.ok ? ok(null) : r
      },
    },

    'schema:assign': {
      kind: 'envelope',
      fn: async (containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        // One chain slot covers a drag-assign: append + restore + slot placement land atomically.
        const r = await assignPropertyAt(
          c.value.root,
          c.value.folder,
          propertyId,
          typeof toIndex === 'number' ? toIndex : undefined,
        )
        if (r.ok) await confirmRegistryWrite(c.value.rel)
        return r.ok ? ok(null) : r
      },
    },

    'registry:reorder': {
      kind: 'envelope',
      fn: async (propertyId: unknown, toIndex: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string' || typeof toIndex !== 'number') {
          return fail('operation-failed', 'propertyId (string) and toIndex (number) are required.')
        }
        const r = await reorderRegistry(root, propertyId, toIndex)
        if (r.ok) await confirmRegistryWrite()
        return r.ok ? ok(null) : r
      },
    },

    // Snapshot to .trash, strip the value across every assigner, drop the def + all assignments.
    // The rare destructive op; unassign is the daily path.
    'property:delete': {
      kind: 'envelope',
      fn: async (propertyId: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        const r = await deletePropertyGlobal(root, propertyId)
        if (r.ok) await confirmRegistryWrite()
        return r.ok ? ok(null) : r
      },
    },

    'property:setOptions': {
      kind: 'envelope',
      fn: async (propertyId: unknown, options: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        if (!isOptionArray(options))
          return fail('operation-failed', 'Options must be an array of { value, label }.')
        const r = await setOptions(root, propertyId, options)
        if (r.ok) await confirmRegistryWrite()
        return r.ok ? ok(null) : r
      },
    },

    'property:setStatusGroups': {
      kind: 'envelope',
      fn: async (propertyId: unknown, groups: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        if (!Array.isArray(groups))
          return fail('operation-failed', 'Status groups must be an array.')
        const r = await setStatusGroups(root, propertyId, groups as StatusGroup[])
        if (r.ok) await confirmRegistryWrite()
        return r.ok ? ok(null) : r
      },
    },

    'property:setLinkConfig': defEditOp(narrowLinkConfig),

    // The def-level color, and nothing else — a non-string clears it to Default (the system
    // accent). The look itself (checkbox versus switch) is per-VIEW, in column_styles.
    'property:setCheckboxColor': defEditOp((color) => ({
      checkbox_color: typeof color === 'string' ? color : undefined,
    })),

    // The def's symbol id; a non-string clears it to the type's default glyph.
    'property:setIcon': defEditOp((icon) => ({
      icon: typeof icon === 'string' ? icon : undefined,
    })),

    'property:setNumberFormat': defEditOp(narrowNumberFormat),

    'property:setFileDirectory': defEditOp(narrowFileConfig, async (root, changes) => {
      const dir = (changes as FileConfig).file_directory
      if (dir === undefined) return ok(null)
      const { assetDir } = await readWatchScope(root)
      return validPropertyDir(dir, assetDir) ? ok(null) : NOT_A_PROPERTY_DIR
    }),

    'property:renameOption': optionRenameOp(renameOption),

    'property:removeOption': optionValueOp(removeOption),

    'property:clearOption': optionValueOp(clearOption),

    'property:renameStatusOption': optionRenameOp(renameStatusOption),

    'property:removeStatusOption': optionValueOp(removeStatusOption),

    'property:clearStatusOption': optionValueOp(clearStatusOption),

    // Subfield (footer) config — a React-owned `subfield` foreign key in `.nexus/settings.json`.
    'subfield:get': {
      kind: 'raw',
      fn: async (): Promise<SubfieldConfig | null> => {
        const root = sessionRoot()
        return root === null ? null : readSubfield(root)
      },
    },
    'subfield:set': {
      kind: 'envelope',
      fn: async (config: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (!config || typeof config !== 'object')
          return fail('operation-failed', 'Invalid subfield config.')
        await writeSubfield(root, config as SubfieldConfig)
        return ok(null)
      },
    },

    // Nav view modes (List/Gallery per surface) — a React-owned `navViewModes` foreign key.
    'navViewModes:get': {
      kind: 'raw',
      fn: async (): Promise<NavViewModes | null> => {
        const root = sessionRoot()
        return root === null ? null : readNavViewModes(root)
      },
    },
    'navViewModes:set': {
      kind: 'envelope',
      fn: async (modes: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (!modes || typeof modes !== 'object')
          return fail('operation-failed', 'Invalid nav view modes.')
        await writeNavViewModes(root, modes as NavViewModes)
        return ok(null)
      },
    },

    // The block document — one row per host, loaded on host open and never woven into the tree walk.
    'blocks:get': {
      kind: 'envelope',
      fn: (host: unknown) => {
        const h = coerceBlockHost(host)
        if (!h) return fail('not-found', 'Unknown block host.')
        return ok(readBlockDoc(h))
      },
    },
    'blocks:save': {
      kind: 'envelope',
      fn: (host: unknown, patch: unknown) => {
        if (adopting()) return BUSY
        const h = coerceBlockHost(host)
        if (!h) return fail('not-found', 'Unknown block host.')
        if (!patch || typeof patch !== 'object')
          return fail('operation-failed', 'Invalid block-doc patch.')
        const problem = blockPatchProblem(patch as BlockDocPatch)
        if (problem) return fail('operation-failed', problem)
        if (sessionDb() === null) return NO_NEXUS
        writeBlockDoc(h, patch as BlockDocPatch)
        return ok(null)
      },
    },

    'blocks:createMarkdown': {
      kind: 'envelope',
      fn: async (host: unknown) => {
        const ctx = blockHostAnd(host)
        if (!ctx.ok) return ctx
        return ok({ id: await createMarkdownTile(ctx.value.root, ctx.value.h) })
      },
    },
    'blocks:removeTile': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        await removeBlockTile(ctx.value.root, ctx.value.h, tileId as string)
        return ok(null)
      },
    },
    'blocks:readMarkdown': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        const body = await readMarkdownTile(ctx.value.root, ctx.value.h, tileId as string)
        return body === null ? fail('not-found', 'Block file not found.') : ok({ body })
      },
    },
    'blocks:writeMarkdown': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown, body: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        if (typeof body !== 'string') return fail('operation-failed', 'Body must be a string.')
        await writeMarkdownTile(ctx.value.root, ctx.value.h, tileId as string, body)
        return ok(null)
      },
    },
    'blocks:convertToPage': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown, pageId: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        if (typeof pageId !== 'string' || pageId.length === 0)
          return fail('operation-failed', 'Invalid page id.')
        await convertTileToPage(ctx.value.root, ctx.value.h, tileId as string, pageId)
        return ok(null)
      },
    },
    'blocks:convertToView': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown, views: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        const list = Array.isArray(views) ? views : null
        const valid =
          list?.length &&
          list.every((v) => typeof (v as { source_id?: unknown })?.source_id === 'string')
        if (!valid) return fail('operation-failed', 'Invalid view list.')
        await convertTileToView(ctx.value.root, ctx.value.h, tileId as string, list as unknown[])
        return ok(null)
      },
    },
    'blocks:duplicateTile': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        const id = await duplicateBlockTile(ctx.value.root, ctx.value.h, tileId as string)
        return id ? ok({ id }) : fail('not-found', 'No such tile.')
      },
    },
    // Delete keeps the native confirm (deliberate) — the in-app menu asks main first.
    'blocks:confirmRemove': {
      kind: 'window',
      fn: async (win: BrowserWindow | null): Promise<boolean> => {
        if (!win) return false
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['Remove', 'Cancel'],
          defaultId: 0,
          cancelId: 1,
          message: 'Remove this block?',
          detail:
            'A markdown block’s file moves to the nexus’s .trash (recoverable); embeds only remove the tile.',
        })
        return response === 0
      },
    },

    // Merged one key at a time into the React-owned `personalization` object in `.nexus/settings.json`;
    // the value is validated on read.
    'personalization:set': {
      kind: 'envelope',
      fn: async (key: unknown, value: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof key !== 'string' || !key)
          return fail('operation-failed', 'Invalid personalization key.')
        await writePersonalization(root, key, value)
        // The personalization keys with a main-side effect: guests re-stamp, the window re-zooms.
        if (key === 'webZoomFactor') setWebZoomFactor(coerceScale(value, WEB_ZOOM_DEFAULT))
        if (key === 'defaultViewScale' && mainWindow && !mainWindow.isDestroyed())
          setHostZoom(mainWindow.webContents, viewScaleZoom(coerceViewScale(value)))
        // No renderer confirm exists for this channel (the slice patches optimistically), yet
        // it writes a field the walk reads — the push set's membership predicate.
        await confirmSettingsWrite()
        return ok(null)
      },
    },

    'trash:list': {
      kind: 'envelope',
      fn: async () => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        return ok(trashRows(await listBundles(root), getLiveTree() ?? (await refreshTree(root))))
      },
    },

    // The single write path — main resolves the request under the session root and runs the
    // orchestration.
    mutate: {
      kind: 'raw',
      fn: async (req: MutateRequest) => {
        const reply = await handleMutate(req, await mutateDeps())
        if (reply.ok) {
          await confirmWrite((root) => confirmMutation(root, req, reply.value))
          pushAssetWrites()
        }
        return reply
      },
    },

    // A right-clicked sidebar entity's menu; its items act main-side (handleMutate / confirm /
    // Finder) and signal the renderer to refetch on change.
    'context-menu': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, target: ContextTarget): Promise<void> => {
        if (!win) return
        await showContextMenu(win, target, await mutateDeps(), async (req, reply) => {
          // The menu outlives its IPC handler, so this confirm fires after the mutation
          // finished — the same patch-and-push every renderer-driven mutation gets.
          await confirmWrite((root) => confirmMutation(root, req, reply))
          pushAssetWrites()
          push(win, 'menu:action', 'reload-state')
        })
      },
    },

    // The section-header "+" menu (New Area/Topic/Project). Resolves with the picked request (null
    // when dismissed) — the renderer's store runs it, riding the same one-write-path +
    // optimistic-insert flow as every other mutation, instead of forcing a full reload here.
    'create-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, items: Creator[]): Promise<MutateRequest | null> => {
        return popReturningMenu<MutateRequest>(win, (pick) =>
          items.map((it) => ({ label: it.label, click: pick(it.req) })),
        )
      },
    },

    // Renderer-initiated mutations (e.g. New Page ⌘N) have no native dialog of their own,
    // unlike the context menu.
    'error:show': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, message: unknown): Promise<void> => {
        if (win && typeof message === 'string') {
          await dialog.showMessageBox(win, {
            type: 'error',
            message: 'Couldn’t complete that action.',
            detail: message,
          })
        }
      },
    },

    // Open an external markdown link in the OS default app. Invalid links (same check that dims them in
    // the editor) are rejected — the renderer never opens links itself.
    'link:open': {
      kind: 'raw',
      fn: async (url: unknown): Promise<void> => {
        if (typeof url !== 'string' || !isValidLink(url)) return
        await shell.openExternal(normalizeLinkUrl(url))
      },
    },

    // `get` hydrates the renderer's store on open (whole cached map); `fetch` resolves one URL
    // (cache hit or a live network fetch), persisting successes to the device-local title cache.
    'linkTitles:get': {
      kind: 'raw',
      fn: async (): Promise<LinkTitleCache> => {
        const root = sessionRoot()
        return root ? getTitleCache(root) : {}
      },
    },
    'linkTitles:fetch': {
      kind: 'envelope',
      fn: async (url: unknown) => {
        if (typeof url !== 'string') return fail('operation-failed', 'invalid url')
        const root = sessionRoot()
        if (!root) return NO_NEXUS
        return ok({ title: await resolveTitle(root, url) })
      },
    },

    // The OS accent (macOS 10.14+), for accent === 'system'. Electron returns
    // RRGGBBAA; surface just the RGB as '#RRGGBB'. null when unsupported/unavailable.
    'theme:systemAccent': {
      kind: 'raw',
      fn: (): string | null => {
        try {
          const c = systemPreferences.getAccentColor?.()
          return c ? `#${c.slice(0, 6)}` : null
        } catch {
          return null
        }
      },
    },

    // Resolves the picked action to the renderer, which performs the container-config write;
    // the renderer supplies the current values for the checkmarks.
    'view-button-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, current: unknown): Promise<ViewButtonMenuAction | null> => {
        const c = current as { viewButton?: unknown } | null
        const viewButton: ViewButton = c?.viewButton === 'labeled' ? 'labeled' : 'icon'
        return popViewButtonMenu(win, { viewButton })
      },
    },

    // A saved view row's right-click menu, shared by the view pane and the embed's segments.
    'view-row-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: unknown): Promise<ViewRowAction | null> => {
        const c = ctx as { titlesShown?: unknown; deletable?: unknown } | null
        return popViewRowMenu(win, {
          ...(typeof c?.titlesShown === 'boolean' ? { titlesShown: c.titlesShown } : {}),
          deletable: c?.deletable === true,
        })
      },
    },

    // The view embed's title-row right-click menu (Hide/Show Icon · Title Size · Hide Title).
    'view-embed-title-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, arg: unknown): Promise<EmbedTitleMenuAction | null> => {
        const a = arg as { iconShown?: unknown; level?: unknown } | null
        const level = typeof a?.level === 'number' && a.level >= 1 && a.level <= 6 ? a.level : 4
        return popEmbedTitleMenu(win, a?.iconShown === true, level)
      },
    },

    // The view embed switcher area's right-click menu (Hide/Show Titles · New View · Style).
    'view-embed-area-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, current: unknown): Promise<EmbedAreaMenuAction | null> => {
        const c = current as { viewStyle?: unknown; titleShown?: unknown } | null
        return popEmbedAreaMenu(win, {
          viewStyle: c?.viewStyle === 'dropdown' ? 'dropdown' : 'toolbar',
          titleShown: c?.titleShown !== false,
        })
      },
    },

    // The icon picker's right-click Favorite menu — resolves 'toggle' to the renderer, which owns
    // the favoriteIcons write.
    'icon-favorite-menu': {
      kind: 'menu',
      fn: async (
        win: BrowserWindow,
        favorited: unknown,
      ): Promise<IconFavoriteMenuAction | null> => {
        return popIconFavoriteMenu(win, favorited === true)
      },
    },

    // The nexus identity icon menu (Edit Icon → the renderer's glyph picker; Add/Change Photo → the native
    // image pick, done renderer-side). Returns the chosen action; the renderer runs the picker/pick + mutate.
    'nexus:iconMenu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, arg: unknown): Promise<NexusIconAction | null> => {
        const opts = (arg ?? {}) as { hasPhoto?: boolean; hasGlyph?: boolean }
        return popReturningMenu<NexusIconAction>(win, (pick) => [
          { label: 'Edit Icon', click: pick('changeIcon') },
          ...(opts.hasPhoto ? [{ label: 'Edit Photo', click: pick('editPhoto') }] : []),
          { label: opts.hasPhoto ? 'Change Photo' : 'Add Photo', click: pick('addPhoto') },
          ...(opts.hasPhoto || opts.hasGlyph ? [{ type: 'separator' as const }] : []),
          ...(opts.hasPhoto ? [{ label: 'Remove Photo', click: pick('removePhoto') }] : []),
          ...(opts.hasGlyph ? [{ label: 'Remove Icon', click: pick('removeIcon') }] : []),
        ])
      },
    },

    // The banner's Add/Change affordances use this directly (the photo's "Add Photo" menu wraps
    // the same picker).
    'nexus:pickFile': { kind: 'menu', fn: pickFilePath },
    'nexus:pasteImage': { kind: 'raw', fn: pasteImagePath },

    // Bounded by the pick, like every other read-back of an outside path; the DESTINATION is
    // refused inside `adoptFile`, at the write.
    'assets:adopt': {
      kind: 'envelope',
      fn: async (source: string, subfolder?: string) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (!pickedPaths.has(source)) return fail('invalid-path', 'That file was not picked here.')
        const adopted = await adoptFile(root, source, {
          allow: 'any',
          ...(subfolder ? { subfolder } : {}),
        })
        // Riding `mutate` gave this for free; a standalone channel has to say it, or the file that
        // just landed is absent from the renderer's map and its label renders unresolved.
        if (adopted.ok) pushAssetWrites()
        return adopted
      },
    },

    // Change/Remove for an existing image, a single Add item when `add`. The noun follows the
    // surface's vocabulary (Banner by default; the cards' Cover-mode thumb passes "Cover").
    // Add resolves 'change' (both routes open the image picker).
    'nexus:bannerMenu': {
      kind: 'menu',
      fn: async (
        win: BrowserWindow,
        opts?: { noRemove?: boolean; noun?: string; add?: boolean },
      ): Promise<BannerMenuAction | null> => {
        const noun = opts?.noun ?? 'Banner'
        return popReturningMenu<BannerMenuAction>(win, (pick) =>
          opts?.add
            ? [{ label: `Add ${noun}`, click: pick('change') }]
            : [
                { label: `Edit ${noun}`, click: pick('edit') },
                { label: `Change ${noun}`, click: pick('change') },
                ...(opts?.noRemove ? [] : [{ label: `Remove ${noun}`, click: pick('remove') }]),
              ],
        )
      },
    },

    // Rename is always offered; Edit Icon unless `noEditIcon` (the homepage sets its icon from
    // the settings pane, not here); `toggleIcon` adds the Hide/Show Icon item.
    'nexus:titleMenu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, arg: unknown): Promise<TitleMenuAction | null> => {
        const opts = (arg ?? {}) as {
          toggleIcon?: boolean
          iconHidden?: boolean
          noEditIcon?: boolean
          changeColor?: boolean
        }
        return popReturningMenu<TitleMenuAction>(win, (pick) => [
          { label: 'Rename', click: pick('rename') },
          ...(opts.noEditIcon ? [] : [{ label: 'Edit Icon', click: pick('editIcon') }]),
          ...(opts.toggleIcon
            ? [{ label: iconLabel(!opts.iconHidden), click: pick('toggleIcon') }]
            : []),
          ...(opts.changeColor
            ? [
                { type: 'separator' as const },
                { label: 'Change Color', click: pick('changeColor') },
              ]
            : []),
        ])
      },
    },

    'table-menu': { kind: 'menu', fn: popTableMenu },

    // Every block grip's right-click menu — Delete, plus that block kind's own arm.
    'grip-menu': { kind: 'menu', fn: popGripMenu },

    'column-menu': { kind: 'menu', fn: popColumnMenu },

    // A table cell's right-click menu (title meta / per-type Style / Edit).
    'cell-menu': { kind: 'menu', fn: popCellMenu },

    'clipboard:write': {
      kind: 'raw',
      fn: (text: unknown) => {
        if (typeof text === 'string') clipboard.writeText(text)
      },
    },
    'clipboard:read': { kind: 'raw', fn: () => clipboard.readText() },
    'path:reveal': {
      kind: 'raw',
      fn: async (p: unknown) => {
        const root = sessionRoot()
        if (root === null || typeof p !== 'string') return
        const r = await resolveUnderRoot(root, p)
        if (r.ok) shell.showItemInFolder(r.value)
      },
    },
    'page-actions-menu': { kind: 'menu', fn: popPageActionsMenu },

    // A card's right-click menu (page meta + Add Property ▸).
    'card-menu': { kind: 'menu', fn: popCardMenu },

    // The ordinary delete's confirm cannot be reused: it hardcodes one title, runs the delete
    // itself, and promises a destination from the old trash mode — wrong in both of the switch's
    // positions. This one names what will actually happen, read at the moment of asking.
    'trash:confirmEmpty': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, count: unknown): Promise<boolean> => {
        const root = sessionRoot()
        if (!win || root === null || typeof count !== 'number' || count < 1) return false
        const permanent = await readPermanentDelete(root)
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['Delete', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          message: count === 1 ? 'Delete this item?' : `Delete these ${count} items?`,
          detail: permanent
            ? 'It will be erased from this computer. This cannot be undone.'
            : 'It will move to your system trash, which is where you would get it back from.',
        })
        return response === 0
      },
    },

    'trash:report': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, message: unknown, detail: unknown): Promise<void> => {
        if (win && typeof message === 'string' && typeof detail === 'string')
          await dialog.showMessageBox(win, { type: 'info', message, detail })
      },
    },

    'trash:menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: TrashMenuContext) =>
        isPlainObject(ctx) ? popTrashMenu(win, ctx) : null,
    },

    'trash:columnMenu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: TrashColumnContext) =>
        isPlainObject(ctx) ? popTrashColumnMenu(win, ctx) : null,
    },

    // A tab's right-click menu (Pin/Unpin · Close · Close to the Right).
    'tab-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: TabMenuContext) => {
        return isPlainObject(ctx) ? popTabMenu(win, ctx) : null
      },
    },

    'nav-row-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: NavRowMenuContext) => {
        return isPlainObject(ctx) ? popNavRowMenu(win, ctx) : null
      },
    },

    // A wikilink's right-click menu (Open Preview).
    'conn-menu': { kind: 'menu', fn: popConnMenu },
    'citation-menu': { kind: 'menu', fn: popCitationMenu },

    'property-menu': { kind: 'menu', fn: popPropertyMenu },

    'option-menu': { kind: 'menu', fn: popOptionMenu },
    'row-menu': { kind: 'menu', fn: popRowMenu },

    // Rename the OPEN nexus's ROOT folder within its parent dir, then RE-POINT the live session
    // to the new path. A dedicated IPC (not a mutate op) because it re-targets the whole session:
    // after the fs.rename, adoptNexus re-opens the session, database, watcher, and recents at the new
    // path. Never throws across the boundary.
    'nexus:rename': {
      kind: 'envelope',
      fn: async (newName: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof newName !== 'string') return fail('operation-failed', 'A name is required.')
        const trimmed = newName.trim()
        if (trimmed.length === 0) return fail('operation-failed', 'The name can’t be empty.')
        if (trimmed.includes('/') || trimmed.includes('\\'))
          return fail('operation-failed', 'The name can’t contain a slash.')
        if (trimmed === basename(root))
          return fail('operation-failed', 'That’s already the nexus name.')
        const newRoot = join(dirname(root), trimmed)
        if (await pathExists(newRoot))
          return fail('operation-failed', 'A folder with that name already exists.')
        await rename(root, newRoot)
        // RE-POINT: adoptNexus does exactly the re-target work (openSession + openSessionDb +
        // startWatcher + lastNexusPath/recents + addRecentDocument + refreshMenu), so reuse it
        // rather than replicate the calls — opting out of the record latch, which belongs to
        // genuine opens only.
        await adoptNexus(newRoot, false)
        // The re-point reseeded the live tree; the push is the renderer's confirmation.
        pushConfirmed(getLiveTree())
        return ok(null)
      },
    },
  },
  {
    // Pushed here so the native context menu (editorMenu.ts) can render accurate checkmarks/radios.
    'editor:format-state': { kind: 'raw', fn: (state: FormatState) => setFormatState(state) },

    // The JS window mover (hover-bearing chrome can't be a native drag region — it'd lose hover).
    'win:dragBy': {
      kind: 'window',
      fn: (win, dx: number, dy: number) => {
        if (typeof dx !== 'number' || typeof dy !== 'number') return
        const [x, y] = win.getPosition()
        win.setPosition(Math.round(x + dx), Math.round(y + dy))
      },
    },
    'win:zoom': {
      kind: 'window',
      fn: (win) => {
        if (win.isMaximized()) win.unmaximize()
        else win.maximize()
      },
    },

    // Flagged on hover so the generic editor menu stands down and the hovered grip's own menu
    // is the only one that pops on the right-press.
    'editor:grip-hot': { kind: 'raw', fn: (on: boolean) => setGripHot(on) },

    'web:wheel': { kind: 'raw', fn: wheelGuest },
  },
)

// Every write lock in this process — the per-file chains, the schema chain, the watcher's
// self-write suppression — is module state, so a SECOND process on the same nexus shares none of
// it and its writes race every one of ours with no coordination at all. One instance is therefore
// a correctness boundary, not a convenience: the loser exits before it can open a session, and a
// relaunch raises the window that already exists. Multi-window stays reachable — one process may
// own many windows; what it may not do is become a second process over one nexus.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

app
  .whenReady()
  .then(async () => {
    // A losing second instance is already quitting; whenReady can still fire before it exits.
    if (!app.hasSingleInstanceLock()) return
    // Restore the last nexus if it's still an existing directory; otherwise launch
    // empty. No picker/modal here — a launch must never block (headless / tests).
    // Restore failures degrade to empty state (never fatal); only a failure to
    // create the window reaches the fatal .catch below.
    try {
      const config = await readAppConfig(app.getPath('userData'))
      const restore = await resolveRestorePath(config)
      if (restore) await openNexusSequence(restore, true)
    } catch (e) {
      console.error('Restore skipped (config unreadable):', e)
    }

    // Dark-only app: force the native chrome dark to match the renderer (a light
    // theme + `themeSource = 'system'` is a later task).
    nativeTheme.themeSource = 'dark'
    app.setAboutPanelOptions({ applicationName: 'Pommora', applicationVersion: app.getVersion() })

    registerRendererProtocol()
    registerAssetProtocol()
    createWindow()
    refreshMenu()
    // A restored nexus opened before the window existed — start its watcher now.
    const restored = sessionRoot()
    if (restored && mainWindow) void startWatcher(restored, mainWindow)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        // Re-attach the watcher to the fresh window (the session stays open across a close).
        const root = sessionRoot()
        if (root && mainWindow) void startWatcher(root, mainWindow)
      }
    })
  })
  .catch((e) => {
    console.error('Failed to start:', e)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Quit cleanup. Database writes commit synchronously, so the close is only tidying — it flushes
// the WAL and frees its sibling files. Navigation intent is the one operational write still going
// to disk, so it is the one thing that can still be owed: defer the quit, settle it, re-quit.
let flushingBeforeQuit = false
app.on('before-quit', (e) => {
  if (flushingBeforeQuit) return
  stopWatcher()
  if (!hasPendingNavigation()) {
    closeSessionDb()
    return
  }
  e.preventDefault()
  flushingBeforeQuit = true
  void flushNavigation().then(() => {
    closeSessionDb()
    app.quit()
  })
})
