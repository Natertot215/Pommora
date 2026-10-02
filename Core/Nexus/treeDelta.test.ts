import { describe, expect, it } from 'vitest'
import { deltaOf, applyDelta } from './treeDelta'

type Page = { kind: 'page'; id: string; title: string; path: string }
type Collection = { kind: 'collection'; id: string; title: string; path: string; pages: Page[] }
type Tree = {
  collections: Collection[]
  contexts: { def: { id: string; title: string }; spaces: { id: string; path: string }[] }[]
  config: {
    excluded: string[]
    registry: { id: string; name: string }[]
    order: { collections: string[] }
  }
}

// A seeded generator, so a failing pair names the seed that made it.
const random = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31
    return s / 2 ** 31
  }
}

const pageIn = (dir: string, n: number): Page => ({
  kind: 'page',
  id: `${dir}-p${n}`,
  title: `P${n}`,
  path: `${dir}/P${n}.md`,
})

function treeFrom(r: () => number): Tree {
  const collections = Array.from({ length: 1 + Math.floor(r() * 4) }, (_, i): Collection => {
    const path = `C${i}`
    return {
      kind: 'collection',
      id: `c${i}`,
      title: path,
      path,
      pages: Array.from({ length: Math.floor(r() * 4) }, (_, j) => pageIn(path, j)),
    }
  })
  return {
    collections,
    contexts: [
      { def: { id: 'ctx1', title: 'Areas' }, spaces: [{ id: 'sp1', path: 'Areas/Home' }] },
    ],
    config: {
      excluded: ['Archive'],
      registry: [
        { id: 'prop_a', name: 'A' },
        { id: 'prop_b', name: 'B' },
      ],
      order: { collections: collections.map((c) => c.id) },
    },
  }
}

// Copy-on-write, as the host's steps edit a tree: whatever an edit doesn't touch stays the same object.
function edited(r: () => number, a: Tree): Tree {
  let t = a
  const pick = <T>(list: T[]): number => Math.floor(r() * list.length)
  for (let step = 0; step < 1 + Math.floor(r() * 4); step++) {
    const at = pick(t.collections)
    const c = t.collections[at]
    const withCollection = (next: Collection | null): Tree => {
      const collections = [...t.collections]
      if (next) collections[at] = next
      else collections.splice(at, 1)
      return { ...t, collections }
    }
    switch (Math.floor(r() * 9)) {
      case 0:
        if (c?.pages.length)
          t = withCollection({
            ...c,
            pages: c.pages.map((p, i) => (i === 0 ? { ...p, title: `${p.title}!` } : p)),
          })
        break
      case 1:
        if (c?.pages.length) t = withCollection({ ...c, pages: c.pages.slice(1) })
        break
      case 2:
        if (c) t = withCollection({ ...c, pages: [...c.pages, pageIn(c.path, 10 + step)] })
        break
      case 3:
        if (c) t = withCollection({ ...c, pages: [...c.pages].reverse() })
        break
      case 4:
        if (c) t = withCollection(null)
        break
      case 5: {
        const path = `N${step}`
        t = {
          ...t,
          collections: [
            ...t.collections,
            { kind: 'collection', id: `n${step}`, title: path, path, pages: [pageIn(path, 0)] },
          ],
        }
        break
      }
      case 6:
        t = { ...t, config: { ...t.config, excluded: [...t.config.excluded, `X${step}`] } }
        break
      case 7:
        t = {
          ...t,
          config: {
            ...t.config,
            registry: t.config.registry.map((d, i) => (i === 1 ? { ...d, name: `${d.name}*` } : d)),
          },
        }
        break
      case 8:
        t = { ...t, collections: [...t.collections].reverse() }
        break
    }
  }
  return t
}

describe('deltaOf and applyDelta', () => {
  it('a patch of the difference lands on the tree it was taken to, over generated pairs', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = random(seed)
      const a = treeFrom(r)
      const b = edited(r, a)
      const delta = deltaOf(a, b)
      const landed = delta ? applyDelta(a, delta) : a
      expect(landed, `seed ${seed}`).toEqual(b)
    }
  })

  it('a part both trees share is the same object after the patch', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = random(seed)
      const a = treeFrom(r)
      const b = edited(r, a)
      const delta = deltaOf(a, b)
      const landed = delta ? applyDelta(a, delta) : a
      for (const c of b.collections) {
        const held = a.collections.find((x) => x === c)
        if (held) expect(landed.collections.find((x) => x.path === c.path)).toBe(held)
      }
      if (b.contexts === a.contexts) expect(landed.contexts).toBe(a.contexts)
      if (b.config.registry === a.config.registry)
        expect(landed.config.registry).toBe(a.config.registry)
    }
  })

  it('two deep-equal trees differ in nothing', () => {
    const a = treeFrom(random(7))
    expect(deltaOf(a, structuredClone(a))).toBeNull()
  })

  it('a difference naming a member the tree never held throws', () => {
    const a = treeFrom(random(7))
    expect(() =>
      applyDelta(a, { at: { collections: { at: { Ghost: { at: { title: { set: 'x' } } } } } } }),
    ).toThrow()
    expect(() => applyDelta(a, { at: { collections: { at: {}, keys: ['Ghost'] } } })).toThrow()
  })

  it('a difference against nothing is the whole tree', () => {
    const a = treeFrom(random(7))
    expect(deltaOf(undefined, a)).toEqual({ set: a })
  })
})
