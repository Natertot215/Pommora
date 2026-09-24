import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@pommora/uix/Theme'
import { Audit } from './Audit/Audit'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Audit />
  </React.StrictMode>,
)
