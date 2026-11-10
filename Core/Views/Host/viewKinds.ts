import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
import type { SavedView, ViewSwitch, ViewType, ViewWriter } from '../views'
import type { PropertyPaneProps } from '../Settings/ViewPane'
import type { ViewHostApi } from './useViewHost'
import { TABLE_KIND } from '../Table/tableKind'
import { CARDS_KIND } from '../Cards/cardsKind'

export interface ViewKindRecord {
  Renderer: (p: { host: ViewHostApi }) => React.JSX.Element
  nests: boolean
  layout: {
    leaf: 'visibility' | 'switches'
    Properties: (p: PropertyPaneProps) => React.JSX.Element | null
    switches: ViewSwitch[]
    rows?: (view: SavedView, write: ViewWriter) => MenuRow[]
  }
}

export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = {
  table: TABLE_KIND,
  cards: CARDS_KIND,
}

export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
