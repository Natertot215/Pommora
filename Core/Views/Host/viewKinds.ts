import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
import type { SavedView, ViewType, ViewWriter } from '../views'
import type { VisibilityPaneProps } from '../Settings/ViewPane'
import type { ViewSwitch } from '../Settings/switchRows'
import type { ViewHostApi } from './useViewHost'
import { TABLE_KIND } from '../Table/tableKind'
import { CARDS_KIND } from '../Cards/cardsKind'
import { LIST_KIND } from '../List/listKind'

export interface ViewKindRecord {
  Renderer: (p: { host: ViewHostApi }) => React.JSX.Element
  Visibility: (p: VisibilityPaneProps) => React.JSX.Element
  nests: boolean
  layout: {
    leaf: 'visibility' | 'switches'
    switches: ViewSwitch[]
    rows?: (view: SavedView, write: ViewWriter) => MenuRow[]
  }
}

export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = {
  table: TABLE_KIND,
  cards: CARDS_KIND,
  list: LIST_KIND,
}

export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
