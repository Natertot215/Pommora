import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  protocol,
  shell,
  systemPreferences,
} from 'electron'
import type { OpenDialogOptions } from 'electron'
import { basename, dirname, extname, join, sep } from 'node:path'
import { readFile, rename } from 'node:fs/promises'
import type {
  AgendaListResult,
  NavFavorite,
  NavStateResult,
  NavTarget,
  NavViewModes,
  NexusState,
  PageResult,
  PinEntry,
  PinsResult,
  PreviewsFile,
  PreviewsResult,
  RecentEntry,
  SubfieldConfig,
  TabSet,
  TabsResult,
  ThumbRect,
  ThumbResult,
} from '@shared/types'
import { isPlainObject } from '@shared/propertyValue'
import { errText, type Ack } from '@shared/result'
import { handleEnvelope, handleLocalScope, handleWindowMenu } from './ipc'
import { collectAgendaEntries } from './agenda/collectAgenda'
import type { MutateRequest, MutateResult, ContextTarget } from '@shared/mutate'
import { WINDOW_BG } from '@shared/theme'
import { readNexus } from './readNexus'
import { readPage } from './readPage'
import {
  convertTileToPage,
  convertTileToView,
  createMarkdownBlock,
  duplicateBlockTile,
  readBlockDoc,
  readMarkdownBlock,
  removeBlockTile,
  writeBlockDoc,
  writeMarkdownBlock,
} from './blocks'
import { isUlid } from './ids'
import {
  blockPatchProblem,
  coerceBlockHost,
  type BlockDocPatch,
  type BlockHostRef,
  type BlocksGetResult,
  type BlocksSaveResult,
} from '@shared/blocks'
import { pathExists } from './io/atomicWrite'
import { readAppConfig, writeAppConfig, addRecent, DEFAULT_TRASH_MODE } from './appConfig'
import { sessionRoot, openSession, resolveRestorePath, isExistingDir } from './session'
import { serializeOnFile } from './io/fileLock'
import { openSessionDb, closeSessionDb } from './sessionDb'
import { stampAdopted } from './adopt'
import { ensureIdentity } from './identity'
import { ensureContextsRegistry } from './contextsRegistry'
import {
  ensureSettings,
  readDefaultViewScale,
  readNavViewModes,
  readSubfield,
  writeNavViewModes,
  writePersonalization,
  writeSubfield,
} from './settings'
import { startWatcher, stopWatcher } from './watcher'
import { resolveUnderRoot } from './pathSafety'
import { updatePageBody } from './crud/page'
import { replayPendingRename } from './crud/contextCascade'
import {
  flushFavorites,
  hasPendingFavorites,
  readNavState,
  writeFavorites,
  writeRecents,
} from './io/navState'
import { readTabsState, writeTabsState } from './io/tabsState'
import { readPreviewsState, writePreviewsState } from './io/previewState'
import { loadOrMigratePins, removePin, writePin } from './io/pinsState'
import { captureThumbnail, evictThumbnails } from './io/thumbnails'
import { saveView, reorderViews, deleteView } from './crud/views'
import { setContainerConfig, type ContainerConfigPatch } from './crud/containerConfig'
import { loadValues } from './crud/loadValues'
import {
  createProperty,
  editProperty,
  removeFromRegistry,
  reorderRegistry,
} from './crud/registryProperty'
import { assignProperty, assignPropertyAt, reorderAssignment } from './crud/assignment'
import { removeProperty } from './crud/removeProperty'
import { deleteProperty as deletePropertyGlobal } from './crud/deleteProperty'
import {
  setOptions,
  setStatusGroups,
  renameOption,
  removeOption,
  clearOption,
  renameStatusOption,
  removeStatusOption,
  clearStatusOption,
} from './crud/optionOps'
import type { StatusGroup } from '@shared/properties'
import type { Option } from '@shared/optionModel'
import { savedView } from '@shared/views'
import { propertyDefinition, propertyType } from '@shared/properties'
import type { PageFrontmatter } from '@shared/schemas'
import { handleMutate, type MutateDeps } from './mutate'
import { showContextMenu } from './contextMenu'
import { installAppMenu } from './menu'
import { popTableMenu } from './tableMenu'
import type { TableMenuContext } from '@shared/tableMenu'
import type { ColumnMenuContext } from '@shared/columnMenu'
import type { CellMenuContext } from '@shared/cellMenu'
import type { PropertyMenuContext } from '@shared/propertyMenu'
import type { OptionMenuContext } from '@shared/optionMenu'
import { popCalloutMenu } from './calloutMenu'
import { popColumnMenu } from './columnMenu'
import { popCellMenu } from './cellMenu'
import { popCardMenu } from './cardMenu'
import type { CardMenuContext } from '@shared/cardMenu'
import { popConnMenu } from './connMenu'
import { popTabMenu } from './tabMenu'
import type { TabMenuContext } from '@shared/tabMenu'
import { popNavRowMenu } from './navRowMenu'
import type { NavRowMenuContext } from '@shared/navRowMenu'
import { popPropertyMenu } from './propertyMenu'
import { popOptionMenu } from './optionMenu'
import { popIconFavoriteMenu } from './iconFavoriteMenu'
import { popViewButtonMenu, type ViewButtonMenuAction } from './viewButtonMenu'
import { popReturningMenu } from './returningMenu'
import {
  popEmbedTitleMenu,
  popEmbedAreaMenu,
  type EmbedTitleMenuAction,
  type EmbedAreaMenuAction,
} from './viewEmbedMenu'
import { popViewItemMenu, type ViewItemMenuAction } from './viewItemMenu'
import { popViewRowMenu, type ViewRowMenuAction } from './viewRowMenu'
import type { ViewButton, ViewStyle } from '@shared/types'
import { VIEW_SCALE_DEFAULT } from '@shared/types'
import { installEditorContextMenu, setFormatState, setCalloutGrip } from './editorMenu'
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

// Read-only and confined to the open nexus's .nexus/assets/ (resolveUnderRoot realpaths +
// contains; the prefix check pins it to that dir).
const ASSET_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}
function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    const root = sessionRoot()
    if (!root) return new Response('No nexus open', { status: 404 })
    const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    if (!rel.startsWith('.nexus/assets/')) return new Response('Forbidden', { status: 403 })
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
  const scale = root ? await readDefaultViewScale(root) : VIEW_SCALE_DEFAULT
  if (!win.isDestroyed()) win.webContents.setZoomFactor(scale)
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
    },
  })

  // Applied before first paint so the window opens at scale instead of flashing 100% → scale;
  // finally() guarantees show() even if the (error-swallowing) read stalls.
  win.on('ready-to-show', () => void applyDefaultZoom(win).finally(() => win.show()))
  installEditorContextMenu(win)
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

// The renderer's launch + post-change read. Empty status is not an error — just no nexus open.
ipcMain.handle('nexus:state', async (): Promise<NexusState> => {
  const root = sessionRoot()
  if (root === null) return { status: 'empty' }
  try {
    const tree = await readNexus(root)
    return { status: 'open', tree }
  } catch (e) {
    return { status: 'error', error: errText(e) }
  }
})

// Called only when the sidebar's Agenda mode is active, so agenda files never join the tree walk.
handleEnvelope('agenda:list', async (): Promise<AgendaListResult> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus open' }
  const { tasks, events } = await collectAgendaEntries(root)
  return { ok: true, tasks, events }
})

// The renderer owns the in-memory recents/favorites arrays and all MRU/dedupe/cap/prune logic;
// main only persists. Recents debounce (fired on every selection); favorites write immediately.
handleEnvelope('nav:load', async (): Promise<NavStateResult> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus open' }
  return { ok: true, ...(await readNavState(root)) }
})

handleEnvelope('nav:saveRecents', (entries: unknown): Ack => {
  if (adopting) return { ok: false, error: 'Nexus switching.' }
  if (!Array.isArray(entries)) return { ok: false, error: 'Recents entries must be an array.' }
  if (!writeRecents(entries as RecentEntry[])) return { ok: false, error: 'No nexus is open.' }
  return { ok: true }
})

handleEnvelope('nav:saveFavorites', async (entries: unknown): Promise<Ack> => {
  if (adopting) return { ok: false, error: 'Nexus switching.' }
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (!Array.isArray(entries)) return { ok: false, error: 'Favorites entries must be an array.' }
  await writeFavorites(root, entries as NavFavorite[])
  return { ok: true }
})

// Durable pins — per-pin files under `.nexus/pins/`. add + reorder are one-file writes; remove is a
// tombstone-write (pinsState). Each writes immediately (a deliberate act) and lands in the quit gate.
handleEnvelope('nav:loadPins', async (): Promise<PinsResult> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus open' }
  return { ok: true, pins: await loadOrMigratePins(root) }
})

const savePin = async (pin: unknown): Promise<Ack> => {
  try {
    // Mid-adopt, sessionRoot() is already the NEW nexus — a pin gesture on the old nexus's still-open UI
    // would write a foreign entity into the new nexus's synced pins. Drop it, like the recents/tabs saves.
    if (adopting) return { ok: false, error: 'Nexus switching.' }
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (!isPlainObject(pin)) return { ok: false, error: 'Pin must be an object.' }
    await writePin(root, pin as PinEntry)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errText(e) }
  }
}
ipcMain.handle('nav:addPin', (_e, pin: unknown) => savePin(pin))
ipcMain.handle('nav:reorderPin', (_e, pin: unknown) => savePin(pin))

handleEnvelope('nav:removePin', async (target: unknown, order: unknown): Promise<Ack> => {
  if (adopting) return { ok: false, error: 'Nexus switching.' }
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (!isPlainObject(target) || typeof order !== 'number')
    return { ok: false, error: 'Bad remove-pin args.' }
  await removePin(root, target as NavTarget, order)
  return { ok: true }
})

// Ordered unpinned tabs + the active pointer + per-tab history targets, as one row in nexus.db.
handleEnvelope('tabs:load', (): TabsResult => {
  if (sessionRoot() === null) return { ok: false, error: 'No nexus open' }
  return { ok: true, set: readTabsState() }
})

ipcMain.handle('tabs:save', (_e, set: unknown): Ack => {
  if (adopting) return { ok: false, error: 'Nexus switching.' }
  if (!isPlainObject(set) || !Array.isArray(set.tabs)) return { ok: false, error: 'Bad tab set.' }
  if (!writeTabsState(set as unknown as TabSet)) return { ok: false, error: 'No nexus is open.' }
  return { ok: true }
})

// The NavWindow set, the per-origin page sets, and the open pointer, as one row in nexus.db.
handleEnvelope('previews:load', (): PreviewsResult => {
  if (sessionRoot() === null) return { ok: false, error: 'No nexus open' }
  return { ok: true, file: readPreviewsState() }
})

ipcMain.handle('previews:save', (_e, file: unknown): Ack => {
  if (adopting) return { ok: false, error: 'Nexus switching.' }
  if (!isPlainObject(file) || !isPlainObject(file.origins))
    return { ok: false, error: 'Bad previews file.' }
  if (!writePreviewsState(file as unknown as PreviewsFile))
    return { ok: false, error: 'No nexus is open.' }
  return { ok: true }
})

// Gallery thumbnails — capture the detail-pane rect on entity-open, evict on membership roll-off.
const isRect = (v: unknown): v is ThumbRect =>
  isPlainObject(v) && ['x', 'y', 'width', 'height'].every((k) => typeof v[k] === 'number')
ipcMain.handle(
  'capture:thumbnail',
  async (e, navKey: unknown, rect: unknown, scaleFactor: unknown): Promise<ThumbResult> => {
    try {
      const root = sessionRoot()
      if (root === null) return { ok: false, error: 'No nexus is open.' }
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win || typeof navKey !== 'string' || !isRect(rect) || typeof scaleFactor !== 'number')
        return { ok: false, error: 'Bad capture args.' }
      const url = await captureThumbnail(win, root, navKey, rect, scaleFactor)
      return url ? { ok: true, url } : { ok: false, error: 'Capture produced no image.' }
    } catch (err) {
      return { ok: false, error: errText(err) }
    }
  },
)
handleEnvelope('nav:evictThumbs', async (liveKeys: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (!Array.isArray(liveKeys)) return { ok: false, error: 'Live keys must be an array.' }
  await evictThumbnails(
    root,
    liveKeys.filter((k): k is string => typeof k === 'string'),
  )
  return { ok: true }
})

// Shared by every path that opens a nexus, run after openSession and before the index reads
// anything: ensures `.nexus/nexus.json` + `settings.json` exist in Swift's shape (a full settings
// file keeps Swift's decoder from reseeding and losing data when it later opens the folder), then
// stamps any un-adopted entity with a real ULID so the index and every later write get a stable
// id instead of a transient `adopted-` placeholder. Best-effort: never blocks opening the folder.
async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureSettings(path)
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
let adopting = false

// Open a chosen nexus folder: make it the session, persist it as last-opened, and
// push it onto the recents (deduped, capped) + the OS Recent Documents list.
async function adoptNexus(path: string): Promise<void> {
  adopting = true
  try {
    await adoptNexusInner(path)
  } finally {
    adopting = false
  }
}

async function adoptNexusInner(path: string): Promise<void> {
  await openSession(path)
  // openSession canonicalized the root (realpath); thread THAT everywhere below so the watcher's
  // session-match guard and the index/persistence key off the same string — a raw path here
  // would make the watcher treat every event as a session switch.
  const root = sessionRoot() ?? path
  await prepareOpenedNexus(root)
  // Forward-completes a crashed rename, BEFORE anything reads contexts.
  await replayPendingRename(root)
  // Best-effort: a null handle costs the session its persisted chrome, never its content.
  openSessionDb(root)
  // A user-initiated open always has a window; launch-restore starts its watcher after
  // createWindow below instead.
  if (mainWindow) void startWatcher(root, mainWindow)
  // Switching nexus doesn't reload the renderer, so apply the new default scale here —
  // the launch-restore path gets it via did-finish-load instead.
  if (mainWindow) void applyDefaultZoom(mainWindow)
  // Best-effort: a config-write failure must not block opening the folder this session,
  // nor leave a half-open "ghost" session the renderer never re-reads.
  try {
    const userData = app.getPath('userData')
    const config = await readAppConfig(userData)
    // Persist the RAW user-facing path, not the canonical `root`: a nexus under an iCloud-synced
    // ~/Documents realpaths into the Mobile Documents container, which reads as gibberish in Open
    // Recent AND breaks restore if the user later turns iCloud Desktop & Documents off (the
    // container path disappears; ~/Documents/MyNexus survives). Canonical stays on the in-process
    // locks only; what we save and reveal to the user stays the path they picked.
    await writeAppConfig(userData, {
      ...config,
      lastNexusPath: path,
      recents: addRecent(config.recents ?? [], path),
    })
    app.addRecentDocument(path)
  } catch (e) {
    console.error('Could not persist recents / last-opened:', e)
  }
  refreshMenu()
}

// A sheet on the calling window; on success the renderer re-reads nexus:state.
ipcMain.handle('nexus:choose', async (e): Promise<boolean> => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const opts = {
    properties: ['openDirectory', 'createDirectory'],
    message: 'Choose a nexus folder',
  } satisfies OpenDialogOptions
  const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
  if (result.canceled) return false
  const [chosen] = result.filePaths
  if (!chosen) return false
  await adoptNexus(chosen)
  return true
})

// The preload resolves the dropped File to an absolute path (webUtils) and sends it here —
// the one place a renderer-origin path enters. Accepted only if it's an existing directory.
ipcMain.handle('nexus:openPath', async (_e, p: unknown): Promise<boolean> => {
  if (typeof p !== 'string' || p.length === 0) return false
  if (!(await isExistingDir(p))) return false
  await adoptNexus(p)
  return true
})

// resolveUnderRoot canonicalizes the renderer's nexus-relative path under the open nexus root
// and rejects anything that escapes (traversal, absolute, or an in-nexus symlink pointing out).
handleEnvelope('page:open', async (relPath: unknown): Promise<PageResult> => {
  const root = sessionRoot()
  if (root === null) {
    return { ok: false, error: 'No nexus is open.' }
  }
  if (typeof relPath !== 'string') {
    return { ok: false, error: 'A page path is required.' }
  }
  const resolved = await resolveUnderRoot(root, relPath)
  if (!resolved.ok) {
    return { ok: false, error: resolved.error.message }
  }
  // resolveUnderRoot is the guard; readPage re-joins root + relPath and keeps the
  // relative path as the page's identity (PageDetail.path), so pass relPath, not
  // the canonical absolute (which would leak an abs path + mis-key the detail).
  const page = await readPage(root, relPath)
  return { ok: true, page }
})

// Reconstructs the file via updatePageBody (frontmatter-preserving) + atomic write.
// Structurally distinct from the one-shot `mutate` ops, so it gets its own channel.
handleEnvelope('page:updateBody', async (relPath: unknown, body: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof relPath !== 'string') return { ok: false, error: 'A page path is required.' }
  if (typeof body !== 'string') return { ok: false, error: 'A body string is required.' }
  const resolved = await resolveUnderRoot(root, relPath)
  if (!resolved.ok) return { ok: false, error: resolved.error.message }
  // Under the page's file lock — the editor autosave and a link-rename cascade both rewrite
  // this page's body, so they must serialize rather than clobber each other.
  const r = await serializeOnFile(resolved.value, () => updatePageBody(resolved.value, body))
  return r.ok ? { ok: true } : { ok: false, error: r.error.message }
})

// The keyed operational stores — one row per (scope, key) in nexus.db. Per-machine editor and view
// chrome, kept out of the portable `.md` and out of the synced container sidecars.
const isString = (v: unknown): v is string => typeof v === 'string'
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
const isIndexArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0)

handleLocalScope('folds', 'folds', isStringArray, 'Fold keys must be a string array.')
handleLocalScope('activeViews', 'activeView', isString, 'A view id is required.')
handleLocalScope('viewOrders', 'viewOrder', isStringArray, 'An order of page ids is required.')
handleLocalScope(
  'tableHeadingCols',
  'headingCols',
  isIndexArray,
  'Table indices must be a non-negative-integer array.',
)

// View persistence — save / reorder / delete a SavedView in a container's synced `views[]` sidecar.
// (View SELECTION is the per-machine activeViews pointer above; this is the view DEFINITION.)
type ResolvedViewContainer =
  | { ok: true; folder: string; kind: 'collection' | 'set' }
  | { ok: false; error: string }
async function resolveViewContainer(
  containerPath: unknown,
  kind: unknown,
): Promise<ResolvedViewContainer> {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof containerPath !== 'string')
    return { ok: false, error: 'A container path is required.' }
  if (kind !== 'collection' && kind !== 'set')
    return { ok: false, error: 'kind must be "collection" or "set".' }
  const resolved = await resolveUnderRoot(root, containerPath)
  if (!resolved.ok) return { ok: false, error: resolved.error.message }
  return { ok: true, folder: resolved.value, kind }
}
handleEnvelope(
  'views:save',
  async (
    containerPath: unknown,
    kind: unknown,
    view: unknown,
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    const parsed = savedView.safeParse(view)
    if (!parsed.success) return { ok: false, error: 'Invalid view payload.' }
    const r = await serializeOnFile(c.folder, () => saveView(c.folder, c.kind, parsed.data))
    return r.ok ? { ok: true, id: r.value.id } : { ok: false, error: r.error.message }
  },
)
handleEnvelope(
  'views:reorder',
  async (containerPath: unknown, kind: unknown, orderedIds: unknown): Promise<Ack> => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (!Array.isArray(orderedIds) || !orderedIds.every((x) => typeof x === 'string')) {
      return { ok: false, error: 'orderedIds must be a string array.' }
    }
    const r = await serializeOnFile(c.folder, () => reorderViews(c.folder, c.kind, orderedIds))
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)
handleEnvelope(
  'views:delete',
  async (containerPath: unknown, kind: unknown, viewId: unknown): Promise<Ack> => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (typeof viewId !== 'string') return { ok: false, error: 'A view id is required.' }
    const r = await serializeOnFile(c.folder, () => deleteView(c.folder, c.kind, viewId))
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

// Per-container non-view settings (open_in / view_button / view_style) — the synced sidecar write
// behind the ViewDropdown context menu + the Configuration/Open In row. Serialized like the view writes.
handleEnvelope(
  'container:configure',
  async (containerPath: unknown, kind: unknown, patch: unknown): Promise<Ack> => {
    const c = await resolveViewContainer(containerPath, kind)
    if (!c.ok) return c
    if (patch === null || typeof patch !== 'object')
      return { ok: false, error: 'A config patch is required.' }
    const r = await serializeOnFile(c.folder, () =>
      setContainerConfig(c.folder, c.kind, patch as ContainerConfigPatch),
    )
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

// Batch frontmatter read for a container's view pipeline (pageId → frontmatter), lazy on open.
ipcMain.handle(
  'view:loadValues',
  async (_e, containerPath: unknown): Promise<Record<string, PageFrontmatter>> => {
    const root = sessionRoot()
    if (root === null || typeof containerPath !== 'string') return {}
    const resolved = await resolveUnderRoot(root, containerPath)
    if (!resolved.ok) return {}
    return loadValues(root, containerPath)
  },
)

// Registry+assignment-backed: defs live nexus-wide in `.nexus/properties.json`; a Collection's
// sidecar holds the assigned prop-ids. Keeps its pre-V2 names/args so the renderer is untouched —
// add = create-in-registry + assign, rename/changeType = global def edit, delete = Remove (strip
// values + cache restorably on the sidecar; the word Delete means property:delete only), reorder =
// assignment-order move, assign = append + restore-from-cache. containerPath is the schema-owning
// Collection's folder — a Set inherits the schema, so the renderer passes the ancestor's path.
async function resolveSchemaFolder(
  containerPath: unknown,
): Promise<{ ok: true; root: string; folder: string } | { ok: false; error: string }> {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof containerPath !== 'string')
    return { ok: false, error: 'A container path is required.' }
  const resolved = await resolveUnderRoot(root, containerPath)
  return resolved.ok
    ? { ok: true, root, folder: resolved.value }
    : { ok: false, error: resolved.error.message }
}

handleEnvelope(
  'schema:add',
  async (
    containerPath: unknown,
    def: unknown,
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    const parsed = propertyDefinition.safeParse(def)
    if (!parsed.success) return { ok: false, error: 'Invalid property definition.' }
    const created = await createProperty(c.root, parsed.data)
    if (!created.ok) return { ok: false, error: created.error.message }
    const assigned = await assignProperty(c.root, c.folder, created.value.id)
    if (!assigned.ok) {
      // Don't orphan the just-created def in the registry when the assign leg fails.
      await removeFromRegistry(c.root, created.value.id)
      return { ok: false, error: assigned.error.message }
    }
    return { ok: true, id: created.value.id }
  },
)

handleEnvelope(
  'schema:rename',
  async (containerPath: unknown, propertyId: unknown, newName: unknown): Promise<Ack> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string' || typeof newName !== 'string') {
      return { ok: false, error: 'propertyId and newName must be strings.' }
    }
    const r = await editProperty(c.root, propertyId, { name: newName })
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'schema:reorder',
  async (containerPath: unknown, propertyId: unknown, toIndex: unknown): Promise<Ack> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string' || typeof toIndex !== 'number') {
      return { ok: false, error: 'propertyId (string) and toIndex (number) are required.' }
    }
    const r = await reorderAssignment(c.folder, propertyId, toIndex)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'schema:delete',
  async (containerPath: unknown, propertyId: unknown): Promise<Ack> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    const r = await removeProperty(c.folder, propertyId)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'schema:assign',
  async (containerPath: unknown, propertyId: unknown, toIndex: unknown): Promise<Ack> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    // One chain slot covers a drag-assign: append + restore + slot placement land atomically.
    const r = await assignPropertyAt(
      c.root,
      c.folder,
      propertyId,
      typeof toIndex === 'number' ? toIndex : undefined,
    )
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope('registry:reorder', async (propertyId: unknown, toIndex: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof propertyId !== 'string' || typeof toIndex !== 'number') {
    return { ok: false, error: 'propertyId (string) and toIndex (number) are required.' }
  }
  const r = await reorderRegistry(root, propertyId, toIndex)
  return r.ok ? { ok: true } : { ok: false, error: r.error.message }
})

handleEnvelope(
  'schema:changeType',
  async (
    containerPath: unknown,
    propertyId: unknown,
    newType: unknown,
    opts: unknown,
  ): Promise<Ack> => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    const parsedType = propertyType.safeParse(newType)
    if (!parsedType.success) return { ok: false, error: 'Invalid property type.' }
    // V2: a global def edit — values keep their old shape until the lossy cross-assigner
    // strip lands with the assign-surface UI (opts.dropConflictingValues is accepted, unused).
    void opts
    const r = await editProperty(c.root, propertyId, { type: parsedType.data })
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

// Snapshot to .trash, strip the value across every assigner, drop the def + all assignments.
// The rare destructive op; unassign is the daily path.
handleEnvelope('property:delete', async (propertyId: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
  const r = await deletePropertyGlobal(root, propertyId)
  return r.ok ? { ok: true } : { ok: false, error: r.error.message }
})

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

handleEnvelope(
  'property:setOptions',
  async (propertyId: unknown, options: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    if (!isOptionArray(options))
      return { ok: false, error: 'Options must be an array of { value, label }.' }
    const r = await setOptions(root, propertyId, options)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:setStatusGroups',
  async (propertyId: unknown, groups: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    if (!Array.isArray(groups)) return { ok: false, error: 'Status groups must be an array.' }
    const r = await setStatusGroups(root, propertyId, groups as StatusGroup[])
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:setLinkConfig',
  async (propertyId: unknown, patch: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    if (patch === null || typeof patch !== 'object')
      return { ok: false, error: 'A config patch is required.' }
    // Whitelist only the link display fields — a config write must not patch arbitrary def fields
    // (type, options, id) through here. Registry-only: display config doesn't touch page values.
    const p = patch as Record<string, unknown>
    const changes: {
      link_underline?: boolean
      link_display?: 'link-url' | 'link-title'
      link_color?: string
    } = {}
    if (typeof p.link_underline === 'boolean') changes.link_underline = p.link_underline
    if (p.link_display === 'link-url' || p.link_display === 'link-title')
      changes.link_display = p.link_display
    if ('link_color' in p)
      changes.link_color = typeof p.link_color === 'string' ? p.link_color : undefined
    const r = await editProperty(root, propertyId, changes)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:setCheckboxColor',
  async (propertyId: unknown, color: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    // The def-level color is the ONLY field this writes — a non-string clears it to Default (the
    // system accent). Registry-only: display config never touches page values.
    const r = await editProperty(root, propertyId, {
      checkbox_color: typeof color === 'string' ? color : undefined,
    })
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope('property:setIcon', async (propertyId: unknown, icon: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
  // Registry-only: the def's symbol id (a non-string clears it to the type's default glyph).
  const r = await editProperty(root, propertyId, {
    icon: typeof icon === 'string' ? icon : undefined,
  })
  return r.ok ? { ok: true } : { ok: false, error: r.error.message }
})

handleEnvelope(
  'property:setNumberFormat',
  async (propertyId: unknown, patch: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string') return { ok: false, error: 'A property id is required.' }
    if (patch === null || typeof patch !== 'object')
      return { ok: false, error: 'A config patch is required.' }
    // Whitelist ONLY the number format fields — a config write must not patch arbitrary def fields
    // (type, options, id). Registry-only: display config never touches page values. An `in p` check
    // lets a caller clear a field by passing undefined.
    const p = patch as Record<string, unknown>
    const changes: Record<string, unknown> = {}
    if ('number_family' in p)
      changes.number_family = typeof p.number_family === 'string' ? p.number_family : undefined
    if ('number_currency' in p)
      changes.number_currency =
        typeof p.number_currency === 'string' ? p.number_currency : undefined
    if ('number_separators' in p)
      changes.number_separators =
        typeof p.number_separators === 'boolean' ? p.number_separators : undefined
    if ('number_decimals' in p)
      changes.number_decimals =
        p.number_decimals === 'hidden' || typeof p.number_decimals === 'number'
          ? p.number_decimals
          : undefined
    if ('number_fraction' in p)
      changes.number_fraction =
        typeof p.number_fraction === 'boolean' ? p.number_fraction : undefined
    if ('number_denominator' in p)
      changes.number_denominator =
        typeof p.number_denominator === 'number' ? p.number_denominator : undefined
    const r = await editProperty(root, propertyId, changes)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:renameOption',
  async (propertyId: unknown, oldValue: unknown, newTitle: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (
      typeof propertyId !== 'string' ||
      typeof oldValue !== 'string' ||
      typeof newTitle !== 'string'
    ) {
      return { ok: false, error: 'propertyId, oldValue, and newTitle are required.' }
    }
    const r = await renameOption(root, propertyId, oldValue, newTitle)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:removeOption',
  async (propertyId: unknown, value: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string' || typeof value !== 'string') {
      return { ok: false, error: 'A property id and value are required.' }
    }
    const r = await removeOption(root, propertyId, value)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:clearOption',
  async (propertyId: unknown, value: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string' || typeof value !== 'string') {
      return { ok: false, error: 'A property id and value are required.' }
    }
    const r = await clearOption(root, propertyId, value)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:renameStatusOption',
  async (propertyId: unknown, oldValue: unknown, newTitle: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (
      typeof propertyId !== 'string' ||
      typeof oldValue !== 'string' ||
      typeof newTitle !== 'string'
    ) {
      return { ok: false, error: 'propertyId, oldValue, and newTitle are required.' }
    }
    const r = await renameStatusOption(root, propertyId, oldValue, newTitle)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:removeStatusOption',
  async (propertyId: unknown, value: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string' || typeof value !== 'string') {
      return { ok: false, error: 'A property id and value are required.' }
    }
    const r = await removeStatusOption(root, propertyId, value)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)

handleEnvelope(
  'property:clearStatusOption',
  async (propertyId: unknown, value: unknown): Promise<Ack> => {
    const root = sessionRoot()
    if (root === null) return { ok: false, error: 'No nexus is open.' }
    if (typeof propertyId !== 'string' || typeof value !== 'string') {
      return { ok: false, error: 'A property id and value are required.' }
    }
    const r = await clearStatusOption(root, propertyId, value)
    return r.ok ? { ok: true } : { ok: false, error: r.error.message }
  },
)


// Subfield (footer) config — a React-owned `subfield` foreign key in `.nexus/settings.json`.
ipcMain.handle('subfield:get', async (): Promise<SubfieldConfig | null> => {
  const root = sessionRoot()
  return root === null ? null : readSubfield(root)
})
handleEnvelope('subfield:set', async (config: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (!config || typeof config !== 'object') return { ok: false, error: 'Invalid subfield config.' }
  await writeSubfield(root, config as SubfieldConfig)
  return { ok: true }
})

// Nav view modes (List/Gallery per surface) — a React-owned `navViewModes` foreign key.
ipcMain.handle('navViewModes:get', async (): Promise<NavViewModes | null> => {
  const root = sessionRoot()
  return root === null ? null : readNavViewModes(root)
})
handleEnvelope('navViewModes:set', async (modes: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (!modes || typeof modes !== 'object') return { ok: false, error: 'Invalid nav view modes.' }
  await writeNavViewModes(root, modes as NavViewModes)
  return { ok: true }
})

// The block document — a targeted per-host load + locked partial writes on the host's
// config (homepage.json for the dev host), never woven into the tree walk.
handleEnvelope('blocks:get', async (host: unknown): Promise<BlocksGetResult> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  const h = coerceBlockHost(host)
  if (!h) return { ok: false, error: 'Unknown block host.' }
  return { ok: true, doc: await readBlockDoc(root, h) }
})
handleEnvelope('blocks:save', async (host: unknown, patch: unknown): Promise<BlocksSaveResult> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  const h = coerceBlockHost(host)
  if (!h) return { ok: false, error: 'Unknown block host.' }
  if (!patch || typeof patch !== 'object') return { ok: false, error: 'Invalid block-doc patch.' }
  const problem = blockPatchProblem(patch as BlockDocPatch)
  if (problem) return { ok: false, error: problem }
  await writeBlockDoc(root, h, patch as BlockDocPatch)
  return { ok: true }
})

// Markdown-block file ops. Tile ids gate on isUlid — the id becomes a filename, so a
// renderer-supplied value must never carry path segments.
const blockHostAnd = (
  host: unknown,
  tileId?: unknown,
): { root: string; h: BlockHostRef } | string => {
  const root = sessionRoot()
  if (root === null) return 'No nexus is open.'
  const h = coerceBlockHost(host)
  if (!h) return 'Unknown block host.'
  if (tileId !== undefined && (typeof tileId !== 'string' || !isUlid(tileId)))
    return 'Invalid tile id.'
  return { root, h }
}
handleEnvelope(
  'blocks:createMarkdown',
  async (host: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const ctx = blockHostAnd(host)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    return { ok: true, id: await createMarkdownBlock(ctx.root, ctx.h) }
  },
)
handleEnvelope(
  'blocks:removeTile',
  async (host: unknown, tileId: unknown): Promise<BlocksSaveResult> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    await removeBlockTile(ctx.root, ctx.h, tileId as string)
    return { ok: true }
  },
)
handleEnvelope(
  'blocks:readMarkdown',
  async (
    host: unknown,
    tileId: unknown,
  ): Promise<{ ok: true; body: string } | { ok: false; error: string }> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    const body = await readMarkdownBlock(ctx.root, ctx.h, tileId as string)
    return body === null ? { ok: false, error: 'Block file not found.' } : { ok: true, body }
  },
)
handleEnvelope(
  'blocks:writeMarkdown',
  async (host: unknown, tileId: unknown, body: unknown): Promise<BlocksSaveResult> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    if (typeof body !== 'string') return { ok: false, error: 'Body must be a string.' }
    await writeMarkdownBlock(ctx.root, ctx.h, tileId as string, body)
    return { ok: true }
  },
)
handleEnvelope(
  'blocks:convertToPage',
  async (host: unknown, tileId: unknown, pageId: unknown): Promise<BlocksSaveResult> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    if (typeof pageId !== 'string' || pageId.length === 0)
      return { ok: false, error: 'Invalid page id.' }
    await convertTileToPage(ctx.root, ctx.h, tileId as string, pageId)
    return { ok: true }
  },
)
handleEnvelope(
  'blocks:convertToView',
  async (host: unknown, tileId: unknown, views: unknown): Promise<BlocksSaveResult> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    const list = Array.isArray(views) ? views : null
    const valid =
      list?.length &&
      list.every((v) => typeof (v as { source_id?: unknown })?.source_id === 'string')
    if (!valid) return { ok: false, error: 'Invalid view list.' }
    await convertTileToView(ctx.root, ctx.h, tileId as string, list as unknown[])
    return { ok: true }
  },
)
handleEnvelope(
  'blocks:duplicateTile',
  async (
    host: unknown,
    tileId: unknown,
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    const ctx = blockHostAnd(host, tileId)
    if (typeof ctx === 'string') return { ok: false, error: ctx }
    const id = await duplicateBlockTile(ctx.root, ctx.h, tileId as string)
    return id ? { ok: true, id } : { ok: false, error: 'No such tile.' }
  },
)
// Delete keeps the native confirm (Nathan's call) — the in-app menu asks main first.
ipcMain.handle('blocks:confirmRemove', async (e): Promise<boolean> => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return false
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Remove', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    message: 'Remove this block?',
    detail:
      'A markdown block\u2019s file moves to the nexus\u2019s .trash (recoverable); embeds only remove the tile.',
  })
  return response === 0
})

// Merged one key at a time into the React-owned `personalization` object in `.nexus/settings.json`;
// the value is validated on read.
handleEnvelope('personalization:set', async (key: unknown, value: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof key !== 'string' || !key) return { ok: false, error: 'Invalid personalization key.' }
  await writePersonalization(root, key, value)
  return { ok: true }
})

// Pushed here so the native context menu (editorMenu.ts) can render accurate checkmarks/radios.
ipcMain.on('editor:format-state', (_e, state: FormatState) => setFormatState(state))

// The JS window mover (hover-bearing chrome can't be a native drag region — it'd lose hover).
ipcMain.on('win:dragBy', (e, dx: number, dy: number) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || typeof dx !== 'number' || typeof dy !== 'number') return
  const [x, y] = win.getPosition()
  win.setPosition(Math.round(x + dx), Math.round(y + dy))
})
ipcMain.on('win:zoom', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})

// Flagged on hover so the generic editor menu stands down and the renderer's own Delete
// Callout menu is the only one that pops on the right-press.
ipcMain.on('editor:callout-grip', (_e, on: boolean) => setCalloutGrip(on))

// The Electron-side bits the write orchestration needs: trashMode from app config +
// system-trash injected. Shared by the mutate IPC + the native context menu.
async function mutateDeps(): Promise<MutateDeps> {
  const config = await readAppConfig(app.getPath('userData'))
  return {
    trashMode: config.trashMode ?? DEFAULT_TRASH_MODE,
    trashToSystem: (p) => shell.trashItem(p),
  }
}

// The single write path — main resolves the request under the session root, runs the
// orchestration, and best-effort refreshes the index.
ipcMain.handle(
  'mutate',
  async (_e, req: MutateRequest): Promise<MutateResult> => handleMutate(req, await mutateDeps()),
)

// A right-clicked sidebar entity's menu; its items act main-side (handleMutate / confirm /
// Finder) and signal the renderer to refetch on change.
ipcMain.handle('context-menu', async (e, target: ContextTarget): Promise<void> => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  await showContextMenu(win, target, await mutateDeps(), () => {
    if (!win.isDestroyed()) win.webContents.send('menu:action', 'reload-state')
  })
})

// The section-header "+" menu (New Area/Topic/Project). Resolves with the picked request (null
// when dismissed) — the renderer's store runs it, riding the same one-write-path +
// optimistic-insert flow as every other mutation, instead of forcing a full reload here.
handleWindowMenu(
  'create-menu',
  async (
    win: BrowserWindow,
    items: { label: string; req: MutateRequest }[],
  ): Promise<MutateRequest | null> => {
    return new Promise((resolve) => {
      // Settle-once, click first: a pick resolves immediately, and the close callback defers a
      // tick before resolving null — so no assumption about Electron's click-vs-close ordering
      // can hang the promise or drop a pick.
      let settled = false
      const done = (req: MutateRequest | null): void => {
        if (settled) return
        settled = true
        resolve(req)
      }
      const menu = Menu.buildFromTemplate(
        items.map((it) => ({ label: it.label, click: () => done(it.req) })),
      )
      menu.popup({ window: win, callback: () => setTimeout(() => done(null), 0) })
    })
  },
)

// Renderer-initiated mutations (e.g. New Page ⌘N) have no native dialog of their own,
// unlike the context menu.
ipcMain.handle('error:show', async (e, message: unknown): Promise<void> => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win && typeof message === 'string') {
    await dialog.showMessageBox(win, {
      type: 'error',
      message: 'Couldn’t complete that action.',
      detail: message,
    })
  }
})

// Open an external markdown link in the OS default app. Invalid links (same check that dims them in
// the editor) are rejected — the renderer never opens links itself.
ipcMain.handle('link:open', async (_e, url: unknown): Promise<void> => {
  if (typeof url !== 'string' || !isValidLink(url)) return
  await shell.openExternal(normalizeLinkUrl(url))
})

// `get` hydrates the renderer's store on open (whole cached map); `fetch` resolves one URL
// (cache hit or a live network fetch), persisting successes to `.nexus/linkTitles.json`.
ipcMain.handle('linkTitles:get', async (): Promise<LinkTitleCache> => {
  const root = sessionRoot()
  return root ? getTitleCache(root) : {}
})
handleEnvelope(
  'linkTitles:fetch',
  async (
    url: unknown,
  ): Promise<{ ok: true; title: string | null } | { ok: false; error: string }> => {
    if (typeof url !== 'string') return { ok: false, error: 'invalid url' }
    const root = sessionRoot()
    if (!root) return { ok: false, error: 'no nexus open' }
    return { ok: true, title: await resolveTitle(root, url) }
  },
)

// The OS accent (macOS 10.14+), for accent === 'system'. Electron returns
// RRGGBBAA; surface just the RGB as '#RRGGBB'. null when unsupported/unavailable.
ipcMain.handle('theme:systemAccent', (): string | null => {
  try {
    const c = systemPreferences.getAccentColor?.()
    return c ? `#${c.slice(0, 6)}` : null
  } catch {
    return null
  }
})

// The one owner of "pick an image file"; reuses ASSET_MIME for the ext→mime mapping.
const IMAGE_EXTS = Object.keys(ASSET_MIME).map((e) => e.slice(1))
async function pickImageDataUrl(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTS }],
  })
  if (result.canceled || !result.filePaths[0]) return null
  try {
    const p = result.filePaths[0]
    const buf = await readFile(p)
    const mime = ASSET_MIME[extname(p).toLowerCase()] ?? 'application/octet-stream'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

// Resolves the picked action to the renderer, which performs the container-config write;
// the renderer supplies the current values for the checkmarks.
handleWindowMenu(
  'view-button-menu',
  async (win: BrowserWindow, current: unknown): Promise<ViewButtonMenuAction | null> => {
    const c = current as { viewButton?: unknown; viewStyle?: unknown } | null
    const viewButton: ViewButton = c?.viewButton === 'labeled' ? 'labeled' : 'icon'
    const viewStyle: ViewStyle = c?.viewStyle === 'toolbar' ? 'toolbar' : 'dropdown'
    return popViewButtonMenu(win, { viewButton, viewStyle })
  },
)

// The Space settings pane's (Icon)(Title) row right-click menu.
handleWindowMenu(
  'space-header-menu',
  async (win: BrowserWindow): Promise<'change-color' | null> => {
    return popReturningMenu<'change-color'>(win, (pick) => [
      { label: 'Change Color', click: pick('change-color') },
    ])
  },
)

// The view embed's title-row right-click menu (Hide/Show Icon · Title Size · Hide Title).
handleWindowMenu(
  'view-embed-title-menu',
  async (win: BrowserWindow, arg: unknown): Promise<EmbedTitleMenuAction | null> => {
    const a = arg as { iconShown?: unknown; level?: unknown } | null
    const level = typeof a?.level === 'number' && a.level >= 1 && a.level <= 6 ? a.level : 4
    return popEmbedTitleMenu(win, a?.iconShown === true, level)
  },
)

// The view embed switcher area's right-click menu (Hide/Show Titles · New View · Style).
handleWindowMenu(
  'view-embed-area-menu',
  async (win: BrowserWindow, current: unknown): Promise<EmbedAreaMenuAction | null> => {
    const c = current as { viewButton?: unknown; viewStyle?: unknown; titleShown?: unknown } | null
    return popEmbedAreaMenu(win, {
      viewButton: c?.viewButton === 'icon' ? 'icon' : 'labeled',
      viewStyle: c?.viewStyle === 'dropdown' ? 'dropdown' : 'toolbar',
      titleShown: c?.titleShown !== false,
    })
  },
)

// The ViewSettings ⋮ menu (Duplicate / Delete) — resolves the action to the renderer.
handleWindowMenu(
  'view-item-menu',
  async (win: BrowserWindow, canDelete: unknown): Promise<ViewItemMenuAction | null> => {
    return popViewItemMenu(win, { canDelete: canDelete === true })
  },
)

// A ViewPane view row's right-click menu (Rename / Edit Icon / Delete).
handleWindowMenu(
  'view-row-menu',
  async (win: BrowserWindow, canDelete: unknown): Promise<ViewRowMenuAction | null> => {
    return popViewRowMenu(win, { canDelete: canDelete === true })
  },
)

// The icon picker's right-click Favorite menu — resolves 'toggle' to the renderer, which owns
// the favoriteIcons write.
handleWindowMenu(
  'icon-favorite-menu',
  async (win: BrowserWindow, favorited: unknown): Promise<'toggle' | null> => {
    return popIconFavoriteMenu(win, favorited === true)
  },
)

// The nexus identity icon menu (Change Icon → the renderer's glyph picker; Add/Change Photo → the native
// image pick, done renderer-side). Returns the chosen action; the renderer runs the picker/pick + mutate.
type NexusIconAction = 'changeIcon' | 'addPhoto' | 'removePhoto' | 'removeIcon'
handleWindowMenu(
  'nexus:iconMenu',
  async (win: BrowserWindow, arg: unknown): Promise<NexusIconAction | null> => {
    const opts = (arg ?? {}) as { hasPhoto?: boolean; hasGlyph?: boolean }
    return await new Promise<NexusIconAction | null>((resolve) => {
      let acted = false
      const pick = (v: NexusIconAction) => () => {
        acted = true
        resolve(v)
      }
      const menu = Menu.buildFromTemplate([
        { label: 'Change Icon', click: pick('changeIcon') },
        { label: opts.hasPhoto ? 'Change Photo' : 'Add Photo', click: pick('addPhoto') },
        ...(opts.hasPhoto || opts.hasGlyph ? [{ type: 'separator' as const }] : []),
        ...(opts.hasPhoto ? [{ label: 'Remove Photo', click: pick('removePhoto') }] : []),
        ...(opts.hasGlyph ? [{ label: 'Remove Icon', click: pick('removeIcon') }] : []),
      ])
      menu.popup({
        window: win,
        callback: () => {
          if (!acted) resolve(null)
        },
      })
    })
  },
)

// The banner's Add/Change affordances use this directly (the photo's "Add Photo" menu wraps
// the same picker).
handleWindowMenu('nexus:pickImage', async (win: BrowserWindow): Promise<string | null> => {
  return pickImageDataUrl(win)
})

// Change/Remove for an existing image, a single Add item when `add`. The noun follows the
// surface's vocabulary (Banner by default; the cards' Cover-mode thumb passes "Cover").
// Add resolves 'change' (both routes open the image picker).
handleWindowMenu(
  'nexus:bannerMenu',
  async (
    win: BrowserWindow,
    opts?: { noRemove?: boolean; noun?: string; add?: boolean },
  ): Promise<'change' | 'remove' | null> => {
    const noun = opts?.noun ?? 'Banner'
    return await new Promise<'change' | 'remove' | null>((resolve) => {
      let acted = false
      const choose = (action: 'change' | 'remove'): void => {
        acted = true
        resolve(action)
      }
      const menu = Menu.buildFromTemplate(
        opts?.add
          ? [{ label: `Add ${noun}`, click: () => choose('change') }]
          : [
              { label: `Change ${noun}`, click: () => choose('change') },
              ...(opts?.noRemove
                ? []
                : [{ label: `Remove ${noun}`, click: () => choose('remove') }]),
            ],
      )
      menu.popup({
        window: win,
        callback: () => {
          if (!acted) resolve(null)
        },
      })
    })
  },
)

// Rename is always offered; Change Icon unless `noEditIcon` (the homepage sets its icon from
// the settings pane, not here); `toggleIcon` adds the Hide/Show Icon item.
type TitleMenuAction = 'rename' | 'editIcon' | 'toggleIcon'
handleWindowMenu(
  'nexus:titleMenu',
  async (win: BrowserWindow, arg: unknown): Promise<TitleMenuAction | null> => {
    const opts = (arg ?? {}) as { toggleIcon?: boolean; iconHidden?: boolean; noEditIcon?: boolean }
    return await new Promise<TitleMenuAction | null>((resolve) => {
      let acted = false
      const choose = (action: TitleMenuAction) => () => {
        acted = true
        resolve(action)
      }
      const menu = Menu.buildFromTemplate([
        { label: 'Rename', click: choose('rename') },
        ...(opts.noEditIcon ? [] : [{ label: 'Change Icon', click: choose('editIcon') }]),
        ...(opts.toggleIcon
          ? [{ label: opts.iconHidden ? 'Show Icon' : 'Hide Icon', click: choose('toggleIcon') }]
          : []),
      ])
      menu.popup({
        window: win,
        callback: () => {
          if (!acted) resolve(null)
        },
      })
    })
  },
)

// The table grip's right-click menu.
handleWindowMenu('table-menu', async (win: BrowserWindow, ctx: TableMenuContext) => {
  return popTableMenu(win, ctx)
})

// The callout grip's right-click menu.
handleWindowMenu('callout-menu', async (win: BrowserWindow) => {
  return popCalloutMenu(win)
})

// The table-view column header's right-click menu.
handleWindowMenu('column-menu', async (win: BrowserWindow, ctx: ColumnMenuContext) => {
  return popColumnMenu(win, ctx)
})

// A table cell's right-click menu (title meta / per-type Style / Edit).
handleWindowMenu('cell-menu', async (win: BrowserWindow, ctx: CellMenuContext) => {
  return popCellMenu(win, ctx)
})

// A card's right-click menu (page meta + Add Property ▸).
handleWindowMenu('card-menu', async (win: BrowserWindow, ctx: CardMenuContext) => {
  return popCardMenu(win, ctx)
})

// A tab's right-click menu (Pin/Unpin · Close · Close to the Right).
handleWindowMenu('tab-menu', async (win: BrowserWindow, ctx: TabMenuContext) => {
  return isPlainObject(ctx) ? popTabMenu(win, ctx as unknown as TabMenuContext) : null
})

// A NavWindow row/card's right-click menu.
handleWindowMenu('nav-row-menu', async (win: BrowserWindow, ctx: NavRowMenuContext) => {
  return isPlainObject(ctx) ? popNavRowMenu(win, ctx as unknown as NavRowMenuContext) : null
})

// A wikilink's right-click menu (Open in Preview).
handleWindowMenu('conn-menu', async (win: BrowserWindow) => {
  return popConnMenu(win)
})

handleWindowMenu('property-menu', async (win: BrowserWindow, ctx: PropertyMenuContext) => {
  return popPropertyMenu(win, ctx)
})

handleWindowMenu('option-menu', async (win: BrowserWindow, ctx: OptionMenuContext) => {
  return popOptionMenu(win, ctx)
})

// Open a page-attached file in its OS default app. The renderer-supplied path validates under the
// session root (resolveUnderRoot) — a `..` climb or symlink smuggle never reaches shell.openPath.
ipcMain.handle('file:open', async (_e, relPath: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (!root) return { ok: false, error: 'No open nexus.' }
  const r = await resolveUnderRoot(root, relPath)
  if (!r.ok) return { ok: false, error: r.error.message }
  const err = await shell.openPath(r.value)
  return err ? { ok: false, error: err } : { ok: true }
})

// Rename the OPEN nexus's ROOT folder within its parent dir, then RE-POINT the live session
// to the new path. A dedicated IPC (not a mutate op) because it re-targets the whole session:
// after the fs.rename, adoptNexus re-opens the session, index, watcher, and recents at the new
// path. Never throws across the boundary.
handleEnvelope('nexus:rename', async (newName: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (root === null) return { ok: false, error: 'No nexus is open.' }
  if (typeof newName !== 'string') return { ok: false, error: 'A name is required.' }
  const trimmed = newName.trim()
  if (trimmed.length === 0) return { ok: false, error: 'The name can’t be empty.' }
  if (trimmed.includes('/') || trimmed.includes('\\'))
    return { ok: false, error: 'The name can’t contain a slash.' }
  if (trimmed === basename(root)) return { ok: false, error: 'That’s already the nexus name.' }
  const newRoot = join(dirname(root), trimmed)
  if (await pathExists(newRoot))
    return { ok: false, error: 'A folder with that name already exists.' }
  await rename(root, newRoot)
  // RE-POINT: adoptNexus does exactly the re-target work (openSession + openSessionDb +
  // startWatcher + lastNexusPath/recents + addRecentDocument + refreshMenu) with no
  // adoption-only side effects to skip, so reuse it rather than replicate the calls.
  await adoptNexus(newRoot)
  return { ok: true }
})

app
  .whenReady()
  .then(async () => {
    // Restore the last nexus if it's still an existing directory; otherwise launch
    // empty. No picker/modal here — a launch must never block (headless / tests).
    // Restore failures degrade to empty state (never fatal); only a failure to
    // create the window reaches the fatal .catch below.
    try {
      const config = await readAppConfig(app.getPath('userData'))
      const restore = await resolveRestorePath(config)
      if (restore) {
        await openSession(restore)
        const root = sessionRoot() ?? restore
        await prepareOpenedNexus(root)
        await replayPendingRename(root)
        openSessionDb(root)
      }
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
// the WAL and frees its sibling files. Favorites are the one operational write still going to
// disk, so they are the one thing that can still be owed: defer the quit, settle it, re-quit.
let flushingBeforeQuit = false
app.on('before-quit', (e) => {
  if (flushingBeforeQuit) return
  stopWatcher()
  if (!hasPendingFavorites()) {
    closeSessionDb()
    return
  }
  e.preventDefault()
  flushingBeforeQuit = true
  void flushFavorites().then(() => {
    closeSessionDb()
    app.quit()
  })
})
