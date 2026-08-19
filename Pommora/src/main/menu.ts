import { Menu, app, shell, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { readAppConfig, updateAppConfig } from './appConfig'
import { push } from './ipc'
import { dropLiveTree } from './liveTree'
import { pruneRecents, sessionRoot } from './session'
import { readDefaultViewScale } from './settings'
import { setHostZoom, stepHostZoom } from './webGuests'
import { VIEW_SCALE_DEFAULT, viewScaleZoom } from '@shared/types'

type AdoptFn = (path: string) => Promise<void>

const zoomStep = (win: BrowserWindow, dir: 1 | -1) => (): void => {
  const w = BrowserWindow.getFocusedWindow() ?? win
  if (!w.isDestroyed()) stepHostZoom(w.webContents, dir)
}

// Renderer-driven items send a 'menu:action' string the renderer handles; main-side items
// (Open Recent, Reveal, Reload) act here. Rebuilt whenever the session or recents change.
export async function installAppMenu(win: BrowserWindow, adopt: AdoptFn): Promise<void> {
  const userData = app.getPath('userData')
  const stored = (await readAppConfig(userData)).recents ?? []
  // Drop deleted (trashed) nexuses so Open Recent never lists a dead path; self-heal the stored
  // list when the prune removes any, so the debris doesn't linger in the config.
  const recents = await pruneRecents(stored)
  if (recents.length !== stored.length) {
    await updateAppConfig(userData, () => ({ recents }))
  }
  const hasSession = sessionRoot() !== null
  const send = (action: string): void => push(win, 'menu:action', action)

  const recentItems: MenuItemConstructorOptions[] = recents.length
    ? recents.map((p) => ({
        label: basename(p),
        click: async () => {
          await adopt(p)
          send('reload-state')
        },
      }))
    : [{ label: 'No Recent Nexuses', enabled: false }]

  const template: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { label: 'Open Nexus…', click: () => send('open') },
        { label: 'Open Recent', submenu: recentItems },
        { type: 'separator' },
        // Renderer-driven: the store resolves the target container from the current
        // selection. Enabled only with a nexus open (nothing to create into otherwise).
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+N',
          enabled: hasSession,
          click: () => send('new-tab'),
        },
        {
          label: 'New Page',
          accelerator: 'CmdOrCtrl+Shift+N',
          enabled: hasSession,
          click: () => send('new-page'),
        },
        { type: 'separator' },
        {
          label: 'Reveal in Finder',
          enabled: hasSession,
          click: () => {
            const root = sessionRoot()
            if (root) shell.showItemInFolder(root)
          },
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          // The captured `win` can be a stale/destroyed reference (the menu outlives a window
          // lifecycle); reload the live focused window, and guard so a dead one is a no-op, not a crash.
          click: () => {
            const w = BrowserWindow.getFocusedWindow() ?? win
            if (!w.isDestroyed()) {
              // Reload is the deliberate verification point: forget the held tree so the
              // booting renderer's read walks disk fresh instead of serving from memory.
              dropLiveTree()
              w.webContents.reload()
            }
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    // The `editMenu` role spelled out so Paste and Match Style can keep its act while giving up its
    // accelerator: the role claims ⌘⇧V main-side, and while it holds it the chord never reaches the
    // renderer at all (→ ConfigurationPM §Commands).
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        {
          label: 'Paste Without Formatting',
          click: () => BrowserWindow.getFocusedWindow()?.webContents.pasteAndMatchStyle(),
        },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => send('toggle-sidebar'),
        },
        { type: 'separator' },
        // ⌘0 resets to the nexus's default view scale (personalization.defaultViewScale), not a
        // hardcoded 1.0 — read fresh so a settings.json edit takes effect without a relaunch.
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: async () => {
            const root = sessionRoot()
            const scale = root ? await readDefaultViewScale(root) : VIEW_SCALE_DEFAULT
            const w = BrowserWindow.getFocusedWindow() ?? win
            if (!w.isDestroyed()) setHostZoom(w.webContents, viewScaleZoom(scale))
          },
        },
        // De-roled: the native zoom roles are handled inside Chromium with no JS hook, which
        // would leave guest webviews at the old scale on the first ⌘+. The hidden item keeps the
        // role's unshifted ⌘= alias alive.
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: zoomStep(win, 1) },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: zoomStep(win, 1),
          visible: false,
          acceleratorWorksWhenHidden: true,
        },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: zoomStep(win, -1) },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'About Pommora', click: () => app.showAboutPanel() }] },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
