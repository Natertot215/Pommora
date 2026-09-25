import { setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
import { popMenu } from '../Actions/menuActions'
import { MenuPresenter } from '../Interface/Menus/MenuPresenter'

setMenuDoor(popMenu)

export function MenuDoorHost({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      {children}
      <MenuPresenter />
    </>
  )
}
