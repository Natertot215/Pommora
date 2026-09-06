import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@pommora/core/Interface/App'
import { initNativeCaret } from '@pommora/uix/Caret/nativeCaret'
import '@fontsource-variable/inter'
import '@pommora/uix/Theme'
import '@pommora/uix/Interactions/autoscroll.css'
import '@pommora/uix/Interactions/ghost-create.css'
import '@pommora/uix/Elements/over-scroll.css'
import '@pommora/uix/Cards/cards.css'
import '@pommora/uix/Interactions/reveal-bar.css'
import '@pommora/core/Interface/styles.css'
import './drag-region.css'
import '@pommora/uix/Caret/Carets.css'
import '@pommora/uix/Caret/text-selection.css'
import '@pommora/core/Interface/Sidebar/Sidebar.css'
import '@pommora/core/Interface/Interface.css'
import '@pommora/core/Interface/Header/content-banner.css'
import '@pommora/uix/Table/table-tokens.css'
import '@pommora/uix/Table/Table.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// One global drawn caret for every native text field (CodeMirror surfaces have their own).
initNativeCaret()

// Dev-only CDP drive seam: agents verify UI headlessly by calling store actions (never synthetic
// clicks near an editor — those risk real-Nexus writes).
if (import.meta.env.DEV) {
  void import('@pommora/core/Session/store').then(({ useSession }) => {
    ;(window as unknown as { __pommora: unknown }).__pommora = useSession
  })
}
