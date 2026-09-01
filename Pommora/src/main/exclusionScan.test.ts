import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { excludedArtifacts, clearExclusionData, clearConfirmCopy } from './exclusionScan'

let root: string
const d = (p: string): Promise<string | undefined> => mkdir(join(root, p), { recursive: true })
const w = (p: string, c: string): Promise<void> => writeFile(join(root, p), c)
const read = (p: string): Promise<string> => readFile(join(root, p), 'utf8')

const page = (id: string, frontmatter: string): string =>
  `---\n${frontmatter}\nPageID: ${id}\n---\n\nbody\n`

const legacy = (): Promise<void> =>
  w(
    'Archive/legacy.md',
    page(
      '01NNNNNNNNNNNNNNNNNNNNNNNN',
      'icon: star\ncreated_at: 2026-01-01T00:00:00.000Z\nmodified_at: 2026-02-02T00:00:00.000Z\ncover: img.png\nAuthor: Username\nStatus: open',
    ),
  )

const expectIdentityStripped = async (): Promise<string> => {
  const text = await read('Archive/legacy.md')
  expect(text).toContain('created_at: 2026-01-01T00:00:00.000Z')
  expect(text).toContain('modified_at: 2026-02-02T00:00:00.000Z')
  expect(text).not.toContain('PageID')
  expect(text).toContain('icon: star')
  expect(text).toContain('cover: img.png')
  expect(text).toContain('Author: Username')
  return text
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-exscan-'))
  await d('Archive/Set')
  await d('Archive/Tasks')
  await d('Archive/node_modules/pkg')
  await d('Archive/.git')
  await d('file-assets')

  await w('Archive/_pagecollection.json', '{"id":"c1"}')
  await w('Archive/Set/_pageset.json', '{"id":"s1"}')
  await w(
    'Archive/note.md',
    page('01AAAAAAAAAAAAAAAAAAAAAAAA', '# note about status\nStatus: Doing'),
  )
  await w('Archive/proj.md', page('01BBBBBBBBBBBBBBBBBBBBBBBB', '<Projects>: [Alpha]'))
  await w(
    'Archive/collide.md',
    page('01CCCCCCCCCCCCCCCCCCCCCCCC', 'Status: open\nStatus: [Revisit]'),
  )
  await w('Archive/both.md', page('01DDDDDDDDDDDDDDDDDDDDDDDD', 'Status: open\n<Areas>: [Home]'))
  await w('Archive/malformed.md', page('01EEEEEEEEEEEEEEEEEEEEEEEE', '<Status: broken'))
  await w('Archive/Set/deep.md', page('01FFFFFFFFFFFFFFFFFFFFFFFF', 'Tag: x'))
  await w('Archive/stray.md', '---\nTaskID: 01GGGGGGGGGGGGGGGGGGGGGGGG\n---\n\nmisplaced\n')
  await w('Archive/Tasks/_taskconfig.json', '{"id":"t1"}')
  await w('Archive/Tasks/task.md', '---\nTaskID: 01HHHHHHHHHHHHHHHHHHHHHHHH\n---\n\nreal task\n')
  await w('Archive/node_modules/pkg/index.md', page('01IIIIIIIIIIIIIIIIIIIIIIII', 'Status: dep'))
  await w('Archive/.git/config.md', page('01JJJJJJJJJJJJJJJJJJJJJJJJ', 'Status: git'))
  await w('file-assets/img-note.md', page('01KKKKKKKKKKKKKKKKKKKKKKKK', 'Status: asset'))
})
afterEach(() => rm(root, { recursive: true, force: true }))

describe('excludedArtifacts', () => {
  it('finds the pages and container sidecars, skipping agenda, node_modules, .git, and the asset root', async () => {
    const { pages, sidecars } = await excludedArtifacts(
      root,
      ['Archive', 'file-assets'],
      'file-assets',
    )
    const rel = (abs: string): string => abs.slice(root.length + 1)
    const p = pages.map(rel).sort()
    expect(p).toEqual(
      [
        'Archive/note.md',
        'Archive/proj.md',
        'Archive/collide.md',
        'Archive/both.md',
        'Archive/malformed.md',
        'Archive/stray.md',
        'Archive/Set/deep.md',
      ].sort(),
    )
    expect(sidecars.map(rel).sort()).toEqual(
      ['Archive/_pagecollection.json', 'Archive/Set/_pageset.json'].sort(),
    )
    expect(
      p.some((x) => x.includes('Tasks') || x.includes('node_modules') || x.includes('.git')),
    ).toBe(false)
    expect(p.some((x) => x.startsWith('file-assets'))).toBe(false)
  })

  it('matches what corpusFilesUnder would return over an agenda-free root, exclusion aside', async () => {
    await d('Plain/Sub')
    await w('Plain/a.md', page('01LLLLLLLLLLLLLLLLLLLLLLLL', ''))
    await w('Plain/Sub/b.md', page('01MMMMMMMMMMMMMMMMMMMMMMMM', ''))
    const { corpusFilesUnder } = await import('./IO/walk')
    const ground = (
      await corpusFilesUnder(root, join(root, 'Plain'), { excluded: [], assetDir: 'file-assets' })
    ).sort()
    const { pages } = await excludedArtifacts(root, ['Plain'], 'file-assets')
    expect(pages.map((abs) => abs.slice(root.length + 1)).sort()).toEqual(ground)
  })
})

describe('clearExclusionData', () => {
  it('deletes container sidecars and drops the identity key and Context keys, keeping every other key, comment, and order', async () => {
    const before = await read('Archive/malformed.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets')
    expect(res.ok).toBe(true)

    expect(existsSync(join(root, 'Archive/_pagecollection.json'))).toBe(false)
    expect(existsSync(join(root, 'Archive/Set/_pageset.json'))).toBe(false)

    const note = await read('Archive/note.md')
    expect(note).toContain('# note about status')
    expect(note).toContain('Status: Doing')
    expect(note).not.toContain('PageID')

    const proj = await read('Archive/proj.md')
    expect(proj).not.toContain('Projects')
    expect(proj).not.toContain('PageID')
    const collide = await read('Archive/collide.md')
    expect(collide).toContain('Status: open')
    expect(collide).toContain('Revisit')
    expect(await read('Archive/Set/deep.md')).toContain('Tag: x')
    expect((await read('Archive/malformed.md')).includes('<Status: broken')).toBe(
      before.includes('<Status: broken'),
    )
  })

  it('drops the identity key alone — legacy timestamps, icon, cover, property values, and foreign keys stay', async () => {
    await legacy()
    await clearExclusionData(root, ['Archive'], 'file-assets')
    const text = await expectIdentityStripped()
    expect(text).toContain('Status: open')
  })

  it('leaves the Agenda folder byte-identical end to end', async () => {
    const config = await read('Archive/Tasks/_taskconfig.json')
    const task = await read('Archive/Tasks/task.md')
    await clearExclusionData(root, ['Archive'], 'file-assets')
    expect(await read('Archive/Tasks/_taskconfig.json')).toBe(config)
    expect(await read('Archive/Tasks/task.md')).toBe(task)
  })

  it('refuses a misplaced identity page rather than scrubbing it', async () => {
    const stray = await read('Archive/stray.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.refused).toBeGreaterThanOrEqual(1)
    expect(await read('Archive/stray.md')).toBe(stray)
  })

  it('is idempotent — a second run changes nothing and touches no page', async () => {
    await clearExclusionData(root, ['Archive'], 'file-assets')
    const snapshot = await read('Archive/note.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.pages).toBe(0)
    expect(await read('Archive/note.md')).toBe(snapshot)
  })
})

describe('clearConfirmCopy', () => {
  it('names what goes and pluralizes the count', () => {
    expect(clearConfirmCopy(2).detail).toContain('identity key and Context keys')
    expect(clearConfirmCopy(2).detail).not.toContain('timestamps')
    expect(clearConfirmCopy(1).message).toContain('the excluded folder')
    expect(clearConfirmCopy(3).message).toContain('3 excluded folders')
  })
})

describe('clearExclusionData — degenerate cases', () => {
  it('an empty exclusion list touches nothing', async () => {
    const before = await read('Archive/note.md')
    const res = await clearExclusionData(root, [], 'file-assets')
    if (!res.ok) throw new Error('expected ok')
    expect(res.value).toEqual({ pages: 0, sidecars: 0, refused: 0 })
    expect(await read('Archive/note.md')).toBe(before)
  })
})
