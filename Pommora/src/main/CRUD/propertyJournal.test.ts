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
  { op: 'option-remove', id: 'prop_a', value: 'Draft' },
]

describe('the record round-trips', () => {
  it.each(SHAPES.map((s) => [s.op, s] as const))('%s', async (_op, shape) => {
    await writeSchemaJournal(root, shape)
    expect(await readSchemaJournal(root)).toEqual(shape)
  })

  it('a held record is never displaced — the stranded heal outranks the new op', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await writeSchemaJournal(root, SHAPES[1])
    expect(await readSchemaJournal(root)).toEqual(SHAPES[0])
  })

  it('re-staging the identical record is a write, not a refusal', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await writeSchemaJournal(root, SHAPES[0])
    expect(await readSchemaJournal(root)).toEqual(SHAPES[0])
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
    ['remove without value', { op: 'option-remove', id: 'x' }],
  ])('%s → null', async (_label, raw) => {
    if (raw !== null) await writeFile(journalPath(), JSON.stringify(raw))
    expect(await readSchemaJournal(root)).toBeNull()
  })
})

describe('clearSchemaJournal', () => {
  it('deletes its own record', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await clearSchemaJournal(root, SHAPES[0])
    expect(await readSchemaJournal(root)).toBeNull()
  })

  it('resolves on an absent file', async () => {
    await expect(clearSchemaJournal(root, SHAPES[0])).resolves.toBeUndefined()
  })

  it('leaves a record it did not stage', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    await clearSchemaJournal(root, SHAPES[1])
    expect(await readSchemaJournal(root)).toEqual(SHAPES[0])
  })

  it('leaves the record when the session root has moved on', async () => {
    await writeSchemaJournal(root, SHAPES[0])
    closeSession()
    await clearSchemaJournal(root, SHAPES[0])
    expect(JSON.parse(await readFile(journalPath(), 'utf8'))).toEqual(SHAPES[0])
  })
})
