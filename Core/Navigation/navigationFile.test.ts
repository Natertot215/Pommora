import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NavRef } from './navRef'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { readNavigationFile, readNavigationState, writeNavigationState } from './navigationFile'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-navigation-'))
  installStores(memoryStores().stores)
})
afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

const statePath = (r: string): string => join(r, '.nexus', 'state.json')
const readState = async (): Promise<{
  navigation: Record<string, unknown>
  [k: string]: unknown
}> => JSON.parse(await readFile(statePath(root), 'utf8'))
const seedState = async (state: unknown): Promise<void> => {
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(statePath(root), typeof state === 'string' ? state : JSON.stringify(state))
}

describe('navigation state — one contract, routed storage', () => {
  it('reads the empty state from a fileless nexus', async () => {
    expect(await readNavigationState(root)).toEqual({})
  })

  it('round-trips refs and drops junk elements on read', async () => {
    await seedState({
      navigation: {
        pinned: [{ kind: 'page', id: 'p1' }, { kind: 'nope' }, 42],
        favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
        banner: '.nexus/assets/b.jpg',
      },
    })
    expect(await readNavigationFile(root)).toEqual({
      pinned: [{ kind: 'page', id: 'p1' }],
      favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
      banner: '.nexus/assets/b.jpg',
    })
  })

  it('an emptied array deletes its key', async () => {
    await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }] })
    await writeNavigationState(root, { pinned: [] })
    expect('pinned' in (await readState()).navigation).toBe(false)
  })

  it('a patch touches only its own keys — the banner survives an arrays write and vice versa', async () => {
    await writeNavigationState(root, { banner: '.nexus/assets/b.jpg' })
    await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }], favorites: [] })
    expect(await readNavigationFile(root)).toEqual({
      pinned: [{ kind: 'page', id: 'p1' }],
      banner: '.nexus/assets/b.jpg',
    })
  })

  it('recents route to the row, never the file', async () => {
    await writeNavigationState(root, {
      recents: [{ kind: 'space', id: 's1' }],
      pinned: [{ kind: 'homepage' }],
    })
    expect((await readNavigationState(root)).recents).toEqual([{ kind: 'space', id: 's1' }])
    expect('recents' in (await readState()).navigation).toBe(false)
  })

  it('an emptied recents list deletes its row', async () => {
    await writeNavigationState(root, { recents: [{ kind: 'page', id: 'p1' }] })
    await writeNavigationState(root, { recents: [] })
    expect(await readNavigationState(root)).toEqual({})
  })

  it('the banner gate: only a shared-assets path survives either direction', async () => {
    await seedState({ navigation: { banner: '../taxes-2025.pdf' } })
    expect(await readNavigationFile(root)).toEqual({})
    await writeNavigationState(root, { banner: 'Notes/Alpha.md' })
    expect('banner' in (await readState()).navigation).toBe(false)
    await writeNavigationState(root, { banner: '.nexus/assets/banner-x.jpg' })
    expect((await readNavigationFile(root)).banner).toBe('.nexus/assets/banner-x.jpg')
  })

  it('a write REFUSES an unreadable file rather than clobbering it', async () => {
    await seedState('{ corrupt')
    await expect(writeNavigationState(root, { pinned: [{ kind: 'homepage' }] })).rejects.toThrow()
    expect(await readFile(statePath(root), 'utf8')).toBe('{ corrupt')
  })

  it('the order section and foreign keys ride through a navigation write untouched', async () => {
    await seedState({
      order: { collections: ['c1'] },
      myNote: 'keep me',
      navigation: { mine: 1 },
    })
    await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }] })
    const raw = await readState()
    expect(raw.order).toEqual({ collections: ['c1'] })
    expect(raw.myNote).toBe('keep me')
    expect(raw.navigation).toEqual({ mine: 1, pinned: [{ kind: 'page', id: 'p1' }] })
  })

  it('a homepage ref smuggling an id drops, as does an empty id', async () => {
    await seedState({
      navigation: {
        pinned: [{ kind: 'homepage' }, { kind: 'homepage', id: 'x' }, { kind: 'page', id: '' }],
      },
    })
    expect((await readNavigationFile(root)).pinned).toEqual([{ kind: 'homepage' }])
  })

  it('a live target stores as a bare ref — no path, no display fields', async () => {
    await writeNavigationState(root, {
      pinned: [{ kind: 'page', id: 'p1', path: 'A/b.md', title: 'B' } as unknown as NavRef],
      recents: [{ kind: 'set', id: 's1', path: 'A/S' } as unknown as NavRef],
    })
    expect((await readState()).navigation.pinned).toEqual([{ kind: 'page', id: 'p1' }])
    expect((await readNavigationState(root)).recents).toEqual([{ kind: 'set', id: 's1' }])
  })
})
