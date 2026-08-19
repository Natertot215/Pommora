// The web-account records — device-local rows in nexus.db, recorded at Add Account, never
// derived from the cookie store (which cannot distinguish signed-in from visited). The session
// wipes that accompany sign-out and clear-browsing live with the guest-session owner in
// webGuests.ts; this module owns only the rows.

import type { WebAccount } from '@shared/types'
import { readScope, writeKey } from './db/localState'

// Second-level labels that are registry suffixes, not the site — bbc.co.uk names BBC, not Co.
const REGISTRY_LABELS = new Set(['co', 'com', 'net', 'org', 'ac', 'gov', 'edu'])

/** The row a sign-in address becomes: the hostname as identity, and a display name from the
 *  site's own label. Null when the address has no usable host. */
export function deriveWebAccount(url: string): WebAccount | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host) return null
  const labels = host.split('.')
  let core = labels.length >= 2 ? labels[labels.length - 2] : labels[0]
  if (REGISTRY_LABELS.has(core) && labels.length >= 3) core = labels[labels.length - 3]
  const name = core ? core[0].toUpperCase() + core.slice(1) : host
  return { domain: host, name, addedAt: Date.now() }
}

export function listWebAccounts(): WebAccount[] {
  return Object.values(readScope<WebAccount>('webAccounts')).sort((a, b) => a.addedAt - b.addedAt)
}

/** Records the row immediately — an abandoned sign-in leaves an unauthenticated row that
 *  Sign Out removes. Re-adding a domain refreshes its row in place. */
export function recordWebAccount(url: string): WebAccount | null {
  const account = deriveWebAccount(url)
  if (account) writeKey('webAccounts', account.domain, account)
  return account
}

export function removeWebAccount(domain: string): void {
  writeKey('webAccounts', domain, null)
}

export function clearWebAccounts(): void {
  for (const domain of Object.keys(readScope<WebAccount>('webAccounts')))
    writeKey('webAccounts', domain, null)
}
