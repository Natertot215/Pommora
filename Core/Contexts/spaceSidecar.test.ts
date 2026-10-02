import { describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { contextsDir } from '../Paths/paths'
import { tempRoot } from '../Testing/hostFs'
import { readSpaceRowOrder, spaceNodeFrom, spaceSidecars, withOrderEntry } from './spaceSidecar'

describe('spaceSidecars', () => {
  it('finds each Space sidecar one level into each Context folder, hidden and plain folders aside', async () => {
    const root = tempRoot('pom-spaces-')
    const at = (...segs: string[]): string => join(contextsDir(root), ...segs)
    try {
      for (const dir of ['Areas/Home/tiles', 'Areas/_Draft', 'Areas/Plain', '_Old/Kept'])
        await mkdir(at(dir), { recursive: true })
      for (const dir of ['Areas/Home', 'Areas/_Draft', '_Old/Kept'])
        await writeFile(at(dir, '_space.json'), '{}')
      await writeFile(at('Areas/Home/tiles', 'notes_space.json'), '{}')
      expect(await spaceSidecars(root)).toEqual([at('Areas/Home/_space.json')])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

const AT = { title: 'Home', path: '.nexus/contexts/Areas/Home', contextId: 'g1' }

describe('spaceNodeFrom', () => {
  it('reads the four modeled fields and leaves values undefined when nothing is left', () => {
    const node = spaceNodeFrom(
      {
        id: 'sp1',
        $icon: 'folder',
        banner: 'Loose/b.png',
        heading_icon_hidden: true,
        $color: 'mint',
        '<Areas>': ['Home'],
      },
      AT,
    )
    expect(node).toEqual({
      kind: 'space',
      id: 'sp1',
      ...AT,
      icon: 'folder',
      banner: 'Loose/b.png',
      headingIconHidden: true,
      color: 'mint',
      values: undefined,
    })
  })

  it('collects exactly the unmodeled, unwrapped keys into values', () => {
    const node = spaceNodeFrom(
      {
        id: 'sp1',
        $icon: 'folder',
        $color: 'mint',
        '<Areas>': ['Home'],
        Status: 'Active',
        $order: { contexts: ['g1'], properties: ['prop_a'] },
      },
      AT,
    )
    expect(node?.values).toEqual({
      Status: 'Active',
      $order: { contexts: ['g1'], properties: ['prop_a'] },
    })
  })
})

describe('spaceNodeFrom — the glyph key', () => {
  it('reads the glyph from $icon and a bare icon key as a property value', () => {
    const node = spaceNodeFrom({ id: 'sp1', $icon: 'folder', icon: 'Draft' }, AT)
    expect(node?.icon).toBe('folder')
    expect(node?.values).toEqual({ icon: 'Draft' })
  })
})

describe('readSpaceRowOrder', () => {
  it('reads two empty lists for a missing or malformed $order', () => {
    expect(readSpaceRowOrder(undefined)).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({})).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({ $order: 'nope' })).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({ $order: { contexts: 'nope' } })).toEqual({
      contexts: [],
      properties: [],
    })
  })

  it('keeps only a list string entries', () => {
    expect(readSpaceRowOrder({ $order: { contexts: ['g1', 7, null, 'g2'] } })).toEqual({
      contexts: ['g1', 'g2'],
      properties: [],
    })
  })
})

describe('withOrderEntry', () => {
  const inert = (): null => null
  const raw = {
    Status: 'Active',
    $order: { contexts: ['g1', 'g2'], properties: ['prop_a'] },
  }

  it('renames the entry in place over an inner rewrite that changed nothing', () => {
    const out = withOrderEntry(inert, 'properties', 'prop_a', 'prop_b')(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      $order: { contexts: ['g1', 'g2'], properties: ['prop_b'] },
    })
  })

  it('drops the entry when `to` is null', () => {
    const out = withOrderEntry(inert, 'contexts', 'g1', null)(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      $order: { contexts: ['g2'], properties: ['prop_a'] },
    })
  })

  it('returns the inner answer when the list does not name `from`', () => {
    expect(withOrderEntry(inert, 'contexts', 'g9', 'g8')(raw, 'f')).toBeNull()
  })

  it('rewrites the entry over the object the inner rewrite returned', () => {
    const inner = (r: Record<string, unknown>): Record<string, unknown> => ({
      ...r,
      Stage: 'Active',
    })
    const out = withOrderEntry(inner, 'properties', 'prop_a', 'prop_b')(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      Stage: 'Active',
      $order: { contexts: ['g1', 'g2'], properties: ['prop_b'] },
    })
  })
})
