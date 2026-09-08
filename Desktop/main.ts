import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, sep } from 'node:path'
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  nativeTheme,
  type OpenDialogOptions,
  protocol,
  shell,
  systemPreferences,
} from 'electron'
import { ASSET_MIME, IMAGE_EXTS } from '@pommora/core/Assets/assetMime'
import { underAssetRoot } from '@pommora/core/Assets/assetRoots'
import type { HostContext, PickKind } from '@pommora/core/Contract/handlers'
import { handlers } from '@pommora/core/Contract/serve'
import { resolveUnderRoot } from '@pommora/core/Paths/pathSafety'
import { flushNavigation } from '@pommora/core/Navigation/navigationFile'
import { adoptNexus, openNexusSequence } from '@pommora/core/Nexus/handlers'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { flushFileHistory } from '@pommora/core/Pages/fileHistory'
import { installMachine } from '@pommora/core/Platform/machine'
import {
  coerceInterfaceScale,
  coerceScale,
  WEB_ZOOM_DEFAULT,
} from '@pommora/core/Settings/personalization'
import { readLivePersonalization, readWatchScope } from '@pommora/core/Settings/settings'
import { WINDOW_BG } from '@pommora/uix/Theme/colors'
import { installAppMenu } from './Actions/appMenu'
import { installEditorContextMenu, setFormatState } from './Actions/editorMenu'
import { popNativeMenu } from './Actions/menu'
import { push, serveIpc, type TellHandlers } from './Bridge/ipc'
import { captureThumbnail, evictThumbnails } from './Capture/thumbnails'
import {
  addRecent,
  readAppConfig,
  resolveRestorePath,
  trashModeOf,
  updateAppConfig,
} from './Config/appConfig'
import { interfaceScaleZoom } from './Config/interfaceScale'
import { startWatcher, stopWatcher } from './FileWatch/watcher'
import { nodeMachine } from './Platform/nodeMachine'
import { closeSessionDb, openSessionDb } from './Store/sessionDb'
import { fetchPageTitle } from './Web/linkTitles'
import {
  installWebGuests,
  pauseGuestMedia,
  setGuestTileZoom,
  setHostZoom,
  setWebZoomFactor,
  wheelGuest,
} from './Web/webGuests'

// FIRST, ahead of anything that could read a path: the name resolves userData, and Electron caches
// that directory on its first read.
app.setName('Pommora')

installMachine({ ...nodeMachine, trashToSystem: (p) => shell.trashItem(p) })

if (process.env.POMMORA_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.POMMORA_DEBUG_PORT)
}

// A second instance beside the live one: its own userData carries its own single-instance lock.
if (process.env.POMMORA_USERDATA) app.setPath('userData', process.env.POMMORA_USERDATA)

// file://-loaded ES modules are CORS-blocked (opaque origin → blank window); app:// gives the bundle a real origin. Both schemes must be registered before the app is ready.
const RENDERER_SCHEME = 'app'
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

// Confined to the open nexus's asset roots — the configured directory and `.nexus/assets`.
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
      return new Response(new Uint8Array(data), {
        headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

const userData = (): string => app.getPath('userData')
// Core's path arithmetic is '/'-only, so every path the host hands it is forward-slash.
const posixPath = (p: string): string => p.split(sep).join('/')

let mainWindow: BrowserWindow | null = null
function refreshMenu(): void {
  if (mainWindow)
    void installAppMenu(mainWindow, (p) => adoptNexus(hostContext(null), posixPath(p)))
}

async function applyDefaultZoom(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) return
  // No-nexus state normalizes to 1.0 so the welcome screen never inherits a prior nexus's host zoom (Electron zoom is per-render-host, shared).
  const root = sessionRoot()
  const p = root ? await readLivePersonalization(root) : null
  setWebZoomFactor(coerceScale(p?.webZoomFactor, WEB_ZOOM_DEFAULT))
  if (!win.isDestroyed())
    setHostZoom(win.webContents, interfaceScaleZoom(coerceInterfaceScale(p?.interfaceScale)))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 832,
    show: false,
    // Title bar hidden but the native frame kept (macOS corner radius + shadow); traffic lights repositioned into the sidebar, which stays opaque to sample the window.
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: WINDOW_BG,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  win.on('ready-to-show', () => void applyDefaultZoom(win).finally(() => win.show()))
  installEditorContextMenu(win)
  installWebGuests(win)
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  win.webContents.on('did-finish-load', () => void applyDefaultZoom(win))
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })
  win.loadURL(process.env.ELECTRON_RENDERER_URL ?? `${RENDERER_SCHEME}://bundle/index.html`)
}

const PICK_PROPERTIES: Record<PickKind, OpenDialogOptions['properties']> = {
  file: ['openFile'],
  image: ['openFile'],
  folder: ['openDirectory', 'createDirectory'],
  exclusion: ['openDirectory'],
}

function hostContext(win: BrowserWindow | null): HostContext {
  return {
    push: (k, payload) => {
      if (mainWindow) push(mainWindow, k, payload)
    },
    async pick(kind, opts) {
      const options: OpenDialogOptions = {
        properties: PICK_PROPERTIES[kind],
        ...(opts?.defaultPath && { defaultPath: opts.defaultPath }),
        ...(opts?.message && { message: opts.message }),
        ...(kind === 'image' && { filters: [{ name: 'Images', extensions: IMAGE_EXTS }] }),
      }
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)
      const [picked] = result.filePaths
      return result.canceled || !picked ? null : posixPath(picked)
    },
    async pasteImage() {
      const image = clipboard.readImage()
      if (image.isEmpty()) return null
      const path = join(tmpdir(), `pommora-paste-${Date.now()}.png`)
      await writeFile(path, image.toPNG())
      return posixPath(path)
    },
    clipboard: {
      read: async () => clipboard.readText(),
      write: async (text) => clipboard.writeText(text),
    },
    reveal: (p) => shell.showItemInFolder(p),
    openExternal: (url) => shell.openExternal(url),
    async message(type, message, detail) {
      if (win) await dialog.showMessageBox(win, { type, message, detail })
    },
    systemAccent: () => {
      try {
        const c = systemPreferences.getAccentColor?.()
        return c ? `#${c.slice(0, 6)}` : null
      } catch {
        return null
      }
    },
    menu: (req) => (win ? popNativeMenu(win, req) : Promise.resolve(null)),
    thumbnails: {
      capture: (root, navKey, rect, scaleFactor) =>
        win ? captureThumbnail(win, root, navKey, rect, scaleFactor) : Promise.resolve(null),
      evict: evictThumbnails,
    },
    webGuests: { setZoom: setGuestTileZoom, pauseMedia: pauseGuestMedia },
    trashMode: async () => trashModeOf(await readAppConfig(userData())),
    fetchTitle: fetchPageTitle,
    openStores: openSessionDb,
    async adopted(root, path) {
      if (mainWindow) {
        void startWatcher(root, mainWindow)
        void applyDefaultZoom(mainWindow)
      }
      try {
        // The RAW user-facing path, not the canonical root: a nexus under an iCloud-synced ~/Documents realpaths into the Mobile Documents container, which reads as gibberish in Open Recent and breaks restore if iCloud Desktop & Documents is later turned off.
        await updateAppConfig(userData(), (cur) => ({
          lastNexusPath: path,
          recents: addRecent(cur.recents ?? [], path),
        }))
        app.addRecentDocument(path)
      } catch (e) {
        console.error('Could not persist recents / last-opened:', e)
      }
      refreshMenu()
    },
    watch: (root) => (mainWindow ? startWatcher(root, mainWindow) : Promise.resolve()),
    applyZoom: () => (mainWindow ? applyDefaultZoom(mainWindow) : Promise.resolve()),
  }
}

const tells: TellHandlers = {
  'editor:format-state': (_win, state) => setFormatState(state),
  'win:dragBy': (win, dx, dy) => {
    if (!win || typeof dx !== 'number' || typeof dy !== 'number') return
    const [x, y] = win.getPosition()
    win.setPosition(Math.round(x + dx), Math.round(y + dy))
  },
  'win:zoom': (win) => {
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  },
  'web:wheel': (_win, ...args) => wheelGuest(...args),
}

serveIpc(handlers, tells, hostContext)

// Every write lock in this process is module state, so a second process on the same nexus would race every write with no coordination: one instance is a correctness boundary.
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
    if (!app.hasSingleInstanceLock()) return
    // No picker here — a launch never blocks; a failed restore degrades to the empty state.
    try {
      const restore = await resolveRestorePath(await readAppConfig(userData()))
      if (restore) await openNexusSequence(hostContext(null), posixPath(restore), true)
    } catch (e) {
      console.error('Restore skipped (config unreadable):', e)
    }

    nativeTheme.themeSource = 'dark'
    app.setAboutPanelOptions({ applicationName: 'Pommora', applicationVersion: app.getVersion() })

    registerRendererProtocol()
    registerAssetProtocol()
    createWindow()
    refreshMenu()
    const restored = sessionRoot()
    if (restored && mainWindow) void startWatcher(restored, mainWindow)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
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

// Database writes commit synchronously, so close only tidies. Navigation intent is the one operational write still owed to disk: defer the quit, settle it, re-quit.
let flushingBeforeQuit = false
app.on('before-quit', (e) => {
  if (flushingBeforeQuit) return
  e.preventDefault()
  flushingBeforeQuit = true
  stopWatcher()
  const root = sessionRoot()
  const quit = (): void => {
    closeSessionDb()
    app.quit()
  }
  void Promise.all([flushNavigation(), root === null ? undefined : flushFileHistory(root)]).then(
    quit,
    quit,
  )
})
