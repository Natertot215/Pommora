import { Menu, app, shell, BrowserWindow, webContents } from 'electron'
import type { MenuItemConstructorOptions, WebContents } from 'electron'
import { basename } from 'node:path'
import { pruneRecents, readAppConfig, updateAppConfig } from '../Config/appConfig'
import { type CurrentWindow, push } from '../Bridge/ipc'
import { dropLiveTree } from '@pommora/core/Nexus/liveTree'
import { sessionRoot } from '@pommora/core/Nexus/session'
import {
  type Commands,
  type EditMenuAction,
  type NativeEdit,
  toAccelerator,
} from '@pommora/core/Actions/commands'
import type { Pushes } from '@pommora/core/Contract/bridge'
import { PASTE_PLAIN_ACTION } from '@pommora/core/Actions/editorMenu'
import { resetHostZoom, stepHostZoom } from '../Web/webGuests'
import { isWindows, nativePath, posixPath } from '../Platform/hostPath'

const menuTarget = (win: CurrentWindow): BrowserWindow | null => {
  const w = BrowserWindow.getFocusedWindow() ?? win()
  return w && !w.isDestroyed() ? w : null
}

/** Checked rather than trusted, since a window's tell can carry anything. */
export const nativeEdit = (wc: WebContents, edit: unknown): void => {
  if (edit === 'undo' || edit === 'pasteAndMatchStyle') wc[edit]()
}

const zoomStep = (win: CurrentWindow, dir: 1 | -1) => (): void => {
  const w = menuTarget(win)
  if (w) stepHostZoom(w.webContents, dir)
}

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
  const send = (action: Pushes['menu:action']): void => push(win, 'menu:action', action)
  // A focused web guest or DevTools takes the native edit itself; the app's window answers its own.
  const routedEdit = (action: EditMenuAction, edit: NativeEdit) => (): void => {
    const wc = webContents.getFocusedWebContents()
    if (wc && wc !== win()?.webContents) nativeEdit(wc, edit)
    else send(action)
  }

  const recentItems: MenuItemConstructorOptions[] = recents.length
    ? recents.map((p) => ({
        label: basename(p),
        click: () => openRecent(posixPath(p)),
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
    // Undo and Paste Without Formatting are spelled out so the window answers them first, and so Paste and Match Style gives up ⌘⇧V, which the role claims main-side (→ ConfigurationPM §Shortcuts).
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: toAccelerator(commands['undo-value']),
          // Windows and Linux leave the chord to the window's keydown; macOS registers it regardless, and a press the page leaves unhandled lands in the same native undo through the window.
          registerAccelerator: false,
          click: routedEdit('undo', 'undo'),
        },
        // The hidden role keeps ⌘Z reaching a text field's own undo once `undo-value` is rebound, as the Zoom In alias keeps ⌘=.
        { role: 'undo', visible: false, acceleratorWorksWhenHidden: true },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        {
          label: 'Paste Without Formatting',
          click: routedEdit(PASTE_PLAIN_ACTION, 'pasteAndMatchStyle'),
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
            if (w) resetHostZoom(w.webContents)
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
