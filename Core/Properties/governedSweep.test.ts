import { describe, it, expect, afterEach } from 'vitest'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import { jsonText } from '../Files/atomicWrite'
import { sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'

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

async function seedSidecar(root: string): Promise<{ file: string; text: string }> {
  await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Health'), { recursive: true })
  const file = join(root, '.nexus', 'contexts', 'Areas', 'Health', '_space.json')
  const text = jsonText({ id: '01KVGMT8BFP350FZZXAMG1QDRC' })
  await writeFile(file, text)
  return { file, text }
}

const plan: SweepPlan = { text: (c) => `${c}x`, sidecars: (raw) => ({ ...raw, Tags: ['b'] }) }

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

  it('a dry run writes nothing and reports each write it would make', async () => {
    const { root, a } = await seed()
    const sidecar = await seedSidecar(root)
    const page = await readFile(a, 'utf8')
    const r = await sweepGovernedRoots(root, [a], plan, true)
    expect(r).toEqual({
      skipped: [],
      refused: [],
      touched: new Map([
        [a, { before: page, after: `${page}x` }],
        [
          sidecar.file,
          {
            before: sidecar.text,
            after: jsonText({ id: '01KVGMT8BFP350FZZXAMG1QDRC', Tags: ['b'] }),
          },
        ],
      ]),
    })
    expect(await readFile(a, 'utf8')).toBe(page)
    expect(await readFile(sidecar.file, 'utf8')).toBe(sidecar.text)
  })
})

describe('sweepCount', () => {
  it('counts each file the plan would rewrite and writes none', async () => {
    const { root, a } = await seed()
    const sidecar = await seedSidecar(root)
    const page = await readFile(a, 'utf8')
    expect(await sweepCount(root, [a], plan)).toBe(2)
    expect(await readFile(a, 'utf8')).toBe(page)
    expect(await readFile(sidecar.file, 'utf8')).toBe(sidecar.text)
  })
})
