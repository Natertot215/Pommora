import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Asks, Pushes, Tells } from '@pommora/core/Contract/bridge'

const ask = <K extends keyof Asks>(k: K, ...args: Asks[K]['args']): Promise<Asks[K]['reply']> =>
  ipcRenderer.invoke(k, ...args)

const tell = <K extends keyof Tells>(k: K, ...args: Tells[K]): void => {
  ipcRenderer.send(k, ...args)
}

const on = <K extends keyof Pushes>(k: K, cb: (p: Pushes[K]) => void): (() => void) => {
  const listener = (_e: IpcRendererEvent, payload: Pushes[K]): void => cb(payload)
  ipcRenderer.on(k, listener)
  return () => {
    ipcRenderer.removeListener(k, listener)
  }
}

contextBridge.exposeInMainWorld('nexus', {
  ask,
  tell,
  on,
  // Only the preload can resolve a dropped File to its path.
  openDropped: (file: File) => ask('nexus:openPath', webUtils.getPathForFile(file)),
})
