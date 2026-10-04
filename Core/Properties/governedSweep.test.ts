import { describe, it, expect, afterEach } from 'vitest'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import { rekeyHeld, stripHeld, sweepGovernedRoots } from './governedSweep'
import {
  assembleEnvelope,
  renameFrontmatterKey,
  splitFrontmatter,
  type KeyCollision,
} from '../Files/pageFile'

const roots: string[] = []
afterEach(async () => {
  for (const r of roots.splice(0)) {
    await rm(r, { recursive: true, force: true })
  }
})

async function seed(): Promise<{ root: string; a: string; b: string }> {
  const root = tempRoot('pom-sweep-')
  roots.push(root)
  await mkdir(join(root, 'Notes'), { recursive: true })
  await mkdir(join(root, 'Locked'), { recursive: true })
  const a = join(root, 'Notes', 'A.md')
  const b = join(root, 'Locked', 'B.md')
  await writeFile(a, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\n')
  await writeFile(b, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRB\n---\nbody\n')
  return { root, a, b }
}

describe('sweepGovernedRoots', () => {
  it.skipIf(noModeBits)(
    'a file it can’t write is skipped and the files after it still sweep',
    async () => {
      const { root, a, b } = await seed()
      await chmod(join(root, 'Locked'), 0o555)
      try {
        const r = await sweepGovernedRoots(root, [b, a], { text: (c) => `${c}x` })
        expect(r).toEqual({
          skipped: [b],
          refused: [],
          touched: new Map([
            [
              a,
              {
                before: '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\n',
                after: '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\nx',
              },
            ],
          ]),
        })
      } finally {
        await chmod(join(root, 'Locked'), 0o755)
      }
    },
  )

  it('a sidecar it can’t parse is refused, not skipped, so a retry isn’t owed', async () => {
    const { root } = await seed()
    const bad = join(root, '.nexus', 'contexts', 'Areas', 'Health', '_space.json')
    await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Health'), { recursive: true })
    await writeFile(bad, '{ not json')
    const r = await sweepGovernedRoots(root, [], { raw: () => null, sidecars: (raw) => raw })
    expect(r).toEqual({ skipped: [], refused: [bad], touched: new Map() })
    expect(await readFile(bad, 'utf8')).toBe('{ not json')
  })
})

describe('stripHeld', () => {
  it('strips every spelling of the name, and answers null when none is held', () => {
    expect(stripHeld('Tags')({ ID: 'p', Tags: ['a'], tags: ['b'], other: 1 }, 'p.md')).toEqual({
      ID: 'p',
      other: 1,
    })
    expect(stripHeld('Tags')({ ID: 'p', Tag: ['a'] }, 'p.md')).toBeNull()
  })
})

describe('rekeyHeld — the twin of renameFrontmatterKey', () => {
  const cases: [string, string, string, KeyCollision, boolean][] = [
    ['a: 1\nTags: [b]\ntags: [a, B]\nz: 2', 'Tags', 'Labels', 'prefer-new', true],
    ['a: 1\nTags: [b]\ntags: [a, B]', 'Tags', 'Labels', 'prefer-new', false],
    ['Tags: [b]\nlabels: [x]\ntags: [a]', 'Tags', 'Labels', 'prefer-new', true],
    ['<Projects>: [Y]\n<Ventures>: X', '<Projects>', '<Ventures>', 'merge', true],
    ['tags:\n  - a\n  - b', 'Tags', 'Labels', 'prefer-new', true],
    ['<Other>: x', 'Status', 'Stage', 'prefer-new', false],
  ]

  it.each(
    cases,
  )('answers the keys and values the page rename does for %j', (fm, from, to, collision, join) => {
    const content = assembleEnvelope(`${fm}\n`, 'Body')
    const page = renameFrontmatterKey(content, from, to, collision, join)
    const json = rekeyHeld(splitFrontmatter(content), from, to, collision, join)
    expect(json).toEqual(page === null ? null : splitFrontmatter(page))
  })
})
