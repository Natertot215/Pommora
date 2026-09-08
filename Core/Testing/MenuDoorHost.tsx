import { MenuDoorContext } from '@pommora/uix/Pickers/PickerControl'
import { popMenu } from '../Actions/menuActions'
import { MenuPresenter } from '../Interface/Menus/MenuPresenter'

export function MenuDoorHost({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <MenuDoorContext.Provider value={popMenu}>
      {children}
      <MenuPresenter />
    </MenuDoorContext.Provider>
  )
}
