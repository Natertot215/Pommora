import { existsSync, rmSync } from 'node:fs'
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
import type { HostContext, HostDevice, PickKind } from '@pommora/core/Contract/handlers'
import { handlers } from '@pommora/core/Contract/serve'
import { isFiniteNumber } from '@pommora/core/Contract/validators'
import { resolveUnderRoot } from '@pommora/core/Paths/pathSafety'
import { openNexusSequence } from '@pommora/core/Nexus/handlers'
import { isUlidShaped } from '@pommora/core/Nexus/identityMark'
import { setCommandsTap } from '@pommora/core/Nexus/liveTree'
import { sessionRoot, waitingOpen } from '@pommora/core/Nexus/session'
import { flushFileHistory } from '@pommora/core/Pages/fileHistory'
import { ASSET_SCHEME } from '@pommora/core/Platform/assetScheme'
import { installMachine } from '@pommora/core/Platform/machine'
import { settingOf } from '@pommora/core/Settings/personalization'
import {
  readLiveCommands,
  readLivePersonalization,
  readWatchScope,
} from '@pommora/core/Settings/settings'
import { SYSTEM, WINDOW_BG } from '@pommora/uix/Theme/colors'
import { installAppMenu } from './Actions/appMenu'
import { askEditorMenu, installEditorContextMenu } from './Actions/editorMenu'
import { setCmdModifier } from '@pommora/uix/Interactions/chords'
import { DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import { popNativeMenu } from './Actions/menu'
import { push, serveIpc, settleAsks, type TellHandlers } from './Bridge/ipc'
import { captureThumbnail, evictThumbnails } from './Capture/thumbnails'
import {
  addRecent,
  readAppConfig,
  resolveRestorePath,
  trashModeOf,
  updateAppConfig,
} from './Config/appConfig'
import { ensureDevice } from './Config/device'
import { getSecret, setSecret } from './Config/secrets'
import { startWatcher, stopWatcher, waitUntilReadable } from './FileWatch/watcher'
import { isWindows, nativePath, posixPath } from './Platform/hostPath'
import { drainFileLocks } from './Platform/fileLock'
import { nodeMachine } from './Platform/nodeMachine'
import { closeSessionDb, openSessionDb } from './Store/sessionDb'
import { fetchPageTitle } from './Web/linkTitles'
import { transport } from './Sync/transport'
import {
  installWebGuests,
  pauseGuestMedia,
  setGuestTileZoom,
  resetHostZoom,
  setWebZoomFactor,
  wheelGuest,
} from './Web/webGuests'

// FIRST, ahead of anything that could read a path: the name resolves userData, and Electron caches
// that directory on its first read.
app.setName('Pommora')

installMachine({ ...nodeMachine, trashToSystem: (p) => shell.trashItem(nativePath(p)) })
setCmdModifier(isWindows)

// Development switches: a packaged build ignores them, so neither an environment variable nor a launch argument can open it to a debugger, swap its renderer, or move its state.
const DEV_ENV = app.isPackaged ? {} : process.env
if (DEV_ENV.POMMORA_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', DEV_ENV.POMMORA_DEBUG_PORT)
}
if (app.isPackaged)
  for (const s of ['remote-debugging-port', 'remote-debugging-pipe'])
    app.commandLine.removeSwitch(s)

// A second instance beside the live one: its own userData carries its own single-instance lock.
if (DEV_ENV.POMMORA_USERDATA) app.setPath('userData', DEV_ENV.POMMORA_USERDATA)

// file://-loaded ES modules are CORS-blocked (opaque origin → blank window); app:// gives the bundle a real origin. Both schemes must be registered before the app is ready.
const RENDERER_SCHEME = 'app'
protocol.registerSchemesAsPrivileged([
  { scheme: RENDERER_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  {
    scheme: ASSET_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
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

// CodeMirror injects <style> elements, banners and profile images may point at any web address, and the renderer never fetches: sync runs in main and web pages in their own guests.
const RENDERER_CSP = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' ${ASSET_SCHEME}: data: https: http:`,
  "object-src 'none'",
  "base-uri 'none'",
].join('; ')

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
      const headers = {
        'Content-Type': type,
        ...(type === 'text/html' ? { 'Content-Security-Policy': RENDERER_CSP } : {}),
      }
      return new Response(new Uint8Array(data), { headers })
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

const userData = (): string => posixPath(app.getPath('userData'))

let mainWindow: BrowserWindow | null = null
const currentWindow = (): BrowserWindow | null => mainWindow
let device: HostDevice | null = null

let lastPaste: string | null = null
const dropPaste = (): void => {
  if (lastPaste) rmSync(lastPaste, { force: true })
  lastPaste = null
}

async function refreshMenu(): Promise<void> {
  const root = sessionRoot()
  const commands = root ? await readLiveCommands(root) : DEFAULT_COMMANDS
  await installAppMenu(currentWindow, openNexusPath, commands)
}

// The window opens a Nexus through its own open, which flushes its saves and restores its tabs; with no window, main opens it.
async function openNexusPath(p: string): Promise<void> {
  if (currentWindow()) return push(currentWindow, 'nexus:openRecent', p)
  try {
    await handlers['nexus:openPath'](hostContext(null), p)
  } catch (e) {
    console.error('Open failed:', e)
  }
}

function watchNexus(): void {
  const open = waitingOpen()
  const root = sessionRoot()
  if (open) waitUntilReadable(open, openNexusPath)
  else if (root) void startWatcher(root, currentWindow)
}

function systemAccent(): string | null {
  try {
    const c = systemPreferences.getAccentColor?.()
    return c ? `#${c.slice(0, 6)}` : null
  } catch {
    return null
  }
}

const pushSystemAccent = (): void => push(currentWindow, 'theme:systemAccent', systemAccent())

async function applyDefaultZoom(win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) return
  // No-nexus state normalizes to 1.0 so the welcome screen never inherits a prior nexus's host zoom (Electron zoom is per-render-host, shared).
  const root = sessionRoot()
  const p = root ? await readLivePersonalization(root) : {}
  setWebZoomFactor(settingOf(p, 'webZoomFactor'))
  if (!win.isDestroyed()) resetHostZoom(win.webContents)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 832,
    show: false,
    // Title bar hidden but the native frame kept (macOS corner radius + shadow, Windows caption controls as an overlay); traffic lights repositioned into the sidebar, which stays opaque to sample the window.
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 18 },
    ...(isWindows && {
      titleBarOverlay: { color: '#00000000', symbolColor: SYSTEM.white },
    }),
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
  win.on('enter-full-screen', () => push(win, 'win:fullscreen', true))
  win.on('leave-full-screen', () => push(win, 'win:fullscreen', false))
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  win.webContents.on('did-finish-load', () => void applyDefaultZoom(win))
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })
  win.loadURL(DEV_ENV.ELECTRON_RENDERER_URL ?? `${RENDERER_SCHEME}://bundle/index.html`)
}

const PICK_PROPERTIES: Record<PickKind, OpenDialogOptions['properties']> = {
  file: ['openFile'],
  image: ['openFile'],
  folder: ['openDirectory', 'createDirectory'],
  exclusion: ['openDirectory'],
}

function hostContext(win: BrowserWindow | null): HostContext {
  return {
    push: (k, payload) => push(currentWindow, k, payload),
    async pick(kind, opts) {
      const options: OpenDialogOptions = {
        properties: PICK_PROPERTIES[kind],
        ...(opts?.defaultPath && { defaultPath: nativePath(opts.defaultPath) }),
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
      dropPaste()
      lastPaste = join(tmpdir(), `pommora-paste-${Date.now()}.png`)
      await writeFile(lastPaste, image.toPNG())
      return posixPath(lastPaste)
    },
    clipboard: {
      read: async () => clipboard.readText(),
      write: async (text) => clipboard.writeText(text),
    },
    reveal: (p) => shell.showItemInFolder(nativePath(p)),
    openExternal: (url) => shell.openExternal(url),
    menu: (req) => (win ? popNativeMenu(win, req) : Promise.resolve(null)),
    editorMenu: askEditorMenu,
    thumbnails: {
      capture: (root, nexusId, navKey, rect, scaleFactor) =>
        win
          ? captureThumbnail(win, root, nexusId, navKey, rect, scaleFactor)
          : Promise.resolve(null),
      evict: evictThumbnails,
    },
    webGuests: { setZoom: setGuestTileZoom, pauseMedia: pauseGuestMedia },
    trashMode: async () => trashModeOf(await readAppConfig(userData())),
    fetchTitle: fetchPageTitle,
    device,
    secrets: {
      get: (name) => getSecret(userData(), name),
      set: (name, value) => setSecret(userData(), name, value),
    },
    transport,
    openStores: (root, nexusId) =>
      openSessionDb(isUlidShaped(nexusId) ? `${userData()}/Nexuses/${nexusId}` : null, root),
    async adopted(path) {
      watchNexus()
      if (mainWindow) void applyDefaultZoom(mainWindow)
      try {
        // The RAW user-facing path, not the canonical root: a nexus under an iCloud-synced ~/Documents realpaths into the Mobile Documents container, which reads as gibberish in Open Recent and breaks restore if iCloud Desktop & Documents is later turned off.
        await updateAppConfig(userData(), (cur) => ({
          lastNexusPath: path,
          recents: addRecent(cur.recents ?? [], path),
        }))
        app.addRecentDocument(nativePath(path))
      } catch (e) {
        console.error('Could not persist recents / last-opened:', e)
      }
      void refreshMenu()
    },
    watch: (root) => startWatcher(root, currentWindow),
    applyZoom: () => (mainWindow ? applyDefaultZoom(mainWindow) : Promise.resolve()),
  }
}

let windowFlushed: (() => void) | null = null

const tells: TellHandlers = {
  'app:flushed': () => windowFlushed?.(),
  'win:dragBy': (win, dx, dy) => {
    if (!win || !isFiniteNumber(dx) || !isFiniteNumber(dy)) return
    const [x, y] = win.getPosition()
    win.setPosition(Math.round(x + dx), Math.round(y + dy))
  },
  'win:zoom': (win) => {
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  },
  'win:resend': (win) => {
    if (!win) return
    push(win, 'win:fullscreen', win.isFullScreen())
    push(win, 'theme:systemAccent', systemAccent())
  },
  'web:wheel': (_win, ...args) => {
    if (args.length === 5 && args.every(isFiniteNumber))
      wheelGuest(...(args as [number, number, number, number, number]))
  },
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
    // Development never reaches the bundle's icon — Electron's own wins, catalog or not — so the Dock
    // is handed the render a packaged build compiles, already inset to Apple's grid.
    const devIcon = join(__dirname, '../../build/icon.png')
    if (!app.isPackaged && app.dock && existsSync(devIcon)) app.dock.setIcon(devIcon)
    try {
      device = await ensureDevice(userData())
    } catch (e) {
      console.error('Device identity unavailable:', e)
    }
    // No picker here — a launch never blocks; a restore refused by a damaged file waits on it, and any other failure degrades to the empty state.
    try {
      const restore = await resolveRestorePath(await readAppConfig(userData()))
      if (restore) await openNexusSequence(hostContext(null), posixPath(restore), true)
    } catch (e) {
      console.error('Restore skipped (config unreadable):', e)
    }

    nativeTheme.themeSource = 'dark'
    if (process.platform === 'darwin')
      systemPreferences.subscribeNotification(
        'AppleColorPreferencesChangedNotification',
        pushSystemAccent,
      )
    else systemPreferences.on('accent-color-changed', pushSystemAccent)
    app.setAboutPanelOptions({ applicationName: 'Pommora', applicationVersion: app.getVersion() })

    registerRendererProtocol()
    registerAssetProtocol()
    createWindow()
    void refreshMenu()
    setCommandsTap(() => void refreshMenu())
    watchNexus()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((e) => {
    console.error('Failed to start:', e)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

const FLUSH_WAIT_MS = 2000

// Bounded, so a hung window or a long-running ask can't hold the quit.
const bounded = (work: Promise<unknown>): Promise<unknown> =>
  Promise.race([work, new Promise((resolve) => setTimeout(resolve, FLUSH_WAIT_MS))])

const flushWindow = (): Promise<unknown> =>
  mainWindow
    ? bounded(
        new Promise<void>((resolve) => {
          windowFlushed = resolve
          push(currentWindow, 'app:flush', null)
        }),
      )
    : Promise.resolve()

// Before-quit fires ahead of the window closing: its owed saves land first, then every ask and locked write in flight, and only then do the stores close. A second quit mid-flush waits on the first.
let quitting: 'no' | 'flushing' | 'ready' = 'no'
app.on('before-quit', (e) => {
  if (quitting === 'ready') return
  e.preventDefault()
  if (quitting === 'flushing') return
  quitting = 'flushing'
  stopWatcher()
  const quit = (): void => {
    dropPaste()
    closeSessionDb()
    quitting = 'ready'
    app.quit()
  }
  void flushWindow()
    .then(() => bounded(settleAsks()))
    // Unbounded: a Context or schema cascade in flight holds a machine lock, so it finishes before the quit.
    .then(drainFileLocks)
    .then(() => {
      const root = sessionRoot()
      return root === null ? undefined : flushFileHistory(root)
    })
    .then(quit, quit)
})
