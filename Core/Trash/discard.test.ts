import { mkdir, readFile, rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { atomicWriteFile, pathExists } from '../Files/atomicWrite'
import { type FileEvent, setOwnTap, setWriteTap } from '../Files/writeEcho'
import { join } from '../Paths/posix'
import { installMachine } from '../Platform/machine'
import { putJson, tempRoot } from '../Testing/hostFs'
import { diskMachine } from '../Testing/machines'
import { discard } from './discard'

let dir: string
let handed: string[]
beforeEach(async () => {
  dir = tempRoot('pom-discard-')
  handed = []
  installMachine({
    ...diskMachine(),
    trashToSystem: async (p) => {
      handed.push(await readFile(p, 'utf8'))
      await rm(p)
    },
  })
})
afterEach(async () => {
  installMachine(diskMachine())
  await rm(dir, { recursive: true, force: true })
})

describe('discard', () => {
  const doomed = async (): Promise<string> => {
    await mkdir(join(dir, 'Notes'), { recursive: true })
    const p = join(dir, 'Notes', 'doomed.md')
    await atomicWriteFile(p, 'bye')
    return p
  }

  it('hands the file to the system trash and leaves .trash unmade', async () => {
    const p = await doomed()
    await discard(dir, p)
    expect(handed).toEqual(['bye'])
    expect(await pathExists(p)).toBe(false)
    expect(await pathExists(join(dir, '.trash'))).toBe(false)
  })

  it('erases the file while Permanently Delete Files is on', async () => {
    await putJson(join(dir, '.nexus', 'settings.json'), {
      personalization: { permanentDelete: true },
    })
    const p = await doomed()
    await discard(dir, p)
    expect(handed).toEqual([])
    expect(await pathExists(p)).toBe(false)
    expect(await pathExists(join(dir, '.trash'))).toBe(false)
  })

  it('refuses on a host with no system trash and leaves the file', async () => {
    installMachine(diskMachine())
    const p = await doomed()
    await expect(discard(dir, p)).rejects.toThrow('This host has no system trash.')
    expect(await readFile(p, 'utf8')).toBe('bye')
  })

  it('records the write and notes its own unlink', async () => {
    const p = await doomed()
    const wrote: string[] = []
    const noted: FileEvent[] = []
    setWriteTap({ wrote: (w) => wrote.push(w), renamed: () => {} })
    setOwnTap(async (evs) => void noted.push(...evs))
    try {
      await discard(dir, p)
    } finally {
      setWriteTap(null)
      setOwnTap(null)
    }
    expect(wrote).toEqual([p])
    expect(noted).toEqual([{ event: 'unlink', absPath: p, origin: 'own' }])
  })
})
