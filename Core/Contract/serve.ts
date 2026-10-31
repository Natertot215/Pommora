import { actionsHandlers } from '../Actions/handlers'
import { assetsHandlers } from '../Assets/handlers'
import { bundlesHandlers } from '../Bundles/handlers'
import { interfaceHandlers } from '../Interface/handlers'
import { matrixHandlers } from '../Matrix/handlers'
import { navigationHandlers } from '../Navigation/handlers'
import { nexusHandlers } from '../Nexus/handlers'
import { pagesHandlers } from '../Pages/handlers'
import { propertiesHandlers } from '../Properties/handlers'
import { settingsHandlers } from '../Settings/handlers'
import { syncHandlers } from '../Sync/handlers'
import { tilesHandlers } from '../Tiles/handlers'
import { viewsHandlers } from '../Views/handlers'
import { webHandlers } from '../Web/handlers'
import type { Handlers } from './handlers'

export const handlers: Handlers = {
  ...nexusHandlers,
  ...pagesHandlers,
  ...propertiesHandlers,
  ...viewsHandlers,
  ...tilesHandlers,
  ...bundlesHandlers,
  ...assetsHandlers,
  ...settingsHandlers,
  ...syncHandlers,
  ...navigationHandlers,
  ...matrixHandlers,
  ...interfaceHandlers,
  ...webHandlers,
  ...actionsHandlers,
}
