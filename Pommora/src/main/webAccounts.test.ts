import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSessionDb, closeSessionDb } from './sessionDb'
import {
  clearWebAccounts,
  deriveWebAccount,
  listWebAccounts,
  recordWebAccount,
  removeWebAccount,
} from './webAccounts'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-web-accounts-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

describe('deriveWebAccount', () => {
  it('names the site from its own label, not a subdomain or registry suffix', () => {
    expect(deriveWebAccount('https://accounts.google.com/signin')).toMatchObject({
      domain: 'accounts.google.com',
      name: 'Google',
    })
    expect(deriveWebAccount('https://www.bbc.co.uk')).toMatchObject({
      domain: 'www.bbc.co.uk',
      name: 'Bbc',
    })
    expect(deriveWebAccount('https://github.com')).toMatchObject({
      domain: 'github.com',
      name: 'Github',
    })
  })

  it('refuses an address with no usable host', () => {
    expect(deriveWebAccount('not a url')).toBeNull()
  })
})

describe('the record rows', () => {
  it('round-trips a recorded row', () => {
    recordWebAccount('https://github.com/login')
    expect(listWebAccounts()).toMatchObject([{ domain: 'github.com', name: 'Github' }])
  })

  it('re-adding a domain refreshes its one row instead of duplicating it', () => {
    recordWebAccount('https://github.com/login')
    recordWebAccount('https://github.com/session')
    expect(listWebAccounts()).toHaveLength(1)
  })

  it('removal deletes the row; clearing empties the scope', () => {
    recordWebAccount('https://github.com')
    recordWebAccount('https://accounts.google.com')
    removeWebAccount('github.com')
    expect(listWebAccounts()).toMatchObject([{ domain: 'accounts.google.com' }])
    clearWebAccounts()
    expect(listWebAccounts()).toEqual([])
  })
})
