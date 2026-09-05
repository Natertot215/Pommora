import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { serializeOnFile } from './fileLock'
import { rewritePageSerialized, atomicWriteFile } from './atomicWrite'

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

let dir: string
let file: string
let other: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pom-lock-'))
  file = join(dir, 'f.txt')
  other = join(dir, 'other.txt')
  await writeFile(file, 'base')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('serializeOnFile', () => {
  it('runs overlapping ops on ONE path in call order, never interleaved', async () => {
    const order: string[] = []
    const a = serializeOnFile(file, async () => {
      await delay(20)
      order.push('a')
    })
    const b = serializeOnFile(file, async () => {
      order.push('b')
    })
    await Promise.all([a, b])
    expect(order).toEqual(['a', 'b']) // b waited for the slow a, though b was ready first
  })

  it('does NOT serialize different paths (they run concurrently)', async () => {
    const order: string[] = []
    const slow = serializeOnFile(file, async () => {
      await delay(20)
      order.push('slow')
    })
    const fast = serializeOnFile(other, async () => {
      order.push('fast')
    })
    await Promise.all([slow, fast])
    expect(order).toEqual(['fast', 'slow']) // the other path didn't wait
  })

  it('a rejected op does not wedge the chain — the next op still runs', async () => {
    const failed = serializeOnFile(file, async () => {
      throw new Error('boom')
    }).catch(() => 'caught')
    const next = serializeOnFile(file, async () => 'ok')
    expect(await failed).toBe('caught')
    expect(await next).toBe('ok')
  })
})

describe('rewritePageSerialized', () => {
  it('reads FRESH inside the lock — a queued rewrite sees a prior in-flight write (no lost update)', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    // Hold the lock with a gated write that replaces the file with 'A'.
    const held = serializeOnFile(file, async () => {
      await gate
      await atomicWriteFile(file, 'A')
    })
    // Queue a rewrite that appends 'Z' to whatever it reads.
    const rw = rewritePageSerialized(file, (content) => `${content}Z`)
    await delay(10)
    release()
    await Promise.all([held, rw])
    // Fresh read → sees 'A' → 'AZ'. A stale pre-read would have produced 'baseZ' (the write lost).
    expect(await readFile(file, 'utf8')).toBe('AZ')
  })

  it('returns true and writes when the rewrite yields content', async () => {
    const wrote = await rewritePageSerialized(file, (c) => `${c}!`)
    expect(wrote).toBe(true)
    expect(await readFile(file, 'utf8')).toBe('base!')
  })

  it('returns false and leaves the file untouched when the rewrite yields null', async () => {
    const wrote = await rewritePageSerialized(file, () => null)
    expect(wrote).toBe(false)
    expect(await readFile(file, 'utf8')).toBe('base')
  })

  it('skips an unreadable file, reporting not-written (no throw)', async () => {
    expect(await rewritePageSerialized(join(dir, 'ghost.txt'), () => 'x')).toBe(false)
  })
})

describe('re-entrancy', () => {
  it('refuses a second take of a key already held, instead of hanging', async () => {
    await expect(
      serializeOnFile(file, () => serializeOnFile(file, async () => 'inner')),
    ).rejects.toThrow(/Re-entrant file lock/)
  })

  it('refuses however deeply the re-take is nested', async () => {
    await expect(
      serializeOnFile(file, () =>
        serializeOnFile(other, () => serializeOnFile(file, async () => 'inner')),
      ),
    ).rejects.toThrow(/Re-entrant file lock/)
  })

  it('leaves the chain usable — a refusal must not wedge the file it names', async () => {
    await serializeOnFile(file, () => serializeOnFile(file, async () => 'inner')).catch(() => null)
    await expect(serializeOnFile(file, async () => 'after')).resolves.toBe('after')
  })

  it('still allows nesting DIFFERENT keys, which is not the deadlock', async () => {
    await expect(
      serializeOnFile(file, () => serializeOnFile(other, async () => 'inner')),
    ).resolves.toBe('inner')
  })

  it('a key is released when its slot settles — sequential takes are fine', async () => {
    await serializeOnFile(file, async () => 'first')
    await expect(serializeOnFile(file, async () => 'second')).resolves.toBe('second')
  })
})
