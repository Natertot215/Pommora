import { Menu, app, shell, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { pruneRecents, readAppConfig, updateAppConfig } from '../Config/appConfig'
import { push } from '../Bridge/ipc'
import { dropLiveTree } from '@pommora/core/Nexus/liveTree'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { readInterfaceScale } from '@pommora/core/Settings/settings'
import { setHostZoom, stepHostZoom } from '../Web/webGuests'
import { INTERFACE_SCALE_DEFAULT } from '@pommora/core/Settings/personalization'
import { interfaceScaleZoom } from '../Config/interfaceScale'

type AdoptFn = (path: string) => Promise<void>

/** The captured `win` can be stale: the menu outlives a window lifecycle. */
const menuTarget = (win: BrowserWindow): BrowserWindow | null => {
  const w = BrowserWindow.getFocusedWindow() ?? win
  return w.isDestroyed() ? null : w
}

const zoomStep = (win: BrowserWindow, dir: 1 | -1) => (): void => {
  const w = menuTarget(win)
  if (w) stepHostZoom(w.webContents, dir)
}

export async function installAppMenu(win: BrowserWindow, adopt: AdoptFn): Promise<void> {
  const userData = app.getPath('userData')
  const stored = (await readAppConfig(userData)).recents ?? []
  // Drop trashed nexuses so Open Recent never lists a dead path.
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
          click: () => {
            const w = menuTarget(win)
            // Forget the held tree so the booting renderer's read walks disk fresh.
            if (w) {
              dropLiveTree()
              w.webContents.reload()
            }
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    // Spelled out so Paste and Match Style gives up ⌘⇧V, which the role claims main-side (→ ConfigurationPM §Commands).
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
        // Read fresh, so a settings.json edit to interfaceScale takes effect without a relaunch.
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: async () => {
            const root = sessionRoot()
            const scale = root ? await readInterfaceScale(root) : INTERFACE_SCALE_DEFAULT
            const w = menuTarget(win)
            if (w) setHostZoom(w.webContents, interfaceScaleZoom(scale))
          },
        },
        // De-roled: a zoom role acts on the focused WebContents, so a guest would bypass the guest-zoom sync.
        // The hidden item keeps the role's unshifted ⌘= alias (US layout) alive.
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
