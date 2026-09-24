import { Menu, app, shell, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { pruneRecents, readAppConfig, updateAppConfig } from '../Config/appConfig'
import { type CurrentWindow, push } from '../Bridge/ipc'
import { dropLiveTree } from '@pommora/core/Nexus/liveTree'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { readInterfaceScale } from '@pommora/core/Settings/devicePrefs'
import { type Commands, toAccelerator } from '@pommora/core/Actions/commands'
import { setHostZoom, stepHostZoom } from '../Web/webGuests'
import { interfaceScaleZoom } from '../Config/interfaceScale'
import { isWindows, nativePath, posixPath } from '../Platform/hostPath'

const menuTarget = (win: CurrentWindow): BrowserWindow | null => {
  const w = BrowserWindow.getFocusedWindow() ?? win()
  return w && !w.isDestroyed() ? w : null
}

const zoomStep = (win: CurrentWindow, dir: 1 | -1) => (): void => {
  const w = menuTarget(win)
  if (w) stepHostZoom(w.webContents, dir)
}

/** `openRecent` adopts host-side, for when no window is open to flush its saves first. */
export async function installAppMenu(
  win: CurrentWindow,
  openRecent: (path: string) => unknown,
  commands: Commands,
): Promise<void> {
  const userData = posixPath(app.getPath('userData'))
  const stored = (await readAppConfig(userData)).recents ?? []
  // Drop trashed nexuses so Open Recent never lists a dead path.
  const recents = await pruneRecents(stored)
  if (recents.length !== stored.length) {
    await updateAppConfig(userData, () => ({ recents }))
  }
  const hasSession = sessionRoot() !== null
  const isMac = process.platform === 'darwin'
  const send = (action: string): void => push(win, 'menu:action', action)

  const recentItems: MenuItemConstructorOptions[] = recents.length
    ? recents.map((p) => ({
        label: basename(p),
        click: () => {
          if (win()) push(win, 'nexus:openRecent', posixPath(p))
          else void openRecent(posixPath(p))
        },
      }))
    : [{ label: 'No Recent Nexuses', enabled: false }]

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open Nexus…', click: () => send('open') },
        { label: 'Open Recent', submenu: recentItems },
        { type: 'separator' },
        {
          label: 'New Tab',
          accelerator: toAccelerator(commands['new-tab']),
          enabled: hasSession,
          click: () => send('new-tab'),
        },
        {
          label: 'New Page',
          accelerator: toAccelerator(commands['new-page']),
          enabled: hasSession,
          click: () => send('new-page'),
        },
        { type: 'separator' },
        {
          label: isWindows ? 'Show in File Explorer' : 'Reveal in Finder',
          enabled: hasSession,
          click: () => {
            const root = sessionRoot()
            if (root) shell.showItemInFolder(nativePath(root))
          },
        },
        {
          label: 'Reload',
          accelerator: toAccelerator(commands.reload),
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
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
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
        ...(isMac
          ? [
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : []),
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: toAccelerator(commands['toggle-sidebar']),
          click: () => send('toggle-sidebar'),
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: toAccelerator(commands['actual-size']),
          click: () => {
            const w = menuTarget(win)
            if (w) setHostZoom(w.webContents, interfaceScaleZoom(readInterfaceScale()))
          },
        },
        // De-roled: a zoom role acts on the focused WebContents, so a guest would bypass the guest-zoom sync. The hidden item keeps the role's unshifted ⌘= alias (US layout) alive.
        {
          label: 'Zoom In',
          accelerator: toAccelerator(commands['zoom-in']),
          click: zoomStep(win, 1),
        },
        {
          label: 'Zoom In',
          accelerator: toAccelerator(commands['zoom-in-alias']),
          click: zoomStep(win, 1),
          visible: false,
          acceleratorWorksWhenHidden: true,
        },
        {
          label: 'Zoom Out',
          accelerator: toAccelerator(commands['zoom-out']),
          click: zoomStep(win, -1),
        },
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
