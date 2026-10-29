import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ID_KEY, isUlidShaped } from './identityMark'
import { chmod, rm, mkdir, readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, noModeBits, raceLandings } from '../Testing/hostFs'
import { renamePage, updatePageBody, movePage } from './page'
import { createTestPage } from '../Testing/createTestPage'
import { splitEnvelope, assembleEnvelope, splitFrontmatter } from '../Files/pageFile'
import { machine } from '../Platform/machine'

let root: string
let typeDir: string
beforeEach(async () => {
  root = tempRoot('pom-page-crud-')
  typeDir = join(root, 'Notes')
  await mkdir(typeDir, { recursive: true })
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

const bytesOf = (file: string): Promise<string> => readFile(file, 'utf8')

describe('createPage', () => {
  it('writes a .md holding exactly the id key and the body — no context keys', async () => {
    const r = await createTestPage(typeDir, 'My Page', { body: 'Hello' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('My Page.md')).toBe(true)
    const content = await readFile(r.value.path, 'utf8')
    const fm = splitFrontmatter(content)
    expect(isUlidShaped(fm[ID_KEY])).toBe(true)
    expect(Object.keys(fm)).toEqual([ID_KEY])
    expect(content).toBe(`---\n${ID_KEY}: ${r.value.id}\n---\nHello`)
  })

  it('rejects duplicate + unsafe names', async () => {
    await createTestPage(typeDir, 'Dup')
    expect((await createTestPage(typeDir, 'Dup')).ok).toBe(false)
    expect((await createTestPage(typeDir, 'a/b')).ok).toBe(false)
    expect((await createTestPage(typeDir, 'Note.md')).ok).toBe(false)
  })

  it('gives two same-name creates at the same moment one file each', async () => {
    const both = await Promise.all([
      createTestPage(typeDir, 'Twin'),
      createTestPage(typeDir, 'Twin'),
    ])
    expect(both.map((r) => r.ok).sort()).toEqual([false, true])
  })

  it('rejects a page another writer created since its check and keeps that page', async () => {
    const file = join(typeDir, 'Raced.md')
    const outside = 'written elsewhere\n'
    raceLandings((f) => f === file, outside)
    await expect(createTestPage(typeDir, 'Raced')).rejects.toThrow()
    expect(await readFile(file, 'utf8')).toBe(outside)
  })
})

describe('renamePage', () => {
  it('renames the file', async () => {
    const c = await createTestPage(typeDir, 'Old', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const r = await renamePage(c.value.path, 'New')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.path.endsWith('New.md')).toBe(true)
    await expect(stat(c.value.path)).rejects.toThrow()
    expect(splitFrontmatter(await readFile(r.value.path, 'utf8'))[ID_KEY]).toBe(c.value.id)
  })

  it('leaves the file bytes untouched — a rename is not an edit', async () => {
    const c = await createTestPage(typeDir, 'Old', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    const r = await renamePage(c.value.path, 'New')
    if (!r.ok) throw new Error('rename failed')
    expect(await bytesOf(r.value.path)).toBe(before)
  })

  it('rejects renaming onto an existing page', async () => {
    const a = await createTestPage(typeDir, 'A')
    await createTestPage(typeDir, 'B')
    if (!a.ok) throw new Error('setup failed')
    expect((await renamePage(a.value.path, 'B')).ok).toBe(false)
  })

  it('lands a case-only rename', async () => {
    const c = await createTestPage(typeDir, 'title', { body: 'b' })
    if (!c.ok) throw new Error('setup failed')
    const r = await renamePage(c.value.path, 'Title')
    expect(r.ok).toBe(true)
    expect(await readdir(typeDir)).toEqual(['Title.md'])
  })
})

describe('updatePageBody', () => {
  it('fails on a page changed outside since its read and keeps the outside bytes', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    const outside = `${await readFile(c.value.path, 'utf8')}written elsewhere\n`
    raceLandings((file) => file === c.value.path, outside)
    const r = await updatePageBody(c.value.path, 'two')
    expect(r.ok).toBe(false)
    expect(await readFile(c.value.path, 'utf8')).toBe(outside)
  })

  it('refuses a body whose base hash is not the disk body and leaves the file', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    const before = await readFile(c.value.path, 'utf8')
    const r = await updatePageBody(c.value.path, 'two', machine().sha256Hex('elsewhere'))
    expect(r).toEqual({ ok: true, value: { stale: true } })
    expect(await readFile(c.value.path, 'utf8')).toBe(before)
  })

  it('writes under the right base hash and answers the new hash', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    const disk = splitEnvelope(await readFile(c.value.path, 'utf8')).body
    const r = await updatePageBody(c.value.path, 'two', machine().sha256Hex(disk))
    expect(r.ok && 'written' in r.value && splitEnvelope(r.value.written).body).toBe('two')
    expect(splitEnvelope(await readFile(c.value.path, 'utf8')).body).toBe('two')
  })

  it('writes unconditionally with no base hash', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    await writeFile(
      c.value.path,
      assembleEnvelope(
        splitEnvelope(await readFile(c.value.path, 'utf8')).frontmatter,
        'elsewhere',
      ),
    )
    const r = await updatePageBody(c.value.path, 'two')
    expect(r.ok).toBe(true)
    expect(splitEnvelope(await readFile(c.value.path, 'utf8')).body).toBe('two')
  })

  it('replaces the body and preserves frontmatter incl. foreign keys', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
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
    expect(fm[ID_KEY]).toBe(c.value.id)
    expect(fm.plugin_key).toBe('keep')
    expect('modified_at' in fm).toBe(false)
  })

  it('answers the overwritten and the written text', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    const r = await updatePageBody(c.value.path, 'two')
    expect(r).toEqual({
      ok: true,
      value: { previous: before, written: await bytesOf(c.value.path) },
    })
  })

  it.skipIf(noModeBits)('a read failure refuses and leaves the file alone', async () => {
    const c = await createTestPage(typeDir, 'P', { body: 'one' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    await chmod(c.value.path, 0o000)
    const r = await updatePageBody(c.value.path, 'two')
    await chmod(c.value.path, 0o644)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('operation-failed')
    expect(await bytesOf(c.value.path)).toBe(before)
  })
})

describe('movePage', () => {
  it('moves a page to another container', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const c = await createTestPage(typeDir, 'Movable', { body: 'x' })
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
    const c = await createTestPage(typeDir, 'Movable', { body: 'x' })
    if (!c.ok) throw new Error('setup failed')
    const before = await bytesOf(c.value.path)
    const r = await movePage(c.value.path, other)
    if (!r.ok) throw new Error('move failed')
    expect(await bytesOf(r.value.path)).toBe(before)
  })

  it('refuses to move onto an existing page of the same name', async () => {
    const other = join(root, 'Journal')
    await mkdir(other, { recursive: true })
    const a = await createTestPage(typeDir, 'Clash', { body: 'a' })
    await createTestPage(other, 'Clash', { body: 'b' })
    if (!a.ok) throw new Error('setup failed')
    expect((await movePage(a.value.path, other)).ok).toBe(false)
  })
})
