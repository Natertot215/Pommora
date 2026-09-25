import { mkdir, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { CONTEXT_JOURNAL_FILENAME } from '../Paths/nexusPaths'
import { nexusConfig } from '../Paths/paths'
import { dirname } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { readJournal } from './contextJournal'

describe('readJournal', () => {
  it('reads a title that could leave the Contexts folder as no journal at all', async () => {
    const root = tempRoot('journal-')
    const file = nexusConfig(root, CONTEXT_JOURNAL_FILENAME)
    await mkdir(dirname(file), { recursive: true })
    const record = { contextId: 'c', oldTitle: 'Areas', newTitle: '../../outside', skipped: [] }
    await writeFile(file, JSON.stringify(record))
    expect(await readJournal(root)).toBeNull()
    await writeFile(file, JSON.stringify({ ...record, newTitle: 'Realms' }))
    expect(await readJournal(root)).toEqual({ ...record, newTitle: 'Realms' })
  })
})
