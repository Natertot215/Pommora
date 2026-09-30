// Inside a view tile every view-config write lands on the tile payload, never on the source.

import { createContext, useContext } from 'react'
import type { ConnPage } from '../Connections/pageIndex'
import type { CollectionNode, SetNode } from '../Nexus/tree'
import type { SavedView, ViewPatch } from './views'

export interface ViewTileScopeValue {
  source: CollectionNode | SetNode
  view: SavedView
  persist: (patch: ViewPatch) => void
  locked: boolean
  setLocked: (locked: boolean) => void
  openPage?: (page: ConnPage) => void
}

const Ctx = createContext<ViewTileScopeValue | null>(null)
export const ViewTileScopeProvider = Ctx.Provider
export const useViewTileScope = (): ViewTileScopeValue | null => useContext(Ctx)
