import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Machine } from '../Platform/machine'

const EMPTY_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export function describeMachine(
  name: string,
  make: () => Promise<{ machine: Machine; root: string }>,
): void {
  describe(name, () => {
    let machine: Machine
    let root: string
    const at = (rel: string): string => `${root}/${rel}`

    beforeEach(async () => {
      ;({ machine, root } = await make())
    })
    afterEach(async () => {
      await rm(root, { recursive: true, force: true })
    })

    it('reads an absent file as null', async () => {
      expect(await machine.readText(at('ghost.md'))).toBeNull()
      expect(await machine.readBytes(at('ghost.md'))).toBeNull()
    })

    it('writes then reads text and bytes', async () => {
      await machine.writeText(at('a.txt'), 'hello')
      expect(await machine.readText(at('a.txt'))).toBe('hello')
      const bytes = await machine.readBytes(at('a.txt'))
      expect(bytes && new TextDecoder().decode(bytes)).toBe('hello')
    })

    it('stats a file and a directory, and an absent path as null', async () => {
      await machine.writeText(at('a.txt'), 'hello')
      const s = await machine.stat(at('a.txt'))
      expect(s?.size).toBe(5)
      expect(s?.isDirectory).toBe(false)
      expect(typeof s?.mtimeMs).toBe('number')
      await machine.mkdir(at('sub'))
      expect((await machine.stat(at('sub')))?.isDirectory).toBe(true)
      expect(await machine.stat(at('missing'))).toBeNull()
    })

    it('lists a directory by kind and an absent one as []', async () => {
      await machine.mkdir(at('sub'))
      await machine.writeText(at('a.txt'), 'x')
      const entries = (await machine.readDir(root)).sort((a, b) => a.name.localeCompare(b.name))
      expect(entries).toEqual([
        { name: 'a.txt', kind: 'file' },
        { name: 'sub', kind: 'dir' },
      ])
      expect(await machine.readDir(at('ghost'))).toEqual([])
    })

    it('mkdir reports created then exists', async () => {
      expect(await machine.mkdir(at('d'))).toBe('created')
      expect(await machine.mkdir(at('d'))).toBe('exists')
    })

    it('renames a file', async () => {
      await machine.writeText(at('x.txt'), 'v')
      await machine.rename(at('x.txt'), at('y.txt'))
      expect(await machine.readText(at('y.txt'))).toBe('v')
      expect(await machine.readText(at('x.txt'))).toBeNull()
    })

    it('removes a file', async () => {
      await machine.writeText(at('z.txt'), 'v')
      await machine.remove(at('z.txt'))
      expect(await machine.readText(at('z.txt'))).toBeNull()
    })

    it('utimes moves the modification time', async () => {
      await machine.writeText(at('t.txt'), 'v')
      await machine.utimes(at('t.txt'), 2_000_000_000_000)
      expect((await machine.stat(at('t.txt')))?.mtimeMs).toBe(2_000_000_000_000)
    })

    it('realpath answers the root it was given', async () => {
      expect(await machine.realpath(root)).toBe(root)
    })

    it('hashes the empty string to the known digest', () => {
      expect(machine.sha256Hex('')).toBe(EMPTY_SHA)
    })

    it('serializes overlapping takes of one key in call order', async () => {
      const order: number[] = []
      const first = machine.lock('k', async () => {
        await delay(20)
        order.push(1)
      })
      await delay(0)
      const second = machine.lock('k', async () => {
        order.push(2)
      })
      await Promise.all([first, second])
      expect(order).toEqual([1, 2])
    })

    it('rejects a re-take of a held key and nests different keys', async () => {
      await expect(machine.lock('a', () => machine.lock('a', async () => 'inner'))).rejects.toThrow(
        /Re-entrant/,
      )
      await expect(machine.lock('a', () => machine.lock('b', async () => 'ok'))).resolves.toBe('ok')
    })
  })
}
