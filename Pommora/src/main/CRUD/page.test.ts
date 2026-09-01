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

const bytesOf = (file: string): Promise<string> => readFile(file, 'utf8')

describe('createPage', () => {
  it('writes a .md holding exactly the id key and the body — no context keys', async () => {
    const r = await createPage(typeDir, 'My Page', { body: 'Hello' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('My Page.md')).toBe(true)
    const content = await readFile(r.value.path, 'utf8')
    const fm = splitFrontmatter(content)
    expect(isUlid(fm[PAGE_ID_KEY] as string)).toBe(true)
    expect(Object.keys(fm)).toEqual([PAGE_ID_KEY])
    expect(content).toBe(`---\n${PAGE_ID_KEY}: ${r.value.id}\n---\nHello`)
  })

  it('rejects duplicate + unsafe names', async () => {
    await createPage(typeDir, 'Dup')
    expect((await createPage(typeDir, 'Dup')).ok).toBe(false)
    expect((await createPage(typeDir, 'a/b')).ok).toBe(false)
    expect((await createPage(typeDir, 'Note.md')).ok).toBe(false) // would yield Note.md.md
  })

  it('writes resolved values in the birth write; blank values write no key', async () => {
    const r = await createPage(typeDir, 'Born Stamped', {
      values: [
        { def: defOf('prop_status'), value: { kind: 'select', value: 'doing' } },
        { def: defOf('prop_empty'), value: { kind: 'select', value: '' } },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const fm = splitFrontmatter(await readFile(r.value.path, 'utf8'))
    expect(fm.status).toEqual(['doing'])
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

  it('leaves the file bytes untouched — a rename is not an edit', async () => {
    const c = await createPage(typeDir, 'Old', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    const r = await renamePage(c.value.path, 'New')
    if (!r.ok) throw new Error('rename failed')
    expect(await bytesOf(r.value.path)).toBe(before)
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
    expect('modified_at' in fm).toBe(false)
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

  it('leaves the file bytes untouched — a location change is not an edit', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const c = await createPage(typeDir, 'Movable', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    const r = await movePage(c.value.path, other)
    if (!r.ok) throw new Error('move failed')
    expect(await bytesOf(r.value.path)).toBe(before)
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
    expect(await at('status')).toEqual(['todo'])
    expect(await at('tags')).toEqual(['a', 'b'])
    expect(splitFrontmatter(await readFile(f, 'utf8'))[PAGE_ID_KEY]).toBe(c.value.id)

    await updatePageProperty(f, defOf('prop_status'), { kind: 'select', value: 'done' })
    expect(await at('status')).toEqual(['done'])

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
