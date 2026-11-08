import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
import type { IconName } from '@pommora/uix/Symbols'
import type { SavedView, ViewFlag, ViewType, ViewWriter } from '../views'
import type { ViewHostApi } from './useViewHost'
import { TABLE_KIND } from '../Table/tableKind'
import { CARDS_KIND } from '../Cards/cardsKind'

export type SwitchEntry = {
  icon: IconName
  label: string
  key: ViewFlag
  invert?: boolean
}

export interface ViewKindRecord {
  Renderer: (p: { host: ViewHostApi }) => React.JSX.Element
  nests: boolean
  layout: {
    leaf: 'visibility' | 'switches'
    switches: SwitchEntry[]
    rows?: (view: SavedView, write: ViewWriter) => MenuRow[]
  }
}

export const BUILT_KINDS: Partial<Record<ViewType, ViewKindRecord>> = {
  table: TABLE_KIND,
  cards: CARDS_KIND,
}

export const presentedKind = (type: ViewType): ViewKindRecord => BUILT_KINDS[type] ?? TABLE_KIND
