import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readScope } from './localState'

let root: string
const nexus = (): string => join(root, '.nexus')
const write = (file: string, body: unknown): Promise<void> =>
  writeFile(join(nexus(), file), JSON.stringify(body))

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-legacy-'))
  await mkdir(nexus(), { recursive: true })
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

describe('importLegacySidecars', () => {
  it('lifts every sidecar into its scope and deletes the file', async () => {
    await write('folds.json', { p1: ['intro'] })
    await write('viewOrders.json', { v1: ['a', 'b'] })
    await write('activeViews.json', { c1: 'v9' })
    await write('linkTitles.json', { 'https://x': 'X' })
    await write('tableHeadingColumns.json', { p1: [0, 2] })

    openSessionDb(root)

    expect(readScope<string[]>('folds')).toEqual({ p1: ['intro'] })
    expect(readScope<string[]>('viewOrder')).toEqual({ v1: ['a', 'b'] })
    expect(readScope<string>('activeView')).toEqual({ c1: 'v9' })
    expect(readScope<string>('linkTitle')).toEqual({ 'https://x': 'X' })
    expect(readScope<number[]>('headingCols')).toEqual({ p1: [0, 2] })
    for (const f of [
      'folds.json',
      'viewOrders.json',
      'activeViews.json',
      'linkTitles.json',
      'tableHeadingColumns.json',
    ]) {
      expect(existsSync(join(nexus(), f)), f).toBe(false)
    }
  })

  it('runs once — a reopen after the lift leaves the rows alone', async () => {
    await write('viewOrders.json', { v1: ['a'] })
    openSessionDb(root)
    closeSessionDb()
    openSessionDb(root)
    expect(readScope<string[]>('viewOrder')).toEqual({ v1: ['a'] })
  })

  it('drops malformed entries but keeps the well-formed siblings', async () => {
    await write('folds.json', { good: ['h1'], bad: 42, alsoBad: [1, 2] })
    openSessionDb(root)
    expect(readScope<string[]>('folds')).toEqual({ good: ['h1'] })
  })

  it('a corrupt or absent file is skipped without throwing', async () => {
    await writeFile(join(nexus(), 'folds.json'), '{not json')
    expect(() => openSessionDb(root)).not.toThrow()
    expect(readScope('folds')).toEqual({})
    expect(readScope('viewOrder')).toEqual({})
  })
})
