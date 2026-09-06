import type { BrowserWindow } from 'electron'
import { fileHistoryMenuItems } from '@pommora/core/Actions/fileHistoryMenu'
import type {
  BannerMenuAction,
  NexusIconAction,
  TitleMenuAction,
} from '@pommora/core/Actions/identityMenus'
import { iconLabel } from '@pommora/core/Actions/toggleLabels'
import type { Asks } from '@pommora/core/Contract/bridge'
import type { MenuChannel } from '@pommora/core/Contract/handlers'
import type { MutateRequest } from '@pommora/core/Pages/mutateRequest'
import { popCardMenu } from './cardMenu'
import { popCellMenu } from './cellMenu'
import { popCitationMenu } from './citationMenu'
import { popColumnMenu } from './columnMenu'
import { popConnMenu } from './connMenu'
import { popGripMenu } from './gripMenu'
import { popIconFavoriteMenu } from './iconFavoriteMenu'
import { popNavRowMenu } from './navRowMenu'
import { popOptionMenu } from './optionMenu'
import { popPageActionsMenu } from './pageActionsMenu'
import { popPropertyMenu } from './propertyMenu'
import { popReturningMenu } from './returningMenu'
import { popModelMenu, popRowMenu } from './rowMenu'
import { popTabMenu } from './tabMenu'
import { popTableMenu } from './tableMenu'
import { popTrashColumnMenu, popTrashMenu } from './trashMenu'
import { popViewButtonMenu } from './viewButtonMenu'
import { popEmbedAreaMenu, popEmbedTitleMenu } from './viewEmbedMenu'
import { popViewRowMenu } from './viewRowMenu'

export type Popper<K extends MenuChannel> = (
  win: BrowserWindow,
  ...args: Asks[K]['args']
) => Promise<Asks[K]['reply']>

/** The native popper behind each menu channel. */
export const poppers: { [K in MenuChannel]: Popper<K> } = {
  'history:menu': (win, c) => popModelMenu(win, fileHistoryMenuItems(c.batch)),
  'create-menu': (win, items) =>
    popReturningMenu<MutateRequest>(win, (pick) =>
      items.map((it) => ({ label: it.label, click: pick(it.req) })),
    ),
  'view-button-menu': popViewButtonMenu,
  'view-row-menu': popViewRowMenu,
  'view-embed-title-menu': (win, a) => popEmbedTitleMenu(win, a.iconShown, a.level),
  'view-embed-area-menu': popEmbedAreaMenu,
  'icon-favorite-menu': popIconFavoriteMenu,
  'nexus:iconMenu': (win, opts) =>
    popReturningMenu<NexusIconAction>(win, (pick) => [
      { label: 'Edit Icon', click: pick('changeIcon') },
      ...(opts.hasPhoto ? [{ label: 'Edit Photo', click: pick('editPhoto') }] : []),
      { label: opts.hasPhoto ? 'Change Photo' : 'Add Photo', click: pick('addPhoto') },
      ...(opts.hasPhoto || opts.hasGlyph ? [{ type: 'separator' as const }] : []),
      ...(opts.hasPhoto ? [{ label: 'Remove Photo', click: pick('removePhoto') }] : []),
      ...(opts.hasGlyph ? [{ label: 'Remove Icon', click: pick('removeIcon') }] : []),
    ]),
  // The noun follows the surface's vocabulary (Banner by default). Add resolves 'change' (both
  // routes open the image picker).
  'nexus:bannerMenu': (win, opts) => {
    const noun = opts?.noun ?? 'Banner'
    return popReturningMenu<BannerMenuAction>(win, (pick) =>
      opts?.add
        ? [{ label: `Add ${noun}`, click: pick('change') }]
        : [
            { label: `Edit ${noun}`, click: pick('edit') },
            { label: `Change ${noun}`, click: pick('change') },
            ...(opts?.noRemove ? [] : [{ label: `Remove ${noun}`, click: pick('remove') }]),
          ],
    )
  },
  // Edit Icon unless `noEditIcon` — the homepage sets its icon from the settings pane, not here.
  'nexus:titleMenu': (win, opts = {}) =>
    popReturningMenu<TitleMenuAction>(win, (pick) => [
      { label: 'Rename', click: pick('rename') },
      ...(opts.noEditIcon ? [] : [{ label: 'Edit Icon', click: pick('editIcon') }]),
      ...(opts.toggleIcon
        ? [{ label: iconLabel(!opts.iconHidden), click: pick('toggleIcon') }]
        : []),
    ]),
  'table-menu': popTableMenu,
  'grip-menu': popGripMenu,
  'column-menu': popColumnMenu,
  'cell-menu': popCellMenu,
  'page-actions-menu': popPageActionsMenu,
  'card-menu': popCardMenu,
  'trash:menu': popTrashMenu,
  'trash:columnMenu': popTrashColumnMenu,
  'tab-menu': popTabMenu,
  'nav-row-menu': popNavRowMenu,
  'conn-menu': popConnMenu,
  'citation-menu': popCitationMenu,
  'property-menu': popPropertyMenu,
  'option-menu': popOptionMenu,
  'row-menu': popRowMenu,
}
