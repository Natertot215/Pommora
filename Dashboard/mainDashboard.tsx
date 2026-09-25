import React from 'react'
import { createRoot } from 'react-dom/client'
import '@pommora/uix/Theme'
import './dashboard.css'
import { LedgerLeaf } from './Ledger/LedgerLeaf'
import { Audit } from './Audit/Audit'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LedgerLeaf />
    <Audit />
  </React.StrictMode>,
)
