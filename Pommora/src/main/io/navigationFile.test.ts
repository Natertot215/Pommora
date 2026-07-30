import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NavRef } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readNavigationFile, readNavigationState, writeNavigationState } from './navigationFile'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-navigation-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const navPath = (r: string): string => join(r, '.nexus', 'navigation.json')

describe('navigation state — one contract, routed storage', () => {
  it('reads the empty state from a fileless nexus', async () => {
    expect(await readNavigationState(root)).toEqual({})
  })

  it('round-trips refs and drops junk elements on read', async () => {
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(
      navPath(root),
      JSON.stringify({
        pinned: [{ kind: 'page', id: 'p1' }, { kind: 'nope' }, 42],
        favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
        banner: 'assets/b.jpg',
      }),
    )
    expect(await readNavigationFile(root)).toEqual({
      pinned: [{ kind: 'page', id: 'p1' }],
      favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
      banner: 'assets/b.jpg',
    })
  })

  it('an emptied array deletes its key', async () => {
    await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }] })
    await writeNavigationState(root, { pinned: [] })
    const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
    expect('pinned' in raw).toBe(false)
  })

  it('a patch touches only its own keys — the banner survives an arrays write and vice versa', async () => {
    await writeNavigationState(root, { banner: 'assets/b.jpg' })
    await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }], favorites: [] })
    expect(await readNavigationFile(root)).toEqual({
      pinned: [{ kind: 'page', id: 'p1' }],
      banner: 'assets/b.jpg',
    })
  })

  it('recents route to the row, never the file', async () => {
    await writeNavigationState(root, {
      recents: [{ kind: 'space', id: 's1' }],
      pinned: [{ kind: 'homepage' }],
    })
    expect((await readNavigationState(root)).recents).toEqual([{ kind: 'space', id: 's1' }])
    const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
    expect('recents' in raw).toBe(false)
  })

  it('an emptied recents list deletes its row', async () => {
    await writeNavigationState(root, { recents: [{ kind: 'page', id: 'p1' }] })
    await writeNavigationState(root, { recents: [] })
    expect(await readNavigationState(root)).toEqual({})
  })

  it('a live target stores as a bare ref — no path, no display fields', async () => {
    await writeNavigationState(root, {
      pinned: [{ kind: 'page', id: 'p1', path: 'A/b.md', title: 'B' } as unknown as NavRef],
      recents: [{ kind: 'set', id: 's1', path: 'A/S' } as unknown as NavRef],
    })
    const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
    expect(raw.pinned).toEqual([{ kind: 'page', id: 'p1' }])
    expect((await readNavigationState(root)).recents).toEqual([{ kind: 'set', id: 's1' }])
  })
})
