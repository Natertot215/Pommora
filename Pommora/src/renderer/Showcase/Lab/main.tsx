import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@renderer/DesignSystem/Tokens'
import '../showcase.css'
import { Interactions } from './Interactions'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Interactions />
  </React.StrictMode>,
)
