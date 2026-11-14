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
  outlines: boolean
  /** `leaf` is the view editor's Layout pane body: the kind's Visibility pane, with `leafSwitches` as its footer, or those switches alone. `leafSwitches` are also Settings' Layout body. */
  layout: (
    | { leaf: 'visibility'; leafSwitches?: ViewSwitch[] }
    | { leaf: 'switches'; leafSwitches: ViewSwitch[] }
  ) & {
    /** The rows pinned under the view editor's root and under Settings' Layout pane. */
    footing?: (view: SavedView, write: ViewWriter) => MenuRow[]
  }
}

export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = {
  table: TABLE_KIND,
  cards: CARDS_KIND,
  list: LIST_KIND,
}

export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
