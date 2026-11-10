import { type MenuRow, switchRow } from '@pommora/uix/Menus/MenuIndex'
import { ROOT_ROW_LOOK } from '@pommora/uix/Menus/frames.css'
import type { IconName } from '@pommora/uix/Symbols'
import { type SavedView, type ViewFlag, type ViewWriter, viewOption } from '../views'

export interface ViewSwitch {
  icon: IconName
  label: string
  key: ViewFlag
  invert?: boolean
}

export const TITLE_ICONS: ViewSwitch = {
  icon: 'file-text',
  label: 'Title Icons',
  key: 'hide_page_icons',
  invert: true,
}

export const switchRows = (switches: ViewSwitch[], view: SavedView, save: ViewWriter): MenuRow[] =>
  switches.map(({ icon, label, key, invert = false }) =>
    switchRow(
      icon,
      label,
      viewOption(view, key) !== invert,
      (next) => void save({ [key]: next !== invert }),
      ROOT_ROW_LOOK,
    ),
  )
