import {
  chmod,
  lstat,
  open,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { manifestAdmits } from '@pommora/core/Paths/exclusion'
import { relative } from '@pommora/core/Paths/posix'
import type { Machine } from '@pommora/core/Platform/machine'
import { noModeBits, tempRoot } from '@pommora/core/Testing/hostFs'
import { describeMachine } from '@pommora/core/Testing/machineContract'
import { syncIgnoredUnder } from '../FileWatch/watcher'
import { nodeMachine } from './nodeMachine'

const log = vi.hoisted((): string[] => [])
const synced = vi.hoisted(() => ({ hook: async (): Promise<void> => {} }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...real,
    open: async (...args: Parameters<typeof real.open>) => {
      const handle = await real.open(...args)
      const sync = handle.sync.bind(handle)
      handle.sync = async () => {
        const r = await sync()
        log.push('synced')
        await synced.hook()
        return r
      }
      const close = handle.close.bind(handle)
      handle.close = async () => {
        log.push(`close ${args[0]}`)
        return close()
      }
      return handle
    },
    rename: async (from: string, to: string) => {
      log.push(`rename ${from}`)
      return real.rename(from, to)
    },
  }
})

describeMachine('nodeMachine', async () => ({
  machine: nodeMachine,
  root: tempRoot('pom-node-machine-'),
}))

describe('nodeMachine landing', () => {
  let host: Machine
  let root: string
  const at = (rel: string): string => `${root}/${rel}`
  const renamed = (): string[] =>
    log.filter((l) => l.startsWith('rename ')).map((l) => l.slice('rename '.length))

  beforeEach(async () => {
    vi.resetModules()
    host = (await import('./nodeMachine')).nodeMachine
    root = tempRoot('pom-node-landing-')
    log.length = 0
    synced.hook = async () => {}
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('flushes every file of a group before renaming any', async () => {
    const landed = await host.land(['a.md', 'b.md', 'c.md'].map((n) => ({ path: at(n), data: n })))
    expect(landed.every((l) => l.status === 'fulfilled')).toBe(true)
    expect(log.filter((l) => l === 'synced')).toHaveLength(3)
    expect(log.lastIndexOf('synced')).toBeLessThan(log.findIndex((l) => l.startsWith('rename ')))
    for (const temp of renamed())
      expect(log.indexOf(`close ${temp}`)).toBeLessThan(log.indexOf(`rename ${temp}`))
  })

  it('a file rewritten while its group flushes is left as its writer left it', async () => {
    await writeFile(at('a.md'), 'old')
    const was = await host.stat(at('a.md'))
    synced.hook = async () => {
      synced.hook = async () => {}
      await writeFile(at('a.md'), 'written elsewhere')
    }
    const [landed] = await host.land([{ path: at('a.md'), data: 'new', expect: was }])
    expect(landed.status).toBe('rejected')
    expect(await readFile(at('a.md'), 'utf8')).toBe('written elsewhere')
  })

  it('a landing whose data cannot be written rejects and leaves no temp', async () => {
    const [landed] = await host.land([{ path: at('a.md'), data: 42 as never }])
    expect(landed.status).toBe('rejected')
    expect(await readdir(root)).toEqual([])
  })

  it.skipIf(noModeBits)('a file landed over keeps its permissions', async () => {
    await writeFile(at('a.md'), 'old')
    await chmod(at('a.md'), 0o664)
    await host.land([{ path: at('a.md'), data: 'new' }])
    expect((await stat(at('a.md'))).mode & 0o777).toBe(0o664)
  })

  it.skipIf(noModeBits)('a file whose volume refuses its permissions still lands', async () => {
    await writeFile(at('a.md'), 'old')
    await chmod(at('a.md'), 0o600)
    const probe = await open(at('a.md'))
    const refused = vi
      .spyOn(Object.getPrototypeOf(probe), 'chmod')
      .mockRejectedValue(Object.assign(new Error('refused'), { code: 'EPERM' }))
    await probe.close()
    try {
      const [landed] = await host.land([{ path: at('a.md'), data: 'new' }])
      expect(refused).toHaveBeenCalled()
      expect(landed.status).toBe('fulfilled')
      expect(await readFile(at('a.md'), 'utf8')).toBe('new')
    } finally {
      refused.mockRestore()
    }
  })

  it('names its temp so the watcher and the manifest never admit it', async () => {
    await host.land([{ path: at('a.md'), data: 'v' }])
    const [temp] = renamed()
    const scope = { excluded: [], assetDir: '' }
    expect(syncIgnoredUnder(root, scope)(temp)).toBe(true)
    expect(manifestAdmits(scope)(relative(root, temp))).toBe(false)
  })

  it('lands a symlinked file at its target and keeps the link', async () => {
    await writeFile(at('real.md'), 'old')
    await symlink(at('real.md'), at('link.md'))
    await host.land([{ path: at('link.md'), data: 'new' }])
    expect((await lstat(at('link.md'))).isSymbolicLink()).toBe(true)
    expect(await readFile(at('real.md'), 'utf8')).toBe('new')
  })
})
