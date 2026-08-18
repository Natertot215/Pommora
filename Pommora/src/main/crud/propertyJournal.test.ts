import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSession, openSession } from '../session'
import {
  clearSchemaJournal,
  readSchemaJournal,
  writeSchemaJournal,
  type SchemaJournal,
} from './propertyJournal'

let root: string
const journalPath = (): string => join(root, '.nexus', 'property-cascade.json')

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'pom-pjournal-')))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await openSession(root)
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const SHAPES: SchemaJournal[] = [
  { op: 'rename', id: 'prop_a', from: 'Foo', to: 'Bar' },
  { op: 'delete', id: 'prop_a', name: 'Foo' },
  { op: 'option-rename', id: 'prop_a', from: 'Draft', to: 'Done' },
  { op: 'option-strip', id: 'prop_a', value: 'Draft', drop: true },
  { op: 'option-strip', id: 'prop_a', value: 'Draft', drop: false },
]

describe('the record round-trips', () => {
  it.each(SHAPES.map((s) => [s.op, s] as const))('%s', async (_op, shape) => {
    await writeSchemaJournal(root, shape)
    expect(await readSchemaJournal(root)).toEqual(shape)
  })

  it('holds one record max — a second write overwrites the first', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await writeSchemaJournal(root, SHAPES[1])
    expect(await readSchemaJournal(root)).toEqual(SHAPES[1])
  })
})

describe('the validator refuses what the writer never produces', () => {
  it.each([
    ['absent file', null],
    ['non-object', '"rename"'],
    ['unknown op', { op: 'explode', id: 'x' }],
    ['missing id', { op: 'rename', from: 'A', to: 'B' }],
    ['mistyped field', { op: 'rename', id: 'x', from: 'A', to: 7 }],
    ['delete without name', { op: 'delete', id: 'x' }],
    ['strip without drop', { op: 'option-strip', id: 'x', value: 'v' }],
  ])('%s → null', async (_label, raw) => {
    if (raw !== null) await writeFile(journalPath(), JSON.stringify(raw))
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('clearSchemaJournal', () => {
  it('deletes the record', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await clearSchemaJournal(root)
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('resolves on an absent file', async () => {
    await expect(clearSchemaJournal(root)).resolves.toBeUndefined()
  })

  it('leaves the record when the session root has moved on', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    closeSession()
    await clearSchemaJournal(root)
    expect(JSON.parse(await readFile(journalPath(), 'utf8'))).toEqual(SHAPES[0])
  })
})
