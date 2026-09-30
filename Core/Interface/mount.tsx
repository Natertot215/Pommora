import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initNativeCaret } from '@pommora/uix/Theme/nativeCaret'
import { setMenuDoor } from '@pommora/uix/Pickers/PickerControl'
import { popMenu } from '../Actions/menuActions'
import '@pommora/uix/Theme'
import '@pommora/uix/Interactions/ghost-create.css'
import '@pommora/uix/Interactions/reveal-bar.css'
import './styles.css'
import '@pommora/uix/Theme/caret.css'
import './interface.css'
import './Header/content-banner.css'
import '@pommora/uix/Table/table-tokens.css'
import '@pommora/uix/Table/table.css'

/** Everything the app needs to run in any host's window; the host adds only what its shell owns. */
export function mountApp(root: HTMLElement): void {
  setMenuDoor(popMenu)
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  // One global drawn caret for every native text field (CodeMirror surfaces have their own).
  initNativeCaret()
}
