import { describe, it, expect, beforeEach } from 'vitest'
import { installMachine, machine } from './machine'
import { join } from '../Paths/posix'
import { corpusFilesUnder, listEntries } from '../Files/walk'
import {
  atomicWriteFile,
  readJsonStrict,
  readTextOrNull,
  rewritePageSerialized,
  rewritePreservingTimes,
  writeJson,
} from '../Files/atomicWrite'
import { memoryMachine, type MemoryFs } from '../Testing/machines'

let fs: MemoryFs

const ROOT = '/nexus'
const SCOPE = { excluded: ['Hidden'], assetDir: '.nexus/assets' }

beforeEach(() => {
  const m = memoryMachine()
  fs = m.fs
  installMachine(m.machine)
  for (const d of [ROOT, join(ROOT, 'Notes'), join(ROOT, 'Hidden'), join(ROOT, '.trash')])
    fs.dirs.add(d)
  fs.files.set(join(ROOT, 'Notes', 'A.md'), { text: '---\nID: x\n---\nbody\n', mtimeMs: 500 })
  fs.files.set(join(ROOT, 'Hidden', 'B.md'), { text: 'hidden\n', mtimeMs: 500 })
  fs.files.set(join(ROOT, '.trash', 'C.md'), { text: 'trashed\n', mtimeMs: 500 })
})

describe('Core over an in-memory machine', () => {
  it('walks the corpus through readDir, pruning what the scope excludes', async () => {
    expect(await corpusFilesUnder(ROOT, ROOT, SCOPE)).toEqual(['Notes/A.md'])
    expect((await listEntries(ROOT)).map((e) => e.name).sort()).toEqual([
      '.trash',
      'Hidden',
      'Notes',
    ])
    expect(await listEntries(join(ROOT, 'Missing'))).toEqual([])
  })

  it('writes and reads a page and a JSON file through the seam', async () => {
    const page = join(ROOT, 'Notes', 'A.md')
    expect(await rewritePageSerialized(page, (c) => `${c}more\n`)).toBe(true)
    expect(await readTextOrNull(page)).toBe('---\nID: x\n---\nbody\nmore\n')
    await writeJson(join(ROOT, 'Notes', '_pagecollection.json'), { id: 'c1' })
    const read = await readJsonStrict(join(ROOT, 'Notes', '_pagecollection.json'))
    expect(read.ok && read.value).toEqual({ id: 'c1' })
    expect(await readTextOrNull(join(ROOT, 'ghost.md'))).toBeNull()
  })

  it('a sweep rewrite keeps the modification time; a plain write moves it', async () => {
    const page = join(ROOT, 'Notes', 'A.md')
    await rewritePreservingTimes(page, 'swept\n')
    expect(fs.files.get(page)).toEqual({ text: 'swept\n', mtimeMs: 500 })
    await atomicWriteFile(page, 'edited\n')
    expect(fs.files.get(page)?.mtimeMs).toBeGreaterThan(500)
  })

  it('the lock refuses a re-take of a held key and nests different keys', async () => {
    const m = machine()
    await expect(m.lock('a', () => m.lock('a', async () => 'inner'))).rejects.toThrow(/Re-entrant/)
    await expect(m.lock('a', () => m.lock('b', async () => 'inner'))).resolves.toBe('inner')
    await expect(m.lock('a', async () => 'after')).resolves.toBe('after')
  })
})
