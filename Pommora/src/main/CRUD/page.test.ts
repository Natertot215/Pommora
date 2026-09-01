import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import { mkdtemp, rm, mkdir, stat, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPage, renamePage, updatePageBody, movePage, updatePageProperty } from './page'
import { splitEnvelope, assembleEnvelope } from '../IO/pageFile'
import { splitFrontmatter } from '../readNexus'
import { isUlid } from '../ids'
import type { PropertyDefinition, PropertyType } from '@shared/properties'

/** The writer takes a definition, not an id — tests name the property and this supplies the rest.
 *  The type only has to be one the value's kind can hold; the key comes from the name. */
const defOf = (id: string, type: PropertyType = 'select'): PropertyDefinition => ({
  id,
  name: id.replace(/^prop_/, ''),
  type,
})

let root: string
let typeDir: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-page-crud-'))
  typeDir = join(root, 'Notes')
  await mkdir(typeDir, { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const ANCIENT = '2000-01-01T00:00:00.000Z'

/** Pin an old stamp so a real bump is unmistakable (vs the create-time stamp). */
async function pinOldStamp(file: string): Promise<void> {
  const parts = splitEnvelope(await readFile(file, 'utf8'))
  await writeFile(
    file,
    assembleEnvelope(
      parts.frontmatter.replace(/^modified_at:.*$/m, `modified_at: "${ANCIENT}"`),
      parts.body,
    ),
    'utf8',
  )
}

const stampOf = async (file: string): Promise<string> =>
  splitFrontmatter(await readFile(file, 'utf8')).modified_at as string

describe('createPage', () => {
  it('writes a .md with a fresh ULID, timestamps, no context keys, and the body', async () => {
    const r = await createPage(typeDir, 'My Page', { body: 'Hello' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('My Page.md')).toBe(true)
    const content = await readFile(r.value.path, 'utf8')
    const fm = splitFrontmatter(content)
    expect(isUlid(fm[PAGE_ID_KEY] as string)).toBe(true)
    // Nothing but the modeled keys — Context membership is value-driven, never seeded.
    expect(Object.keys(fm).sort()).toEqual([PAGE_ID_KEY, 'created_at', 'modified_at'].sort())
    expect(splitEnvelope(content).body).toBe('Hello')
  })

  it('rejects duplicate + unsafe names', async () => {
    await createPage(typeDir, 'Dup')
    expect((await createPage(typeDir, 'Dup')).ok).toBe(false)
    expect((await createPage(typeDir, 'a/b')).ok).toBe(false)
    expect((await createPage(typeDir, 'Note.md')).ok).toBe(false) // would yield Note.md.md
  })

  it('stamps resolved values in the birth write; blank values write no key', async () => {
    const r = await createPage(typeDir, 'Born Stamped', {
      values: [
        { def: defOf('prop_status'), value: { kind: 'select', value: 'doing' } },
        { def: defOf('prop_empty'), value: { kind: 'select', value: '' } },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const fm = splitFrontmatter(await readFile(r.value.path, 'utf8'))
    expect(fm.status).toBe('doing')
    expect('empty' in fm).toBe(false)
    expect(isUlid(fm[PAGE_ID_KEY] as string)).toBe(true)
  })
})

describe('renamePage', () => {
  it('renames the file', async () => {
    const c = await createPage(typeDir, 'Old', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const r = await renamePage(c.value.path, 'New')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('New.md')).toBe(true)
    await expect(stat(c.value.path)).rejects.toThrow()
    expect(splitFrontmatter(await readFile(r.value.path, 'utf8'))[PAGE_ID_KEY]).toBe(c.value.id)
  })

  it('bumps modified_at — a rename counts as an edit', async () => {
    const c = await createPage(typeDir, 'Old', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    await pinOldStamp(c.value.path)

    const r = await renamePage(c.value.path, 'New')
    if (!r.ok) throw new Error('rename failed')
    const after = await stampOf(r.value.path)
    expect(after).not.toBe(ANCIENT) // rename advanced it
    expect(after >= '2026-01-01').toBe(true) // to a real recent stamp
  })

  it('rejects renaming onto an existing page', async () => {
    const a = await createPage(typeDir, 'A')
    await createPage(typeDir, 'B')
    if (!a.ok) throw new Error('setup failed')
    expect((await renamePage(a.value.path, 'B')).ok).toBe(false)
  })
})

describe('updatePageBody', () => {
  it('replaces the body and preserves frontmatter incl. foreign keys', async () => {
    const c = await createPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    // Inject a foreign frontmatter key to prove it survives a body update.
    const withForeign = assembleEnvelope(
      `${splitEnvelope(await readFile(c.value.path, 'utf8')).frontmatter}\nplugin_key: keep`,
      'one',
    )
    await writeFile(c.value.path, withForeign, 'utf8')

    const r = await updatePageBody(c.value.path, 'two')
    expect(r.ok).toBe(true)
    const content = await readFile(c.value.path, 'utf8')
    expect(splitEnvelope(content).body).toBe('two')
    const fm = splitFrontmatter(content)
    expect(fm[PAGE_ID_KEY]).toBe(c.value.id)
    expect(fm.plugin_key).toBe('keep')
    expect(fm.modified_at).toBeTruthy()
  })
})

describe('movePage', () => {
  it('moves a page to another container', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const c = await createPage(typeDir, 'Movable', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    const r = await movePage(c.value.path, other)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path).toBe(join(other, 'Movable.md'))
    await expect(stat(c.value.path)).rejects.toThrow()
    expect(splitEnvelope(await readFile(r.value.path, 'utf8')).body).toBe('x')
  })

  it('bumps modified_at — a location change counts as an edit', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const c = await createPage(typeDir, 'Movable', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    await pinOldStamp(c.value.path)

    const r = await movePage(c.value.path, other)
    if (!r.ok) throw new Error('move failed')
    const after = await stampOf(r.value.path)
    expect(after).not.toBe(ANCIENT)
    expect(after >= '2026-01-01').toBe(true)
  })

  it('a no-op move leaves the stamp alone — nothing changed', async () => {
    const c = await createPage(typeDir, 'Stay', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    await pinOldStamp(c.value.path)
    expect((await movePage(c.value.path, typeDir)).ok).toBe(true)
    expect(await stampOf(c.value.path)).toBe(ANCIENT)
  })

  it('refuses to move onto an existing page of the same name', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const a = await createPage(typeDir, 'Clash', { body: 'a' })
    await createPage(other, 'Clash', { body: 'b' })
    if (!a.ok) throw new Error('setup failed')
    expect((await movePage(a.value.path, other)).ok).toBe(false)
  })
})

describe('updatePageProperty', () => {
  it('sets, replaces, and clears values; preserves siblings + other frontmatter', async () => {
    const c = await createPage(typeDir, 'Props', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    const f = c.value.path
    const at = async (name: string): Promise<unknown> =>
      (splitFrontmatter(await readFile(f, 'utf8')) as Record<string, unknown>)[name]

    await updatePageProperty(f, defOf('prop_status'), { kind: 'select', value: 'todo' })
    await updatePageProperty(f, defOf('prop_tags', 'multi_select'), {
      kind: 'multiSelect',
      value: ['a', 'b'],
    })
    expect(await at('status')).toBe('todo')
    expect(await at('tags')).toEqual(['a', 'b'])
    expect(splitFrontmatter(await readFile(f, 'utf8'))[PAGE_ID_KEY]).toBe(c.value.id)

    await updatePageProperty(f, defOf('prop_status'), { kind: 'select', value: 'done' })
    expect(await at('status')).toBe('done')

    await updatePageProperty(f, defOf('prop_status'), null)
    expect(await at('status')).toBeUndefined()
    expect(await at('tags')).toEqual(['a', 'b'])
  })

  it('errors when the page is missing', async () => {
    const r = await updatePageProperty(join(typeDir, 'nope.md'), defOf('p'), {
      kind: 'select',
      value: 'x',
    })
    expect(r.ok).toBe(false)
  })
})
