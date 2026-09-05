import type { Asks, Pushes, Tells } from '../Contract/bridge'
import type { LegacyApi } from '../../Pommora/src/preload/index'

export interface Dialer {
  ask<K extends keyof Asks>(k: K, ...args: Asks[K]['args']): Promise<Asks[K]['reply']>
  tell<K extends keyof Tells>(k: K, ...args: Tells[K]): void
  on<K extends keyof Pushes>(k: K, cb: (p: Pushes[K]) => void): () => void
}

declare global {
  interface Window {
    nexus: Dialer & LegacyApi
  }
}
