import { actionsHandlers } from '../Actions/handlers'
import { assetsHandlers } from '../Assets/handlers'
import { interfaceHandlers } from '../Interface/handlers'
import { navigationHandlers } from '../Navigation/handlers'
import { nexusHandlers } from '../Nexus/handlers'
import { pagesHandlers } from '../Pages/handlers'
import { propertiesHandlers } from '../Properties/handlers'
import { settingsHandlers } from '../Settings/handlers'
import { tilesHandlers } from '../Tiles/handlers'
import { trashHandlers } from '../Trash/handlers'
import { viewsHandlers } from '../Views/handlers'
import { webHandlers } from '../Web/handlers'
import type { Handlers } from './handlers'

export const handlers: Handlers = {
  ...nexusHandlers,
  ...pagesHandlers,
  ...propertiesHandlers,
  ...viewsHandlers,
  ...tilesHandlers,
  ...trashHandlers,
  ...assetsHandlers,
  ...settingsHandlers,
  ...navigationHandlers,
  ...interfaceHandlers,
  ...webHandlers,
  ...actionsHandlers,
}
