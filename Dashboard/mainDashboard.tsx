import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@pommora/uix/Theme'
import './dashboard.css'
import { LedgerLeaf } from './Ledger/LedgerLeaf'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LedgerLeaf />
  </React.StrictMode>,
)
