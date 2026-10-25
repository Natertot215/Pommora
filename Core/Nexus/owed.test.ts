import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { fail, ok } from '../Contract/result'
import { manifestAdmits } from '../Paths/exclusion'
import { ASSETS_DIR_REL, OWED_REL } from '../Paths/nexusPaths'
import { dirname, join } from '../Paths/posix'
import { noModeBits, putJson, tempRoot } from '../Testing/hostFs'
import {
  editNote,
  type Notes,
  owedDelete,
  owedName,
  owedRename,
  owedSwept,
  readNotes,
  relinkNote,
  restoreNote,
  runNoted,
  withOption,
} from './owed'

let root: string
let file: string
beforeEach(() => {
  root = tempRoot('pom-owed-')
  file = join(root, OWED_REL)
})
afterEach(async () => {
  await chmod(file, 0o644).catch(() => {})
  await rm(root, { recursive: true, force: true })
})

const clean = { skipped: 0, hosts: [] }

describe('the compose rules', () => {
  it('a rename appends the old name and drops the new one', () => {
    expect(owedRename({}, 'a', 'b')).toEqual({ rename: ['a'] })
    expect(owedRename({ rename: ['a'] }, 'b', 'c')).toEqual({ rename: ['a', 'b'] })
  })

  it('renaming back composes to the name the second rename left', () => {
    const back = owedRename(owedRename({}, 'a', 'b'), 'b', 'a')
    expect(back).toEqual({ rename: ['b'] })
    expect(owedSwept(back, ['b'])).toEqual({})
  })

  it('a delete moves every owed old name and the current one into strip', () => {
    expect(owedDelete({ rename: ['a'] }, 'b')).toEqual({ strip: ['a', 'b'] })
  })

  it('a clean sweep keeps a Clear’s mark', () => {
    expect(owedSwept({ strip: ['a', 'High'], kept: true }, ['a'])).toEqual({
      strip: ['High'],
      kept: true,
    })
  })

  it('an option part emptied by an edit leaves the entry', () => {
    expect(
      withOption({ kind: 'property', options: { o1: { rename: ['a'] } } }, 'o1', (o) =>
        owedSwept(o, ['a']),
      ),
    ).toEqual({ kind: 'property' })
  })

  it('a relink composes onto the move before it', () => {
    expect(
      relinkNote(relinkNote(undefined, new Map([['a', 'B']]), 'B'), new Map([['b', 'C']])),
    ).toEqual({ kind: 'relink', label: 'B', names: { a: 'C', b: 'C' } })
  })

  it('a restore’s repair follows a later move without taking its keys', () => {
    expect(
      relinkNote(
        { kind: 'relink', label: 'A', names: { a: 'B' }, files: ['X/A.md'] },
        new Map([['b', 'C']]),
      ),
    ).toEqual({ kind: 'relink', label: 'A', names: { a: 'C' }, files: ['X/A.md'] })
  })
})

describe('the notes file', () => {
  const seed = { P: { kind: 'property', rename: ['a'] } }

  it('an edit that leaves nothing owed removes the entry', async () => {
    await putJson(file, seed)
    await editNote(root, 'P', (e) => e && { ...e, ...owedSwept(e, ['a']) })
    await expect(stat(file)).rejects.toThrow()
    expect(await readNotes(root)).toEqual({})
  })

  it('an edit answers the entry as it stood', async () => {
    await putJson(file, seed)
    expect(await editNote(root, 'P', (e) => e && { ...e, ...owedSwept(e, ['a']) })).toEqual(
      ok({ kind: 'property', rename: ['a'] }),
    )
  })

  it.skipIf(noModeBits)('an unreadable notes file refuses the edit', async () => {
    await putJson(file, seed)
    const bytes = await readFile(file, 'utf8')
    await chmod(file, 0o000)
    expect((await editNote(root, 'P', () => undefined)).ok).toBe(false)
    await chmod(file, 0o644)
    expect(await readFile(file, 'utf8')).toBe(bytes)
  })

  it('a corrupt notes file is set aside and rebuilt', async () => {
    await putJson(file, seed)
    await writeFile(file, '{')
    expect((await editNote(root, 'P', () => ({ kind: 'property', rename: ['b'] }))).ok).toBe(true)
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', rename: ['b'] } })
    expect((await readdir(dirname(file))).some((f) => f.includes('.owed.json.bad-'))).toBe(true)
  })

  it('a notes file damaged before the session read it says once that its work was lost', async () => {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, '{')
    const change = {
      note: () => ({ kind: 'property' as const, rename: ['a'] }),
      list: async () => ok(null),
      sweep: async () => clean,
      settle: () => undefined,
    }
    const first = await runNoted(root, 'P', change)
    expect(first.ok && first.value.cascade.warning).toMatch(
      /Unfinished work from an earlier session couldn’t be read and was lost\.$/,
    )
    const second = await runNoted(root, 'P', change)
    expect(second.ok && second.value.cascade.warning).toBeUndefined()
  })

  it('the notes file is neither watched nor synced', () => {
    expect(manifestAdmits({ excluded: [], assetDir: ASSETS_DIR_REL })(OWED_REL)).toBe(false)
  })
})

describe('owedName', () => {
  it('a name another item owes is refused within its owner, folding case', () => {
    const notes: Notes = {
      P: { kind: 'property', rename: ['Priority'] },
      Q: { kind: 'property', strip: ['Stage'] },
      S: { kind: 'space', contextId: 'C1', rename: ['Gym'] },
    }
    const property = { kind: 'property' } as const
    expect(owedName(notes, { owner: property, name: 'stage', except: 'P' })).toBe(true)
    expect(owedName(notes, { owner: property, name: 'Priority', except: 'P' })).toBe(false)
    expect(owedName(notes, { owner: { kind: 'space', contextId: 'C1' }, name: 'Gym' })).toBe(true)
    expect(owedName(notes, { owner: { kind: 'space', contextId: 'C2' }, name: 'Gym' })).toBe(false)
    const options: Notes = { P: { kind: 'property', options: { o1: { rename: ['High'] } } } }
    const option = { kind: 'option', propertyId: 'P' } as const
    expect(owedName(options, { owner: option, name: 'High', except: 'o2' })).toBe(true)
    expect(owedName(options, { owner: option, name: 'high', except: 'o2' })).toBe(false)
    expect(owedName(options, { owner: option, name: 'High', except: 'o1' })).toBe(false)
  })
})

describe('restoreNote', () => {
  it('a restore converts only an entry that owes a strip, moving it into rename', async () => {
    await putJson(file, { P: { kind: 'property', rename: ['a'], strip: ['b'] } })
    expect((await restoreNote(root, 'P')).ok).toBe(true)
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', rename: ['a', 'b'] } })
  })

  it.skipIf(noModeBits)('an item that owes no strip writes nothing', async () => {
    await putJson(file, { Q: { kind: 'property', rename: ['a'] } })
    const bytes = await readFile(file, 'utf8')
    await chmod(file, 0o000)
    expect((await restoreNote(root, 'P')).ok).toBe(true)
    await chmod(file, 0o644)
    expect(await readFile(file, 'utf8')).toBe(bytes)
  })
})

describe('runNoted', () => {
  const renaming = (from: string, to: string) => ({
    note: (e: Notes[string] | undefined) => ({
      kind: 'property' as const,
      ...owedRename(e ?? {}, from, to),
    }),
    settle: (e: Notes[string]) => ({ ...e, ...owedSwept(e, [from]) }),
  })

  it('a landing on a name another item owes refuses with nothing written', async () => {
    await putJson(file, { Q: { kind: 'property', rename: ['Priority'] } })
    const list = vi.fn(async () => ok(null))
    const ran = await runNoted(root, 'P', {
      ...renaming('Status', 'priority'),
      lands: [{ owner: { kind: 'property' }, name: 'priority', except: 'P' }],
      list,
      sweep: async () => clean,
    })
    expect(ran.ok || ran.error.code).toBe('owed')
    expect(list).not.toHaveBeenCalled()
    expect(await readNotes(root)).toEqual({ Q: { kind: 'property', rename: ['Priority'] } })
  })

  it.skipIf(noModeBits)('a refused note refuses before the list step runs', async () => {
    await putJson(file, { Q: { kind: 'property', rename: ['x'] } })
    await chmod(file, 0o000)
    const list = vi.fn(async () => ok(null))
    const ran = await runNoted(root, 'P', { ...renaming('a', 'b'), list, sweep: async () => clean })
    expect(ran.ok).toBe(false)
    expect(list).not.toHaveBeenCalled()
  })

  it('a refused list step puts the entry back as it stood', async () => {
    await putJson(file, { P: { kind: 'property', rename: ['a'] } })
    const sweep = vi.fn(async () => clean)
    const ran = await runNoted(root, 'P', {
      ...renaming('b', 'c'),
      list: async () => fail('operation-failed', 'no'),
      sweep,
    })
    expect(ran.ok).toBe(false)
    expect(sweep).not.toHaveBeenCalled()
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', rename: ['a'] } })
  })

  it('a sweep that missed nothing settles the entry', async () => {
    const ran = await runNoted(root, 'P', {
      ...renaming('a', 'b'),
      list: async () => ok(null),
      sweep: async () => clean,
    })
    expect(ran.ok && ran.value.cascade.owed).toBeFalsy()
    expect(await readNotes(root)).toEqual({})
  })

  it('a sweep that missed a file keeps the entry and marks the report owed', async () => {
    const ran = await runNoted(root, 'P', {
      ...renaming('a', 'b'),
      list: async () => ok(null),
      sweep: async () => ({ skipped: 1, hosts: [] }),
    })
    expect(ran.ok && ran.value.cascade).toMatchObject({
      owed: true,
      warning: 'Couldn’t update 1 Item.',
    })
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', rename: ['a'] } })
  })

  it('an entry under an owed rename stays whole after a clean sweep, and its report is owed', async () => {
    await putJson(file, { C: { kind: 'context', rename: ['x'] } })
    const ran = await runNoted(root, 'S', {
      note: (e) => ({ kind: 'space', contextId: 'C', ...owedRename(e ?? {}, 'Gym', 'Pool') }),
      list: async () => ok(null),
      sweep: async () => clean,
      settle: (e) => ({ ...e, ...owedSwept(e, ['Gym']) }),
      under: 'C',
    })
    expect(ran.ok && ran.value.cascade).toMatchObject({
      owed: true,
      warning: 'An earlier change hasn’t reached every file yet.',
    })
    expect((await readNotes(root)).S).toEqual({ kind: 'space', contextId: 'C', rename: ['Gym'] })
  })

  it('a clean sweep that leaves an older name owed marks the report owed', async () => {
    await putJson(file, { P: { kind: 'property', rename: ['a'] } })
    const ran = await runNoted(root, 'P', {
      ...renaming('b', 'c'),
      list: async () => ok(null),
      sweep: async () => clean,
    })
    expect(ran.ok && ran.value.cascade.owed).toBe(true)
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', rename: ['a'] } })
  })

  it('a sweep that is the finish’s own arm keeps what it wrote back', async () => {
    const ran = await runNoted(root, 'P', {
      note: () => ({ kind: 'property', strip: ['x', 'y'] }),
      list: async () => ok(null),
      sweep: async () => {
        await editNote(root, 'P', () => ({ kind: 'property', strip: ['x'] }))
        return clean
      },
    })
    expect(ran.ok && ran.value.cascade.owed).toBe(true)
    expect(await readNotes(root)).toEqual({ P: { kind: 'property', strip: ['x'] } })
  })
})
