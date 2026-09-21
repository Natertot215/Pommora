// The store stashes the outgoing window's rect here synchronously, while it is still in the DOM, and the NavWindow's mount FLIPs from it. One-shot: consume clears the stash.

import { chromePartRect } from '../chromeParts'

let stash: DOMRect | null = null

export const stashWindowMorph = (): void => {
  stash = chromePartRect('pageWindow')
}

export const consumeWindowMorph = (): DOMRect | null => {
  const r = stash
  stash = null
  return r
}
