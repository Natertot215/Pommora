import { describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { contextsDir } from '../Paths/paths'
import { tempRoot } from '../Testing/hostFs'
import { spaceNodeFrom, spaceSidecars, withoutOrderId } from './spaceSidecar'

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
  it('reads the four modeled fields, leaves values undefined when nothing is left, and keeps the Context key apart', () => {
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
      contextKeys: { '<Areas>': ['Home'] },
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
        $order: ['g1', 'prop_a'],
      },
      AT,
    )
    expect(node?.values).toEqual({ Status: 'Active' })
    expect(node?.rowOrder).toEqual(['g1', 'prop_a'])
  })

  it('reads an $order that is not a list of ids as no order, and never as a value', () => {
    for (const $order of [{ contexts: ['g1'] }, ['g1', 7]]) {
      const node = spaceNodeFrom({ id: 'sp1', $order }, AT)
      expect(node?.rowOrder).toBeUndefined()
      expect(node?.values).toBeUndefined()
    }
  })

  it('keeps each Context key as written in contextKeys, never in values', () => {
    const node = spaceNodeFrom(
      { id: 'sp1', '<Areas>': ['Home'], '<Gone>': 'x', Status: 'Active', $order: ['g1'] },
      AT,
    )
    expect(node?.values).toEqual({ Status: 'Active' })
    expect(node?.contextKeys).toEqual({ '<Areas>': ['Home'], '<Gone>': 'x' })
  })
})

describe('spaceNodeFrom — the glyph key', () => {
  it('reads the glyph from $icon and a bare icon key as a property value', () => {
    const node = spaceNodeFrom({ id: 'sp1', $icon: 'folder', icon: 'Draft' }, AT)
    expect(node?.icon).toBe('folder')
    expect(node?.values).toEqual({ icon: 'Draft' })
  })
})

describe('withoutOrderId', () => {
  const inert = (): null => null

  it('drops the id over an inner rewrite that changed nothing', () => {
    const out = withoutOrderId(inert, 'g1')({ Status: 'Active', $order: ['g1', 'g2'] }, 'f')
    expect(out).toEqual({ Status: 'Active', $order: ['g2'] })
  })

  it('drops the key once its last id leaves', () => {
    expect(withoutOrderId(inert, 'g1')({ $order: ['g1'] }, 'f')).toEqual({})
  })

  it('returns the inner answer when the order does not list the id', () => {
    expect(withoutOrderId(inert, 'g9')({ $order: ['g1'] }, 'f')).toBeNull()
  })

  it('drops the id from the object the inner rewrite returned', () => {
    const inner = (r: Record<string, unknown>): Record<string, unknown> => ({
      ...r,
      Stage: 'Active',
    })
    const out = withoutOrderId(inner, 'g1')({ Status: 'Active', $order: ['g1', 'g2'] }, 'f')
    expect(out).toEqual({ Status: 'Active', Stage: 'Active', $order: ['g2'] })
  })
})
