import { describe, it, expect } from 'vitest'
import {
  toggleInline,
  setHeading,
  setList,
  setListKind,
  listKindOf,
  setBlock,
  type FormatEdit,
} from './format'

function apply(doc: string, edit: FormatEdit): string {
  let out = doc
  for (const c of [...edit.changes].sort((a, b) => b.from - a.from)) {
    out = out.slice(0, c.from) + c.insert + out.slice(c.to)
  }
  return out
}

describe('toggleInline', () => {
  it('wraps a selection', () => {
    expect(apply('hello', toggleInline('hello', 0, 5, 'bold'))).toBe('**hello**')
  })
  it('unwraps when the selection already sits inside the mark', () => {
    const doc = 'a **bold** b'
    expect(apply(doc, toggleInline(doc, 5, 5, 'bold'))).toBe('a bold b')
  })
  it('link wraps with an empty url ready for typing', () => {
    expect(apply('site', toggleInline('site', 0, 4, 'link'))).toBe('[site]()')
  })
  it('connection wraps the selection in [[ ]], and unwraps from inside', () => {
    expect(apply('Page', toggleInline('Page', 0, 4, 'connection'))).toBe('[[Page]]')
    const doc = 'a [[Page]] b'
    expect(apply(doc, toggleInline(doc, 5, 5, 'connection'))).toBe('a Page b')
  })
  // Unwrapping leaves the words that were in the sentence. For an aliased link those are the alias,
  // not the title — removing a link shouldn't rewrite the prose to a name the reader never saw.
  it('unwrapping an aliased connection leaves the alias behind, not the title', () => {
    const doc = 'a [[Q3 Plan|the plan]] b'
    expect(apply(doc, toggleInline(doc, 14, 14, 'connection'))).toBe('a the plan b')
  })
})

describe('setHeading', () => {
  it('sets a level', () => {
    expect(apply('hello', setHeading('hello', 0, 2))).toBe('## hello')
  })
  it('level 0 clears an existing heading', () => {
    expect(apply('## hello', setHeading('## hello', 0, 0))).toBe('hello')
  })
  it('replaces a list marker rather than stacking', () => {
    expect(apply('- item', setHeading('- item', 0, 1))).toBe('# item')
  })
})

describe('setList', () => {
  it('adds a bullet', () => {
    expect(apply('item', setList('item', 0, 'bullet'))).toBe('- item')
  })
  it('re-applying the same kind clears it', () => {
    expect(apply('- item', setList('- item', 2, 'bullet'))).toBe('item')
  })
  it('switches ordered → task', () => {
    expect(apply('1. item', setList('1. item', 3, 'task'))).toBe('- [ ] item')
  })
})

describe('listKindOf', () => {
  const kindOf = (doc: string): ReturnType<typeof listKindOf> => listKindOf(doc, 0, doc.length)

  it('reads the kind a whole block agrees on, through every level', () => {
    expect(kindOf('- a\n\t- b')).toBe('bullet')
    expect(kindOf('1. a\n2. b')).toBe('ordered')
    expect(kindOf('- [x] a\n- [ ] b')).toBe('checkbox')
    expect(kindOf('→ a\n→ b')).toBe('arrow')
  })

  it('is null where the markers disagree, and where there are none', () => {
    expect(kindOf('- a\n1. b')).toBeNull()
    expect(kindOf('just prose')).toBeNull()
  })

  it('a continuation line is not a disagreement', () => {
    expect(kindOf('- a\n  wrapped\n- b')).toBe('bullet')
  })
})

describe('setListKind', () => {
  const set = (doc: string, kind: Parameters<typeof setListKind>[3]): string =>
    apply(doc, setListKind(doc, 0, doc.length, kind))

  it('rewrites every marker in the block', () => {
    expect(set('- a\n- b', 'ordered')).toBe('1. a\n2. b')
    expect(set('1. a\n2. b', 'checkbox')).toBe('- [ ] a\n- [ ] b')
    expect(set('- [ ] a\n- [x] b', 'arrow')).toBe('→ a\n→ b')
    expect(set('→ a\n→ b', 'bullet')).toBe('- a\n- b')
  })

  it('numbers per indent level, so a nested run restarts and its parent keeps counting', () => {
    expect(set('- a\n\t- x\n\t- y\n- b', 'ordered')).toBe('1. a\n\t1. x\n\t2. y\n2. b')
  })

  it('leaves wrapped continuation lines alone', () => {
    expect(set('- a\n  wrapped body\n- b', 'ordered')).toBe('1. a\n  wrapped body\n2. b')
  })

  it('finds a quoted marker behind its prefix rather than missing it', () => {
    expect(set('> - a\n> - b', 'checkbox')).toBe('> - [ ] a\n> - [ ] b')
  })

  it('emits nothing when the markers already read as they should', () => {
    expect(setListKind('- a\n- b', 0, 7, 'bullet').changes).toEqual([])
  })

  it('repairs a broken ordered sequence', () => {
    expect(set('1. a\n1. b\n1. c', 'ordered')).toBe('1. a\n2. b\n3. c')
  })
})

describe('setBlock', () => {
  it('toggles a blockquote on and off', () => {
    expect(apply('text', setBlock('text', 0, 'quote'))).toBe('> text')
    expect(apply('> text', setBlock('> text', 2, 'quote'))).toBe('text')
  })
  it('quote toggle does NOT strip a callout (its `>` is box chrome) — wraps instead', () => {
    const c = '> [!callout] hi'
    expect(apply(c, setBlock(c, 4, 'quote'))).toBe(`> ${c}`)
  })
  it('callout insert uses the `[!callout]` default (matches the `||` shorthand)', () => {
    expect(apply('hi', setBlock('hi', 0, 'callout'))).toBe('> [!callout] hi')
  })
  it('fences a line as code', () => {
    expect(apply('x = 1', setBlock('x = 1', 0, 'code'))).toBe('```\nx = 1\n```')
  })
  it('inserts a 3×3 GFM table, blank-line separated as its own block', () => {
    const t = '|  |  |  |\n| ------ | ------ | ------ |\n|  |  |  |\n|  |  |  |'
    expect(apply('', setBlock('', 0, 'table'))).toBe(t) // empty doc → table at the top
    expect(apply('hi', setBlock('hi', 2, 'table'))).toBe(`hi\n\n${t}`) // keep the line, blank, then table
  })

  it('blank-line-fences the inserted table below too, so it never merges with an adjacent table', () => {
    const t = '|  |  |  |\n| ------ | ------ | ------ |\n|  |  |  |\n|  |  |  |'
    const below = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    // caret on the blank line directly above a table → table fenced by a blank line on each side
    expect(apply(`text\n\n${below}`, setBlock(`text\n\n${below}`, 5, 'table'))).toBe(
      `text\n\n${t}\n\n${below}`,
    )
    // a blank line already follows → not doubled
    expect(apply(`text\n\n\n${below}`, setBlock(`text\n\n\n${below}`, 5, 'table'))).toBe(
      `text\n\n${t}\n\n${below}`,
    )
  })
})
