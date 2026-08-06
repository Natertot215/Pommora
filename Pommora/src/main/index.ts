import {
  app,
  BrowserWindow,
  dialog,
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
  HoverCardSize,
  NavigationState,
  NavViewModes,
  NexusState,
  SubfieldConfig,
  ThumbRect,
} from '@shared/types'
import { isPlainObject } from '@shared/propertyValue'
import { errText, fail, ok, type Result } from '@shared/result'
import { BUSY, NO_NEXUS, push, scopeGet, scopeSet, serveBridge } from './ipc'
import type { MutateRequest, ContextTarget } from '@shared/mutate'
import { WINDOW_BG } from '@shared/theme'
import { readNexus } from './readNexus'
import { runOpenRecord } from './record'
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
} from '@shared/blocks'
import { pathExists } from './io/atomicWrite'
import { readAppConfig, writeAppConfig, addRecent, DEFAULT_TRASH_MODE } from './appConfig'
import { sessionRoot, openSession, resolveRestorePath, isExistingDir } from './session'
import { serializeOnFile } from './io/fileLock'
import { openSessionDb, closeSessionDb, sessionDb } from './sessionDb'
import { stampAdopted } from './adopt'
import { ensureIdentity } from './identity'
import { ensureContextsRegistry } from './contextsRegistry'
import {
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
  flushNavigation,
  hasPendingNavigation,
  readNavigationState,
  writeNavigationState,
} from './io/navigationFile'
import { readTabsState, sanitizeTabSet, writeTabsState } from './io/tabsState'
import { readValue, writeValue } from './db/localState'
import { readPreviewsState, sanitizePreviews, writePreviewsState } from './io/previewState'
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
import { popCalloutMenu } from './calloutMenu'
import { popEmbedMenu } from './embedMenu'
import { popColumnMenu } from './columnMenu'
import { popCellMenu } from './cellMenu'
import { popCardMenu } from './cardMenu'
import { popConnMenu } from './connMenu'
import { popTabMenu } from './tabMenu'
import type { TabMenuContext } from '@shared/tabMenu'
import { popNavRowMenu } from './navRowMenu'
import type { NavRowMenuContext } from '@shared/navRowMenu'
import { popPropertyMenu } from './propertyMenu'
import { popOptionMenu } from './optionMenu'
import { popIconFavoriteMenu } from './iconFavoriteMenu'
import { popViewButtonMenu } from './viewButtonMenu'
import { popReturningMenu } from './returningMenu'
import { popEmbedTitleMenu, popEmbedAreaMenu } from './viewEmbedMenu'
import { popViewItemMenu } from './viewItemMenu'
import { popViewRowMenu } from './viewRowMenu'
import type {
  EmbedAreaMenuAction,
  EmbedTitleMenuAction,
  ViewButtonMenuAction,
  ViewItemMenuAction,
  ViewRowMenuAction,
} from '@shared/viewMenus'
import type {
  BannerMenuAction,
  IconFavoriteMenuAction,
  NexusIconAction,
  SpaceHeaderMenuAction,
  TitleMenuAction,
} from '@shared/identityMenus'
import type { ViewButton, ViewStyle } from '@shared/types'
import { VIEW_SCALE_DEFAULT } from '@shared/types'
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

// Gallery thumbnails — capture the detail-pane rect on entity-open, evict on membership roll-off.
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

async function adoptNexusInner(path: string, latchRecord: boolean): Promise<void> {
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
  // the closed window left rather than whatever a sync daemon materializes first.
  if (latchRecord && root !== priorRoot) await runOpenRecord(root)
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
// add = create-in-registry + assign, rename/changeType = global def edit, delete = Remove (strip
// values + cache restorably on the sidecar; the word Delete means property:delete only), reorder =
// assignment-order move, assign = append + restore-from-cache. containerPath is the schema-owning
// Collection's folder — a Set inherits the schema, so the renderer passes the ancestor's path.
async function resolveSchemaFolder(
  containerPath: unknown,
): Promise<Result<{ root: string; folder: string }>> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  const resolved = await resolveUnderRoot(root, containerPath)
  return resolved.ok ? ok({ root, folder: resolved.value }) : resolved
}

// The bad-payload refusals more than one handler speaks — one spelling each, alongside the
// session refusals (NO_NEXUS / BUSY) the ipc module owns.
const NEEDS_PROPERTY_ID = fail('operation-failed', 'A property id is required.')
const NEEDS_ID_AND_VALUE = fail('operation-failed', 'A property id and value are required.')
const NEEDS_CONFIG_PATCH = fail('operation-failed', 'A config patch is required.')

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
  return {
    trashMode: config.trashMode ?? DEFAULT_TRASH_MODE,
    trashToSystem: (p) => shell.trashItem(p),
  }
}

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

serveBridge(
  {
    // The renderer's launch + post-change read. Empty status is not an error — just no nexus open.
    'nexus:state': {
      kind: 'raw',
      fn: async (): Promise<NexusState> => {
        const root = sessionRoot()
        if (root === null) return { status: 'empty' }
        try {
          const tree = await readNexus(root)
          return { status: 'open', tree }
        } catch (e) {
          return { status: 'error', error: errText(e) }
        }
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
      kind: 'raw',
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
      kind: 'raw',
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
      kind: 'raw',
      fn: (size: unknown) => {
        if (adopting()) return BUSY
        if (!isCardSize(size)) return fail('operation-failed', 'A card size needs finite w and h.')
        if (!writeValue('hoverCard', { w: size.w, h: size.h })) return NO_NEXUS
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
        // Under the page's file lock — the editor autosave and a link-rename cascade both rewrite
        // this page's body, so they must serialize rather than clobber each other.
        const r = await serializeOnFile(resolved.value, () => updatePageBody(resolved.value, body))
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

    'views:save': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, view: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        const parsed = savedView.safeParse(view)
        if (!parsed.success) return fail('operation-failed', 'Invalid view payload.')
        const { folder, kind: k } = c.value
        const r = await serializeOnFile(folder, () => saveView(folder, k, parsed.data))
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
        const r = await serializeOnFile(folder, () => reorderViews(folder, k, orderedIds))
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
        const r = await serializeOnFile(folder, () => deleteView(folder, k, viewId))
        return r.ok ? ok(null) : r
      },
    },

    // Per-container non-view settings (open_in / view_button / view_style) — the synced sidecar write
    // behind the ViewDropdown context menu + the Configuration/Open In row. Serialized like the view writes.
    'container:configure': {
      kind: 'envelope',
      fn: async (containerPath: unknown, kind: unknown, patch: unknown) => {
        const c = await resolveViewContainer(containerPath, kind)
        if (!c.ok) return c
        if (patch === null || typeof patch !== 'object') return NEEDS_CONFIG_PATCH
        const { folder, kind: k } = c.value
        const r = await serializeOnFile(folder, () =>
          setContainerConfig(folder, k, patch as ContainerConfigPatch),
        )
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
        return r.ok ? ok(null) : r
      },
    },

    'schema:changeType': {
      kind: 'envelope',
      fn: async (containerPath: unknown, propertyId: unknown, newType: unknown, opts: unknown) => {
        const c = await resolveSchemaFolder(containerPath)
        if (!c.ok) return c
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        const parsedType = propertyType.safeParse(newType)
        if (!parsedType.success) return fail('operation-failed', 'Invalid property type.')
        // V2: a global def edit — values keep their old shape until the lossy cross-assigner
        // strip lands with the assign-surface UI (opts.dropConflictingValues is accepted, unused).
        void opts
        const r = await editProperty(c.value.root, propertyId, { type: parsedType.data })
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
        return r.ok ? ok(null) : r
      },
    },

    'property:setLinkConfig': {
      kind: 'envelope',
      fn: async (propertyId: unknown, patch: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        if (patch === null || typeof patch !== 'object') return NEEDS_CONFIG_PATCH
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
        return r.ok ? ok(null) : r
      },
    },

    'property:setCheckboxColor': {
      kind: 'envelope',
      fn: async (propertyId: unknown, color: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        // The def-level color is the ONLY field this writes — a non-string clears it to Default (the
        // system accent). Registry-only: display config never touches page values.
        const r = await editProperty(root, propertyId, {
          checkbox_color: typeof color === 'string' ? color : undefined,
        })
        return r.ok ? ok(null) : r
      },
    },

    'property:setIcon': {
      kind: 'envelope',
      fn: async (propertyId: unknown, icon: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        // Registry-only: the def's symbol id (a non-string clears it to the type's default glyph).
        const r = await editProperty(root, propertyId, {
          icon: typeof icon === 'string' ? icon : undefined,
        })
        return r.ok ? ok(null) : r
      },
    },

    'property:setNumberFormat': {
      kind: 'envelope',
      fn: async (propertyId: unknown, patch: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
        if (patch === null || typeof patch !== 'object') return NEEDS_CONFIG_PATCH
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
        return r.ok ? ok(null) : r
      },
    },

    'property:renameOption': {
      kind: 'envelope',
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
        const r = await renameOption(root, propertyId, oldValue, newTitle)
        return r.ok ? ok(null) : r
      },
    },

    'property:removeOption': {
      kind: 'envelope',
      fn: async (propertyId: unknown, value: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
        const r = await removeOption(root, propertyId, value)
        return r.ok ? ok(null) : r
      },
    },

    'property:clearOption': {
      kind: 'envelope',
      fn: async (propertyId: unknown, value: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
        const r = await clearOption(root, propertyId, value)
        return r.ok ? ok(null) : r
      },
    },

    'property:renameStatusOption': {
      kind: 'envelope',
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
        const r = await renameStatusOption(root, propertyId, oldValue, newTitle)
        return r.ok ? ok(null) : r
      },
    },

    'property:removeStatusOption': {
      kind: 'envelope',
      fn: async (propertyId: unknown, value: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
        const r = await removeStatusOption(root, propertyId, value)
        return r.ok ? ok(null) : r
      },
    },

    'property:clearStatusOption': {
      kind: 'envelope',
      fn: async (propertyId: unknown, value: unknown) => {
        const root = sessionRoot()
        if (root === null) return NO_NEXUS
        if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
        const r = await clearStatusOption(root, propertyId, value)
        return r.ok ? ok(null) : r
      },
    },

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
        return ok({ id: await createMarkdownBlock(ctx.value.root, ctx.value.h) })
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
        const body = await readMarkdownBlock(ctx.value.root, ctx.value.h, tileId as string)
        return body === null ? fail('not-found', 'Block file not found.') : ok({ body })
      },
    },
    'blocks:writeMarkdown': {
      kind: 'envelope',
      fn: async (host: unknown, tileId: unknown, body: unknown) => {
        const ctx = blockHostAnd(host, tileId)
        if (!ctx.ok) return ctx
        if (typeof body !== 'string') return fail('operation-failed', 'Body must be a string.')
        await writeMarkdownBlock(ctx.value.root, ctx.value.h, tileId as string, body)
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
    // Delete keeps the native confirm (Nathan's call) — the in-app menu asks main first.
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
        return ok(null)
      },
    },

    // The single write path — main resolves the request under the session root and runs the
    // orchestration.
    mutate: {
      kind: 'raw',
      fn: async (req: MutateRequest) => handleMutate(req, await mutateDeps()),
    },

    // A right-clicked sidebar entity's menu; its items act main-side (handleMutate / confirm /
    // Finder) and signal the renderer to refetch on change.
    'context-menu': {
      kind: 'window',
      fn: async (win: BrowserWindow | null, target: ContextTarget): Promise<void> => {
        if (!win) return
        await showContextMenu(win, target, await mutateDeps(), () => {
          push(win, 'menu:action', 'reload-state')
        })
      },
    },

    // The section-header "+" menu (New Area/Topic/Project). Resolves with the picked request (null
    // when dismissed) — the renderer's store runs it, riding the same one-write-path +
    // optimistic-insert flow as every other mutation, instead of forcing a full reload here.
    'create-menu': {
      kind: 'menu',
      fn: async (
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
        const c = current as { viewButton?: unknown; viewStyle?: unknown } | null
        const viewButton: ViewButton = c?.viewButton === 'labeled' ? 'labeled' : 'icon'
        const viewStyle: ViewStyle = c?.viewStyle === 'toolbar' ? 'toolbar' : 'dropdown'
        return popViewButtonMenu(win, { viewButton, viewStyle })
      },
    },

    // The Space settings pane's (Icon)(Title) row right-click menu.
    'space-header-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow): Promise<SpaceHeaderMenuAction | null> => {
        return popReturningMenu<SpaceHeaderMenuAction>(win, (pick) => [
          { label: 'Change Color', click: pick('change-color') },
        ])
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

    // The ViewSettings ⋮ menu (Duplicate / Delete) — resolves the action to the renderer.
    'view-item-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, canDelete: unknown): Promise<ViewItemMenuAction | null> => {
        return popViewItemMenu(win, { canDelete: canDelete === true })
      },
    },

    // The per-view right-click menu (ViewPane rows + embed segments).
    'view-row-menu': {
      kind: 'menu',
      fn: async (
        win: BrowserWindow,
        canDelete: unknown,
        labeled: unknown,
      ): Promise<ViewRowMenuAction | null> => {
        return popViewRowMenu(win, {
          canDelete: canDelete === true,
          labeled: typeof labeled === 'boolean' ? labeled : undefined,
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

    // The nexus identity icon menu (Change Icon → the renderer's glyph picker; Add/Change Photo → the native
    // image pick, done renderer-side). Returns the chosen action; the renderer runs the picker/pick + mutate.
    'nexus:iconMenu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, arg: unknown): Promise<NexusIconAction | null> => {
        const opts = (arg ?? {}) as { hasPhoto?: boolean; hasGlyph?: boolean }
        return popReturningMenu<NexusIconAction>(win, (pick) => [
          { label: 'Change Icon', click: pick('changeIcon') },
          { label: opts.hasPhoto ? 'Change Photo' : 'Add Photo', click: pick('addPhoto') },
          ...(opts.hasPhoto || opts.hasGlyph ? [{ type: 'separator' as const }] : []),
          ...(opts.hasPhoto ? [{ label: 'Remove Photo', click: pick('removePhoto') }] : []),
          ...(opts.hasGlyph ? [{ label: 'Remove Icon', click: pick('removeIcon') }] : []),
        ])
      },
    },

    // The banner's Add/Change affordances use this directly (the photo's "Add Photo" menu wraps
    // the same picker).
    'nexus:pickImage': { kind: 'menu', fn: pickImageDataUrl },

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
                { label: `Change ${noun}`, click: pick('change') },
                ...(opts?.noRemove ? [] : [{ label: `Remove ${noun}`, click: pick('remove') }]),
              ],
        )
      },
    },

    // Rename is always offered; Change Icon unless `noEditIcon` (the homepage sets its icon from
    // the settings pane, not here); `toggleIcon` adds the Hide/Show Icon item.
    'nexus:titleMenu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, arg: unknown): Promise<TitleMenuAction | null> => {
        const opts = (arg ?? {}) as {
          toggleIcon?: boolean
          iconHidden?: boolean
          noEditIcon?: boolean
        }
        return popReturningMenu<TitleMenuAction>(win, (pick) => [
          { label: 'Rename', click: pick('rename') },
          ...(opts.noEditIcon ? [] : [{ label: 'Change Icon', click: pick('editIcon') }]),
          ...(opts.toggleIcon
            ? [{ label: opts.iconHidden ? 'Show Icon' : 'Hide Icon', click: pick('toggleIcon') }]
            : []),
        ])
      },
    },

    // The table grip's right-click menu.
    'table-menu': { kind: 'menu', fn: popTableMenu },

    // The callout grip's right-click menu.
    'callout-menu': { kind: 'menu', fn: popCalloutMenu },
    'embed-menu': { kind: 'menu', fn: popEmbedMenu },

    // The table-view column header's right-click menu.
    'column-menu': { kind: 'menu', fn: popColumnMenu },

    // A table cell's right-click menu (title meta / per-type Style / Edit).
    'cell-menu': { kind: 'menu', fn: popCellMenu },

    // A card's right-click menu (page meta + Add Property ▸).
    'card-menu': { kind: 'menu', fn: popCardMenu },

    // A tab's right-click menu (Pin/Unpin · Close · Close to the Right).
    'tab-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: TabMenuContext) => {
        return isPlainObject(ctx) ? popTabMenu(win, ctx) : null
      },
    },

    // A NavWindow row/card's right-click menu.
    'nav-row-menu': {
      kind: 'menu',
      fn: async (win: BrowserWindow, ctx: NavRowMenuContext) => {
        return isPlainObject(ctx) ? popNavRowMenu(win, ctx) : null
      },
    },

    // A wikilink's right-click menu (Open in Preview).
    'conn-menu': { kind: 'menu', fn: popConnMenu },

    'property-menu': { kind: 'menu', fn: popPropertyMenu },

    'option-menu': { kind: 'menu', fn: popOptionMenu },

    // Open a page-attached file in its OS default app. The renderer-supplied path validates under the
    // session root (resolveUnderRoot) — a `..` climb or symlink smuggle never reaches shell.openPath.
    'file:open': {
      kind: 'raw',
      fn: async (relPath: unknown) => {
        const root = sessionRoot()
        if (!root) return NO_NEXUS
        const r = await resolveUnderRoot(root, relPath)
        if (!r.ok) return r
        const err = await shell.openPath(r.value)
        return err ? fail('operation-failed', err) : ok(null)
      },
    },

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
  },
)

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
        await runOpenRecord(root)
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
