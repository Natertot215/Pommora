import { afterEach, describe, expect, it } from 'vitest'
import { createDisambiguated, nameError, reservedAssetLeaf } from './names'
import { CROPS_REL } from './nexusPaths'
import { installMachine, machine } from '../Platform/machine'
import { diskMachine } from '../Testing/machines'
import { fail, ok } from '../Contract/result'

afterEach(() => installMachine(diskMachine()))

describe('nameError — shared rules', () => {
  it('accepts ordinary titles in either role', () => {
    for (const n of ['Note', 'My Note', 'CS 161', 'a_b', 'Draft_', 'Q3 (Draft)', 'Pro[ject'])
      for (const role of ['page', 'directory'] as const) expect(nameError(n, role), n).toBe(null)
  })

  it('rejects empty, separators, NUL, and dot dirs', () => {
    for (const n of ['', '   ', 'a/b', 'a\\b', 'a\0b', '.', '..'])
      expect(nameError(n, 'page'), JSON.stringify(n)).not.toBe(null)
  })

  it('rejects a leading or trailing space — the name must equal what lands on disk', () => {
    for (const n of [' Note', 'Note ', 'Note\t']) expect(nameError(n, 'page'), n).not.toBe(null)
  })

  it('rejects a hidden prefix and a pipe', () => {
    for (const n of ['_Draft', '.hidden', 'A|B']) expect(nameError(n, 'page'), n).not.toBe(null)
  })
})

describe('nameError — role differences', () => {
  it('a page keeps periods but refuses a trailing .md', () => {
    for (const n of ['My.Note', 'Thing.task.json', 'Report.pdf'])
      expect(nameError(n, 'page'), n).toBe(null)
    for (const n of ['Note.md', 'Note.MD']) expect(nameError(n, 'page'), n).not.toBe(null)
  })

  it('a directory refuses any period', () => {
    for (const n of ['Q3.2025', 'crops.json', 'contexts.json', 'v1.2'])
      expect(nameError(n, 'directory'), n).not.toBe(null)
  })
})

describe('nameError — Windows rules are gated on the host', () => {
  const WIN = [
    'CON',
    'prn',
    'com1',
    'lpt9',
    'a<b',
    'a>b',
    'a:b',
    'a"b',
    'a?b',
    'a*b',
    'Note.',
    'CON.txt',
  ]

  it('a posix host allows the reserved characters, device names, and a trailing period', () => {
    for (const n of ['CON', 'CON.txt', 'a<b', 'a?b', 'Note.'])
      expect(nameError(n, 'page'), n).toBe(null)
  })

  it('a Windows host refuses them', () => {
    installMachine({ ...machine(), platform: 'windows' })
    for (const n of WIN) expect(nameError(n, 'page'), n).not.toBe(null)
  })
})

describe('reservedAssetLeaf', () => {
  it('claims crops.json at the assets root, case-folded, and nothing else', () => {
    expect(reservedAssetLeaf(CROPS_REL)).toBe(true)
    expect(reservedAssetLeaf(CROPS_REL.toUpperCase())).toBe(true)
    expect(reservedAssetLeaf('.nexus/assets/photo.png')).toBe(false)
  })
})

describe('createDisambiguated', () => {
  it('steps the name aside while the write reports it is taken', async () => {
    const taken = new Set(['Untitled', 'Untitled 2'])
    const r = await createDisambiguated('Untitled', async (name) =>
      taken.has(name) ? fail('exists', 'taken') : ok(name),
    )
    expect(r).toEqual(ok('Untitled 3'))
  })

  it('stops at any error that is not a collision', async () => {
    const r = await createDisambiguated('X', async () => fail('invalid-name', 'no'))
    expect(r.ok).toBe(false)
  })
})
