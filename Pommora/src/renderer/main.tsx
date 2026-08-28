import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initNativeCaret } from './nativeCaret'
import '@fontsource-variable/inter'
import '@renderer/DesignSystem/Tokens'
import '@renderer/DesignSystem/Interactions/autoscroll.css'
import '@renderer/DesignSystem/Interactions/dropChrome.css'
import '@renderer/DesignSystem/Interactions/ghost.css'
import '@renderer/DesignSystem/Interactions/OverScroll/overScroll.css'
import './Cards/cards.css'
import '@renderer/DesignSystem/Interactions/resize-strip.css'
import '@renderer/DesignSystem/Interactions/reveal-bar.css'
import './styles.css'
import './Carets.css'
import './Sidebar/Sidebar.css'
import './Interface/Interface.css'
import './Interface/content-banner.css'
import './Tables/table-tokens.css'
import './Tables/Table.css'

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
  void import('./store').then(({ useSession }) => {
    ;(window as unknown as { __pommora: unknown }).__pommora = useSession
  })
}
