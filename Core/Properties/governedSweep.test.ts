import { describe, it, expect, afterEach } from 'vitest'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, tempRoot } from '../Testing/hostFs'
import { sweepGovernedRoots } from './governedSweep'

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
          touched: new Map([[a, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\nbody\n']]),
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
