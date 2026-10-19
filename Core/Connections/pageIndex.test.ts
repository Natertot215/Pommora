import { describe, it, expect } from 'vitest'
import { buildPageIndex, type ConnPage } from './pageIndex'
import { titleFromPath } from '../Paths/posix'

const pages: ConnPage[] = [
  { id: '1', title: 'Project Atlas', path: 'v/Project Atlas.md' },
  { id: '2', title: 'Atlas', path: 'v/Atlas.md' },
  { id: '3', title: 'Atlas', path: 'w/Atlas.md' },
  { id: '4', title: 'Notes', path: 'v/Notes.md' },
]

const at = (...paths: string[]) =>
  buildPageIndex(paths.map((path, i) => ({ id: String(i), title: titleFromPath(path), path })))

describe('resolve', () => {
  const idx = buildPageIndex(pages)
  it('resolved → exactly one holder, with its page', () => {
    const r = idx.resolve('Notes')
    expect(r.status).toBe('resolved')
    expect(r.page?.path).toBe('v/Notes.md')
  })
  it('case + whitespace insensitive', () => {
    expect(idx.resolve('  notes ').status).toBe('resolved')
  })
  it('phantom → no holder', () => {
    expect(idx.resolve('Nonexistent').status).toBe('phantom')
  })
  it('ambiguous → multiple holders', () => {
    expect(idx.resolve('Atlas').status).toBe('ambiguous')
  })
})

describe('holders', () => {
  const idx = buildPageIndex(pages)
  it('returns every page whose normalized title matches, in tree order', () => {
    expect(idx.holders(' atlas ').map((p) => p.id)).toEqual(['2', '3'])
  })
  it('returns nothing for a title no page holds', () => {
    expect(idx.holders('nothing')).toEqual([])
  })
  it('resolve derives from it: one holder resolved, two ambiguous, none phantom', () => {
    expect(idx.resolve('Notes')).toEqual({ status: 'resolved', page: idx.holders('Notes')[0] })
    expect(idx.resolve('Atlas')).toEqual({ status: 'ambiguous' })
    expect(idx.resolve('nothing')).toEqual({ status: 'phantom' })
  })
})

describe('candidates (ranked by match, then A–Z)', () => {
  const idx = buildPageIndex([
    { id: '1', title: 'Project Atlas', path: 'a' },
    { id: '2', title: 'Pro', path: 'b' },
    { id: '3', title: 'Projects', path: 'c' },
    { id: '4', title: 'Notes', path: 'd' },
  ])
  it('ranks the tightest match first, then the shortest, then alpha', () => {
    const titles = idx.candidates('pro', 20).map((p) => p.title)
    expect(titles).toEqual(['Pro', 'Projects', 'Project Atlas'])
  })
  it('empty query → the whole index, A–Z', () => {
    const titles = idx.candidates('', 20).map((p) => p.title)
    expect(titles).toEqual(['Notes', 'Pro', 'Project Atlas', 'Projects'])
  })
  it('respects the limit', () => {
    expect(idx.candidates('p', 1)).toHaveLength(1)
  })
  it('a title match ranks above every page reached through its folder, inside the limit', () => {
    const archived = Array.from({ length: 30 }, (_, i) => ({
      id: `n${i}`,
      title: `N${i}`,
      path: `Archive/N${i}.md`,
    }))
    const titles = buildPageIndex([
      ...archived,
      { id: 'a', title: 'Articles about stuff', path: 'Articles about stuff.md' },
    ])
      .candidates('ar', 20)
      .map((p) => p.title)
    expect(titles[0]).toBe('Articles about stuff')
    expect(titles).toHaveLength(20)
  })
  it('a folder query finds the page under it and not its namesake elsewhere', () => {
    const studio = buildPageIndex([
      { id: 'p', title: 'ClaudeMD', path: 'Studio/Pommora/ClaudeMD.md' },
      { id: 's', title: 'ClaudeMD', path: 'Studio/Sapphire/ClaudeMD.md' },
    ])
    expect(studio.candidates('Pommora/Cl', 20).map((p) => p.id)).toEqual(['p'])
  })
  it('a path query nothing sits under lists the holders of its last segment', () => {
    const dups = buildPageIndex([
      { id: 'a', title: 'Dup', path: 'A/Dup.md' },
      { id: 'b', title: 'Dup', path: 'B/Dup.md' },
      { id: 'o', title: 'Other', path: 'Gone2/Other.md' },
    ])
    expect(dups.candidates('Gone/Dup', 20).map((p) => p.id)).toEqual(['a', 'b'])
    expect(dups.candidates('Zzz/', 20)).toEqual([])
  })
  it('an exact title ranks first', () => {
    const notes = buildPageIndex([
      { id: 'f', title: 'Footnotes', path: 'Footnotes.md' },
      { id: 'a', title: 'Notes Archive', path: 'Notes Archive.md' },
      { id: 'n', title: 'Notes', path: 'Journal/Notes.md' },
    ])
    expect(notes.candidates('notes', 20)[0].id).toBe('n')
  })
  it('two holders of one title both appear under a plain query', () => {
    const shared = buildPageIndex([
      { id: 'a', title: 'Notes', path: 'A/Notes.md' },
      { id: 'b', title: 'Notes', path: 'B/Notes.md' },
    ])
    expect(shared.candidates('notes', 20).map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('paths', () => {
  const named = (idx: ReturnType<typeof at>, raw: string) => idx.resolve(raw).page?.path

  it('a full path names its page, and names one of a shared title', () => {
    expect(named(at('A/Notes.md'), 'A/Notes')).toBe('A/Notes.md')
    const twins = at('A/Notes.md', 'B/Notes.md')
    expect(twins.resolve('Notes').status).toBe('ambiguous')
    expect(named(twins, 'B/Notes')).toBe('B/Notes.md')
  })
  it('a tail names its page alone, and is ambiguous where two paths end with it', () => {
    expect(named(at('Q/X/Notes.md'), 'X/Notes')).toBe('Q/X/Notes.md')
    expect(at('Q/X/Notes.md', 'R/X/Notes.md').resolve('X/Notes').status).toBe('ambiguous')
  })
  it('a full path wins over a tail', () => {
    expect(named(at('A/B/Notes.md', 'B/Notes.md'), 'B/Notes')).toBe('B/Notes.md')
  })
  it('two paths folding to one are ambiguous', () => {
    expect(at('A/Notes.md', 'A/notes.md').resolve('A/Notes').status).toBe('ambiguous')
  })
  it('reads the extension on the page half', () => {
    const idx = at('A/Notes.md')
    expect(named(idx, 'Notes.md')).toBe('A/Notes.md')
    expect(named(idx, 'A/Notes.md')).toBe('A/Notes.md')
  })
  it('a relative, rooted, or unfinished path is phantom', () => {
    const idx = at('A/Notes.md', 'x.md')
    for (const raw of ['./x', '../x', '/A/Notes', 'A/'])
      expect(idx.resolve(raw).status).toBe('phantom')
  })
  it('writtenName spells the title where it names the page alone, else a tail at the written depth, else the full path', () => {
    expect(at('A/Notes.md').writtenName('A/Notes.md')).toBe('Notes')
    expect(at('A/Notes.md', 'B/Notes.md').writtenName('B/Notes.md')).toBe('B/Notes')
    expect(at('A/Notes.md', 'Q/B/Notes.md').writtenName('Q/B/Notes.md', 'x/notes')).toBe('B/Notes')
    expect(at('Q/B/Notes.md', 'R/B/Notes.md').writtenName('Q/B/Notes.md', 'x/notes')).toBe(
      'Q/B/Notes',
    )
    expect(at('A/Notes.md', 'A/notes.md').writtenName('A/Notes.md')).toBe('A/Notes')
  })
  it('a doubled extension keys by path as it keys by title', () => {
    const doubled = at('A/X.md.md')
    for (const raw of ['X', 'X.md', 'X.md.md', 'A/X', 'A/X.md', 'A/X.md.md'])
      expect(named(doubled, raw)).toBe('A/X.md.md')
    expect(doubled.namesOf('A/X.md.md')).toEqual(['x', 'a/x'])
    const beside = at('A/X.md.md', 'A/X.md')
    expect(beside.resolve('A/X').status).toBe('ambiguous')
    expect(beside.namesOf('A/X.md.md')).toEqual([])
  })
  it('namesOf lists the tails that resolve to the page, shortest first', () => {
    expect(at('Q/X/Notes.md').namesOf('Q/X/Notes.md')).toEqual(['notes', 'x/notes', 'q/x/notes'])
    expect(at('Q/X/Notes.md', 'B/Notes.md').namesOf('Q/X/Notes.md')).toEqual([
      'x/notes',
      'q/x/notes',
    ])
  })
})

describe('respell', () => {
  const page = (idx: ReturnType<typeof at>, path: string) => idx.resolve(path).page!

  it('leaves a key that still names the page at an unchanged tail', () => {
    const idx = at('A/Notes.md')
    expect(idx.respell('notes', page(idx, 'A/Notes'), 'A/Notes.md')).toBeNull()
  })
  it('follows a case-only rename', () => {
    const idx = at('A/Notes.md')
    expect(idx.respell('notes', page(idx, 'A/Notes'), 'A/notes.md')).toBe('Notes')
  })
  it('spells the full path when a twin arrives and the key no longer names the page alone', () => {
    const idx = at('A/Notes.md', 'B/Notes.md')
    expect(idx.respell('notes', page(idx, 'A/Notes'), 'A/Notes.md')).toBe('A/Notes')
  })
  it('keeps the depth a path key was written at through a rename', () => {
    const idx = at('A/Plan.md')
    expect(idx.respell('a/notes', page(idx, 'A/Plan'), 'A/Notes.md')).toBe('A/Plan')
  })
  it('leaves a key shallower than a renamed folder, and re-spells one through it', () => {
    const idx = at('R/X/Notes.md')
    const q = page(idx, 'R/X/Notes')
    expect(idx.respell('x/notes', q, 'Q/X/Notes.md')).toBeNull()
    expect(idx.respell('q/x/notes', q, 'Q/X/Notes.md')).toBe('R/X/Notes')
  })
  it('at the page’s own path, resolution alone decides', () => {
    const idx = at('A/Notes.md', 'B/Notes.md')
    expect(idx.respell('a/notes', page(idx, 'A/Notes'), 'A/Notes.md')).toBeNull()
    expect(idx.respell('notes', page(idx, 'B/Notes'), 'B/Notes.md')).toBe('B/Notes')
  })
  it('byId holds the first of two pages claiming one id', () => {
    const idx = buildPageIndex([
      { id: 'd', title: 'Notes', path: 'A/Notes.md' },
      { id: 'd', title: 'Notes', path: 'B/Notes.md' },
    ])
    expect(idx.byId.get('d')?.path).toBe('A/Notes.md')
  })
})
