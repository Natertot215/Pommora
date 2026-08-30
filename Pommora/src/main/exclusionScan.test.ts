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
    page('01AAAAAAAAAAAAAAAAAAAAAAAA', '# note about status\n<Status>: Doing'),
  )
  await w('Archive/proj.md', page('01BBBBBBBBBBBBBBBBBBBBBBBB', '(Projects): [Alpha]'))
  await w(
    'Archive/collide.md',
    page('01CCCCCCCCCCCCCCCCCCCCCCCC', '<Status>: open\nStatus: [Revisit]'),
  )
  await w('Archive/both.md', page('01DDDDDDDDDDDDDDDDDDDDDDDD', '<Status>: open\n(Status): [Home]'))
  await w('Archive/malformed.md', page('01EEEEEEEEEEEEEEEEEEEEEEEE', '<Status: broken'))
  await w('Archive/Set/deep.md', page('01FFFFFFFFFFFFFFFFFFFFFFFF', '<Tag>: x'))
  await w('Archive/stray.md', '---\nTaskID: 01GGGGGGGGGGGGGGGGGGGGGGGG\n---\n\nmisplaced\n')
  await w('Archive/Tasks/_taskconfig.json', '{"id":"t1"}')
  await w('Archive/Tasks/task.md', '---\nTaskID: 01HHHHHHHHHHHHHHHHHHHHHHHH\n---\n\nreal task\n')
  await w('Archive/node_modules/pkg/index.md', page('01IIIIIIIIIIIIIIIIIIIIIIII', '<Status>: dep'))
  await w('Archive/.git/config.md', page('01JJJJJJJJJJJJJJJJJJJJJJJJ', '<Status>: git'))
  await w('file-assets/img-note.md', page('01KKKKKKKKKKKKKKKKKKKKKKKK', '<Status>: asset'))
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
    // Agenda, dependency, VCS, and asset trees contribute nothing.
    expect(
      p.some((x) => x.includes('Tasks') || x.includes('node_modules') || x.includes('.git')),
    ).toBe(false)
    expect(p.some((x) => x.startsWith('file-assets'))).toBe(false)
  })

  it('matches what corpusFilesUnder would return over an agenda-free root, exclusion aside', async () => {
    // Crossing test: over a root with no agenda config, every .md the corpus would reach appears.
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

describe('clearExclusionData — preserve properties on', () => {
  it('deletes container sidecars and unwraps keys, keeping comments, order, and dropping PageID', async () => {
    const before = await read('Archive/malformed.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets', true)
    expect(res.ok).toBe(true)

    expect(existsSync(join(root, 'Archive/_pagecollection.json'))).toBe(false)
    expect(existsSync(join(root, 'Archive/Set/_pageset.json'))).toBe(false)

    const note = await read('Archive/note.md')
    expect(note).toContain('# note about status')
    expect(note).toContain('Status: Doing')
    expect(note).not.toContain('<Status>')
    expect(note).not.toContain('PageID')

    expect(await read('Archive/proj.md')).toContain('Projects:')
    // Collision: the plain key already present wins, the wrapped one drops. (Flow collections
    // reflow to `[ Revisit ]` under lineWidth:0 — a documented sweep-wide property.)
    const collide = await read('Archive/collide.md')
    expect(collide).toContain('Revisit')
    expect(collide).not.toContain('open')
    expect(collide).not.toContain('<Status>')
    // Same name under both sigils: no crash, exactly one bare Status remains.
    const both = await read('Archive/both.md')
    expect(both.match(/^Status:/gm)?.length).toBe(1)
    // A malformed, unclosed key is not <…>-shaped and is left exactly as it was.
    expect((await read('Archive/malformed.md')).includes('<Status: broken')).toBe(
      before.includes('<Status: broken'),
    )
  })

  it('leaves the Agenda folder byte-identical end to end', async () => {
    const config = await read('Archive/Tasks/_taskconfig.json')
    const task = await read('Archive/Tasks/task.md')
    await clearExclusionData(root, ['Archive'], 'file-assets', true)
    expect(await read('Archive/Tasks/_taskconfig.json')).toBe(config)
    expect(await read('Archive/Tasks/task.md')).toBe(task)
  })

  it('refuses a misplaced identity page rather than scrubbing it', async () => {
    const stray = await read('Archive/stray.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets', true)
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.refused).toBeGreaterThanOrEqual(1)
    expect(await read('Archive/stray.md')).toBe(stray)
  })

  it('is idempotent — a second run changes nothing and touches no page', async () => {
    await clearExclusionData(root, ['Archive'], 'file-assets', true)
    const snapshot = await read('Archive/note.md')
    const res = await clearExclusionData(root, ['Archive'], 'file-assets', true)
    if (!res.ok) throw new Error('expected ok')
    expect(res.value.pages).toBe(0)
    expect(await read('Archive/note.md')).toBe(snapshot)
  })
})

describe('clearExclusionData — preserve properties off', () => {
  it('removes the property lines entirely', async () => {
    await clearExclusionData(root, ['Archive'], 'file-assets', false)
    const note = await read('Archive/note.md')
    expect(note).not.toContain('Status')
    expect(note).not.toContain('PageID')
    expect(await read('Archive/proj.md')).not.toContain('Projects')
  })
})

describe('clearConfirmCopy', () => {
  it('says different things in each toggle position, and pluralizes the count', () => {
    expect(clearConfirmCopy(2, true).detail).not.toBe(clearConfirmCopy(2, false).detail)
    expect(clearConfirmCopy(1, true).message).toContain('the excluded folder')
    expect(clearConfirmCopy(3, true).message).toContain('3 excluded folders')
  })
})

describe('clearExclusionData — degenerate cases', () => {
  it('an empty exclusion list touches nothing', async () => {
    const before = await read('Archive/note.md')
    const res = await clearExclusionData(root, [], 'file-assets', true)
    if (!res.ok) throw new Error('expected ok')
    expect(res.value).toEqual({ pages: 0, sidecars: 0, refused: 0 })
    expect(await read('Archive/note.md')).toBe(before)
  })
})
