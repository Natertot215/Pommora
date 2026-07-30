import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BlockHostRef } from '@shared/blocks'
import { pathExists } from './io/atomicWrite'
import { openSessionDb, closeSessionDb } from './sessionDb'
import {
  blockFilePath,
  convertTileToView,
  duplicateBlockTile,
  createMarkdownBlock,
  readBlockDoc,
  readMarkdownBlock,
  removeBlockTile,
  rewriteBlockConnections,
  writeBlockDoc,
  writeMarkdownBlock,
} from './blocks'

const HOST = { kind: 'homepage' } as const
const SPACE_HOST = { kind: 'space', id: 'sp1' } as const

let root: string
const spaceDir = (): string => join(root, '.nexus', 'contexts', 'Realms', 'Astral')
const spaceSidecar = (): string => join(spaceDir(), '_space.json')
const entries = (host: BlockHostRef = HOST): Array<Record<string, unknown>> =>
  readBlockDoc(host).blocks as Array<Record<string, unknown>>

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'blocks-'))
  await mkdir(join(root, '.nexus', 'homepage'), { recursive: true })
  await mkdir(spaceDir(), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'g1', title: 'Realms', singular: 'Realm' }] }),
  )
  await writeFile(spaceSidecar(), JSON.stringify({ id: 'sp1', color: 'mint' }))
  openSessionDb(root)
})

afterEach(() => {
  closeSessionDb()
})

describe('the document', () => {
  it('opens empty when the host has none', () => {
    expect(readBlockDoc(HOST)).toEqual({ layout: undefined, blocks: [], locked: false })
  })

  it('round-trips layout, entries and the lock as one row', () => {
    writeBlockDoc(HOST, {
      layout: { bands: [] },
      blocks: [{ id: 'a', type: 'markdown' }],
      locked: true,
    })
    expect(readBlockDoc(HOST)).toEqual({
      layout: { bands: [] },
      blocks: [{ id: 'a', type: 'markdown' }],
      locked: true,
    })
  })

  it('a partial patch leaves the untouched fields alone', () => {
    writeBlockDoc(HOST, { layout: { bands: [] }, blocks: [{ id: 'a', type: 'markdown' }] })
    writeBlockDoc(HOST, { locked: true })
    expect(readBlockDoc(HOST)).toEqual({
      layout: { bands: [] },
      blocks: [{ id: 'a', type: 'markdown' }],
      locked: true,
    })
  })

  it('hosts keep their own documents', () => {
    writeBlockDoc(HOST, { blocks: [{ id: 'home', type: 'markdown' }] })
    writeBlockDoc(SPACE_HOST, { blocks: [{ id: 'space', type: 'markdown' }] })
    expect(entries()[0].id).toBe('home')
    expect(entries(SPACE_HOST)[0].id).toBe('space')
  })

  it('never touches the host sidecar — a Space keeps its identity and color', async () => {
    const before = await readFile(spaceSidecar(), 'utf8')
    writeBlockDoc(SPACE_HOST, { blocks: [{ id: 'a', type: 'markdown' }], locked: true })
    expect(await readFile(spaceSidecar(), 'utf8')).toBe(before)
  })

  it('reads empty and refuses to write with no database open', () => {
    writeBlockDoc(HOST, { blocks: [{ id: 'a', type: 'markdown' }] })
    closeSessionDb()
    expect(readBlockDoc(HOST)).toEqual({ layout: undefined, blocks: [], locked: false })
    expect(() => writeBlockDoc(HOST, { locked: true })).not.toThrow()
  })
})

describe('markdown block lifecycle', () => {
  it('create mints the dir + empty file + entry; the body round-trips pure (no frontmatter)', async () => {
    const id = await createMarkdownBlock(root, HOST)
    expect(await pathExists(await blockFilePath(root, HOST, id))).toBe(true)
    expect(entries()).toEqual([{ id, type: 'markdown' }])

    await writeMarkdownBlock(root, HOST, id, '# Hi\n\n[[Some Page]]\n')
    expect(await readMarkdownBlock(root, HOST, id)).toBe('# Hi\n\n[[Some Page]]\n')
    expect(await readFile(await blockFilePath(root, HOST, id), 'utf8')).not.toContain('---')
  })

  it('a markdown tile mints its file inside the Space folder', async () => {
    const id = await createMarkdownBlock(root, SPACE_HOST)
    expect(await pathExists(join(spaceDir(), `${id}.md`))).toBe(true)
    await writeMarkdownBlock(root, SPACE_HOST, id, 'body')
    expect(await readMarkdownBlock(root, SPACE_HOST, id)).toBe('body')
  })

  it('remove drops the entry and trashes the file; foreign entries survive', async () => {
    writeBlockDoc(HOST, { blocks: [{ id: 'alien', type: 'widget', keep: true }] })
    const id = await createMarkdownBlock(root, HOST)
    await removeBlockTile(root, HOST, id)
    expect(entries()).toEqual([{ id: 'alien', type: 'widget', keep: true }])
    expect(await pathExists(await blockFilePath(root, HOST, id))).toBe(false)
    const trashed = await readdir(join(root, '.trash'), { recursive: true })
    expect(trashed.some((f) => f.includes(id))).toBe(true)
  })

  it('an entry op leaves the layout and lock alone', async () => {
    writeBlockDoc(HOST, { layout: { bands: [] }, locked: true })
    await createMarkdownBlock(root, HOST)
    const doc = readBlockDoc(HOST)
    expect(doc.layout).toEqual({ bands: [] })
    expect(doc.locked).toBe(true)
  })

  it('convert to view stamps a payload-local config id and trashes the markdown file', async () => {
    const id = await createMarkdownBlock(root, HOST)
    writeBlockDoc(HOST, {
      blocks: [{ id, type: 'markdown', style: 'borderless', outside_key: 1 }],
    })
    await convertTileToView(root, HOST, id, [
      { source_id: 'src1', config: { id: 'source-view-id', name: 'Table', foreign: true } },
    ])
    const entry = entries()[0]
    expect(entry.type).toBe('view')
    expect(entry.style).toBe('borderless')
    expect(entry.outside_key).toBe(1)
    expect(entry.active).toBe(0)
    const view = (entry.views as Array<Record<string, unknown>>)[0]
    expect(view.source_id).toBe('src1')
    const config = view.config as Record<string, unknown>
    expect(config.name).toBe('Table')
    expect(config.foreign).toBe(true)
    expect(config.id).not.toBe('source-view-id')
    expect(await pathExists(await blockFilePath(root, HOST, id))).toBe(false)
  })

  it('duplicate copies the raw entry + file; a view copy re-mints its config ids', async () => {
    const id = await createMarkdownBlock(root, HOST)
    await writeMarkdownBlock(root, HOST, id, 'body text')
    writeBlockDoc(HOST, { blocks: [{ id, type: 'markdown', style: 'borderless', alien: 1 }] })
    const dupId = await duplicateBlockTile(root, HOST, id)
    expect(dupId).toBeTruthy()
    expect(await readMarkdownBlock(root, HOST, dupId as string)).toBe('body text')
    expect(entries().find((b) => b.id === dupId)).toMatchObject({
      type: 'markdown',
      style: 'borderless',
      alien: 1,
    })

    writeBlockDoc(HOST, {
      blocks: [
        { id: 'v1', type: 'view', views: [{ source_id: 's', config: { id: 'cfg-a', name: 'T' } }] },
      ],
    })
    const dupView = await duplicateBlockTile(root, HOST, 'v1')
    const after = entries()
    const viewCopy = after.find((b) => b.id === dupView) as {
      views: Array<{ config: { id: string } }>
    }
    expect(viewCopy.views[0].config.id).not.toBe('cfg-a')
    expect(
      (after.find((b) => b.id === 'v1') as { views: Array<{ config: { id: string } }> }).views[0]
        .config.id,
    ).toBe('cfg-a')
  })

  it('removing a non-markdown tile touches no files', async () => {
    writeBlockDoc(HOST, { blocks: [{ id: 'p1', type: 'page', page_id: 'x' }] })
    await removeBlockTile(root, HOST, 'p1')
    expect(entries()).toEqual([])
    expect(await pathExists(join(root, '.trash'))).toBe(false)
  })
})

describe('rewriteBlockConnections', () => {
  it('rewrites [[oldTitle]] → [[newTitle]] in block bodies, leaving non-matches untouched', async () => {
    const id = await createMarkdownBlock(root, HOST)
    await writeMarkdownBlock(root, HOST, id, 'see [[Target]] and [[Other]]')
    await rewriteBlockConnections(root, 'Target', 'Renamed')
    expect(await readMarkdownBlock(root, HOST, id)).toBe('see [[Renamed]] and [[Other]]')
  })

  it('leaves a body without the old title byte-identical (no needless write)', async () => {
    const id = await createMarkdownBlock(root, HOST)
    await writeMarkdownBlock(root, HOST, id, 'see [[Other]]')
    await rewriteBlockConnections(root, 'Target', 'Renamed')
    expect(await readMarkdownBlock(root, HOST, id)).toBe('see [[Other]]')
  })
})
