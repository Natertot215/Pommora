import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atomicWriteFile } from '../Files/atomicWrite'
import { setWriteTap } from '../Files/writeEcho'
import { basename, join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { discardFile } from './discard'

let dir: string
beforeEach(async () => {
  dir = tempRoot('pom-discard-')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('discardFile', () => {
  const trashed = async (...chain: string[]): Promise<string[]> => {
    const at = join(dir, '.trash', ...chain)
    return (await readdir(at)).map((leaf) => join(at, leaf))
  }

  it('moves a file into .trash under a stamped leaf and removes the original', async () => {
    const p = join(dir, 'doomed.md')
    await atomicWriteFile(p, 'bye')
    await discardFile(dir, p)
    const [dest] = await trashed()
    expect(basename(dest).endsWith('__doomed.md')).toBe(true)
    expect(await readFile(dest, 'utf8')).toBe('bye')
    await expect(stat(p)).rejects.toThrow()
  })

  it('records both ends of the move', async () => {
    const p = join(dir, 'reported.md')
    await atomicWriteFile(p, 'bye')
    const seen: string[] = []
    setWriteTap({ wrote: (w) => seen.push(w), renamed: () => {} })
    await discardFile(dir, p)
    setWriteTap(null)
    expect(seen).toEqual([p, ...(await trashed())])
  })

  it('mirrors the folder chain the file was deleted from', async () => {
    await mkdir(join(dir, 'Notes', 'Daily'), { recursive: true })
    const p = join(dir, 'Notes', 'Daily', 'Beta.md')
    await atomicWriteFile(p, 'bye')
    await discardFile(dir, p)
    const [dest] = await trashed('Notes', 'Daily')
    expect(basename(dest).endsWith('__Beta.md')).toBe(true)
    expect(await readFile(dest, 'utf8')).toBe('bye')
  })

  it('de-collides two trashes of the same name from the same folder', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    try {
      const p = join(dir, 'twice.md')
      await atomicWriteFile(p, 'one')
      await discardFile(dir, p)
      await atomicWriteFile(p, 'two')
      await discardFile(dir, p)
      const kept = await Promise.all((await trashed()).map((f) => readFile(f, 'utf8')))
      expect(kept.sort()).toEqual(['one', 'two'])
    } finally {
      vi.useRealTimers()
    }
  })
})
