import { describe, it, expect } from 'vitest'
import { scanDoc } from './docScan'
import { applyEdits, lineIndexAt } from './markdownCode'
import { subBlockAt, renumberRuns, checkboxToggleChange, siblingsAt, dropItem } from './listModel'
import { moveRange } from './blockMove'
import type { MarkdownScope } from './detect'
import { landEdit } from '../Input/listRenumber'

describe('subBlockAt × block math', () => {
  it('indented math with an internal blank rides the item — the reorder gesture cannot tear it', () => {
    const doc = '- one\n  $$\n  x\n\n  y\n  $$\n- two'
    const b = subBlockAt(scanDoc(doc), 0)
    expect(doc.slice(b!.from, b!.to)).toBe('- one\n  $$\n  x\n\n  y\n  $$')
  })

  it('a marker-looking line inside absorbed math stays formula content', () => {
    const doc = '- one\n  $$\n- x\n  $$\n- two'
    const b = subBlockAt(scanDoc(doc), 0)
    expect(doc.slice(b!.from, b!.to)).toBe('- one\n  $$\n- x\n  $$')
  })

  it('a wrapped item carries its continuation inside a quote or callout too', () => {
    for (const lead of ['', '> ', '> [!note] head\n> ']) {
      const pfx = lead.split('\n').pop()!
      const doc = `${lead}- a\n${pfx}  more\n${pfx}- b`
      const b = subBlockAt(scanDoc(doc), doc.indexOf('- a'))
      expect(doc.slice(b!.from, b!.to)).toBe(`${pfx}- a\n${pfx}  more`)
    }
  })

  it('top-level math glued below an item is never absorbed by the gesture', () => {
    const doc = '- one\n$$\nx\n\ny\n$$'
    const b = subBlockAt(scanDoc(doc), 0)
    expect(doc.slice(b!.from, b!.to)).toBe('- one')
  })
})

/** Drag the item whose line contains `grab` beside the item whose line contains `near`: above it, or with `after` below the block it carries, landed as the editor lands it. */
function drop(
  doc: string,
  grab: number,
  near: number,
  after = false,
  scope: MarkdownScope = 'page',
): string {
  const scan = scanDoc(doc, scope)
  const k = lineIndexAt(scan, near)
  const at = after ? Math.min(doc.length, subBlockAt(scan, near).to + 1) : scan.lineStarts[k]
  const changes = dropItem(scan, subBlockAt(scan, grab), at, k)
  return changes ? landEdit(doc, changes, 'move.drop', scope) : doc
}

const lineStart = (doc: string, needle: string): number => doc.indexOf(needle)

describe('a drop in a cell', () => {
  it('recounts a run between `$$` lines, which a cell reads as lines', () => {
    const doc = '$$\n1. a\n2. b\n3. c\n$$'
    expect(drop(doc, lineStart(doc, '3. c'), lineStart(doc, '1. a'), false, 'lists')).toBe(
      '$$\n1. c\n2. a\n3. b\n$$',
    )
  })
})

describe('subBlockAt', () => {
  it('returns just the line for a flat item', () => {
    const doc = '- a\n- b\n- c'
    const b = subBlockAt(scanDoc(doc), doc.indexOf('b'))
    expect(doc.slice(b.from, b.to)).toBe('- b')
  })
  it('includes deeper-indented descendants', () => {
    const doc = '- a\n\t- a1\n\t- a2\n- b'
    const b = subBlockAt(scanDoc(doc), 1)
    expect(doc.slice(b.from, b.to)).toBe('- a\n\t- a1\n\t- a2')
    const apart = '- a\n\n- b\n\n  cont b\n\n- c'
    const l = subBlockAt(scanDoc(apart), apart.indexOf('- b'))
    expect(apart.slice(l.from, l.to)).toBe('- b')
  })
})

describe('drag reorders source lines', () => {
  it("refuses a drop on the dragged item's own edges, so a release there cancels in place", () => {
    const doc = '- a\n- b\n  - child\n- c'
    const block = subBlockAt(scanDoc(doc), lineStart(doc, '- b'))
    expect(moveRange(doc, block, { at: block.from }, false)).toBeNull()
    expect(moveRange(doc, block, { at: block.to + 1 }, false)).toBeNull()
  })
  it('moves a bullet item down past a sibling', () => {
    const doc = '- a\n- b\n- c'
    const out = drop(doc, lineStart(doc, 'a'), lineStart(doc, '- c'))
    expect(out).toBe('- b\n- a\n- c')
    const lone = '- x\n\n- y\n\npara\n\n- a\n- b'
    expect(drop(lone, 0, lineStart(lone, '- b'))).toBe('- y\n\npara\n\n- a\n- x\n- b')
    const lists = '- p\n  - x\n\n  - y\n\n\t- z'
    expect(drop(lists, lineStart(lists, '\t- z'), lineStart(lists, '  - y'))).toBe(
      '- p\n  - x\n\n  - z\n  - y',
    )
  })
  it('moves a bullet item to the end', () => {
    const doc = '- a\n- b\n- c'
    const out = drop(doc, lineStart(doc, 'a'), lineStart(doc, '- c'), true)
    expect(out).toBe('- b\n- c\n- a')
  })
})

describe('ordered list renumbers after a move', () => {
  it('renumbers source + destination runs', () => {
    const doc = '1. a\n2. b\n3. c'
    const out = drop(doc, lineStart(doc, 'c'), 0)
    expect(out).toBe('1. c\n2. a\n3. b')
    const lists = '1. a\n\n2. b\n\n3. c'
    expect(drop(lists, lineStart(lists, '3. c'), 0)).toBe('1. c\n2. a\n\n2. b')
  })
  it('reletters an alphabetical run', () => {
    const doc = 'A. a\nB. b\nC. c'
    const out = drop(doc, lineStart(doc, 'c'), 0)
    expect(out).toBe('A. c\nB. a\nC. b')
  })
  it('renumbers when moving the first item down', () => {
    const doc = '1. a\n2. b\n3. c'
    const out = drop(doc, lineStart(doc, 'a'), lineStart(doc, '3. c'), true)
    expect(out).toBe('1. b\n2. c\n3. a')
    const lists = '1. a\n\n2. b\n\n3. c'
    expect(drop(lists, 0, lineStart(lists, '3. c'), true)).toBe('2. b\n\n3. c\n4. a')
    expect(drop(lists, lineStart(lists, '2. b'), lineStart(lists, '3. c'), true)).toBe(
      '1. a\n\n3. c\n4. b',
    )
  })
  it('renumbers the whole run when an item with a continuation line moves up', () => {
    const doc = '1. a\n2. b\n3. c\n   more about c\n4. d'
    const out = drop(doc, lineStart(doc, '3. c'), lineStart(doc, '2. b'))
    expect(out).toBe('1. a\n2. c\n   more about c\n3. b\n4. d')
  })
  it('renumbers the whole run when an item with a bullet child moves up', () => {
    const doc = '1. a\n2. b\n3. c\n   - kid\n4. d'
    const out = drop(doc, lineStart(doc, '3. c'), lineStart(doc, '2. b'))
    expect(out).toBe('1. a\n2. c\n   - kid\n3. b\n4. d')
  })
  it('renumbers the whole run when an item with a nested ordered child moves up', () => {
    const doc = '1. a\n2. b\n3. c\n   1. kid\n4. d'
    const out = drop(doc, lineStart(doc, '3. c'), lineStart(doc, '2. b'))
    expect(out).toBe('1. a\n2. c\n   1. kid\n3. b\n4. d')
  })
  it('renumbers the whole run when an item with a child moves to the top', () => {
    const doc = '1. a\n2. b\n3. c\n   more about c\n4. d'
    const out = drop(doc, lineStart(doc, '3. c'), 0)
    expect(out).toBe('1. c\n   more about c\n2. a\n3. b\n4. d')
  })
})

describe('a drag recounts on its own surface', () => {
  it('reads fence-shaped lines in a cell as lines, moved text included', () => {
    const doc = '```\n1. a\n2. b\n```'
    expect(drop(doc, doc.indexOf('2. b'), doc.indexOf('1. a'), false, 'lists')).toBe(
      '```\n1. b\n2. a\n```',
    )
  })
})

describe('a drag keeps the start of the run it lands in', () => {
  it('a list starting at 5 stays at 5 whichever way an item moves', () => {
    const doc = '5. a\n6. b\n7. c'
    expect(drop(doc, lineStart(doc, '7. c'), 0)).toBe('5. c\n6. a\n7. b')
    expect(drop(doc, 0, lineStart(doc, '7. c'), true)).toBe('5. b\n6. c\n7. a')
  })
  it('a lettered run past Z keeps its start across a drag', () => {
    const doc = 'Y. a\nZ. b\nA. c'
    expect(drop(doc, lineStart(doc, 'A. c'), 0)).toBe('Y. c\nZ. a\nA. b')
  })
  it('an item from another list takes its place in the run it joins', () => {
    const doc = '1. x\n2. y\n\n5. a\n6. b'
    expect(drop(doc, 0, lineStart(doc, '5. a'))).toBe('2. y\n\n5. x\n6. a\n7. b')
  })
  it('an item of another type takes the marker of the list it joins, and its place in the run', () => {
    const doc = '3. x\n\nA. a\nB. b'
    expect(drop(doc, 0, lineStart(doc, 'A. a'))).toBe('A. x\nB. a\nC. b')
    expect(drop(doc, 0, lineStart(doc, 'B. b'), true)).toBe('A. a\nB. b\nC. x')
  })
  it('a dropped item takes its sibling\u2019s lead and marker, a task\u2019s box emptied, and what it carries stays as written', () => {
    const doc = '- [x] p\n\t- [x] kid\n\n- a\n\t→ sub'
    expect(drop(doc, 0, lineStart(doc, '\t→ sub'), true)).toBe('- a\n\t→ sub\n\t→ p\n\t\t- [x] kid')
    const tasks = '- x\n\n- [x] a\n- [ ] b'
    expect(drop(tasks, 0, lineStart(tasks, '- [x] a'), true)).toBe('- [x] a\n- [ ] x\n- [ ] b')
    const same = '- [x] x\n\n- [ ] a'
    expect(drop(same, 0, lineStart(same, '- [ ] a'))).toBe('- [x] x\n- [ ] a')
  })
  it('a drop between two items reads the one above it, as Tab does, and a drop on a list\u2019s first item reads that item', () => {
    const doc = '1. x\n\n- [x] a\n- note'
    expect(drop(doc, 0, lineStart(doc, '- note'))).toBe('- [x] a\n- [ ] x\n- note')
    expect(drop(doc, 0, lineStart(doc, '- [x] a'), true)).toBe('- [x] a\n- [ ] x\n- note')
    expect(drop(doc, 0, lineStart(doc, '- [x] a'))).toBe('- [ ] x\n- [x] a\n- note')
  })
  it('a move among siblings of several types reads the item above its landing like any other', () => {
    const doc = '- [ ] a\n- note\n- [x] c'
    expect(drop(doc, lineStart(doc, '- [x] c'), lineStart(doc, '- note'))).toBe(
      '- [ ] a\n- [x] c\n- note',
    )
    expect(drop(doc, 0, lineStart(doc, '- note'), true)).toBe('- note\n- a\n- [x] c')
    const glued = '- a\n- b\n1. c\n2. d'
    expect(drop(glued, 0, lineStart(glued, '2. d'))).toBe('- b\n1. c\n2. a\n3. d')
  })
  it('the source list closes up, and a lone item takes one blank with it', () => {
    const doc = '1. a\n2. x\n3. b\n\n1. p'
    expect(drop(doc, lineStart(doc, '2. x'), lineStart(doc, '1. p'), true)).toBe(
      '1. a\n2. b\n\n1. p\n2. x',
    )
    const lone = 'top\n\n- x\n\nend\n\n- a'
    expect(drop(lone, lineStart(lone, '- x'), lineStart(lone, '- a'), true)).toBe(
      'top\n\nend\n\n- a\n- x',
    )
  })
})

describe('a blank line ends a list', () => {
  it('stops the walks at it, and a carried block\u2019s own blank line does not count', () => {
    const doc = '- a\n\n  para\n- b'
    expect(subBlockAt(scanDoc(doc), 0).to).toBe(3)
    expect(siblingsAt(scanDoc(doc), 3).items).toEqual([3])
    const code = '- a\n  ```\n  x\n\nflush\n  ```\n- b'
    expect(siblingsAt(scanDoc(code), 0).items).toEqual([0, 6])
  })
})

describe('nested sub-block moves as a unit', () => {
  it('carries descendants with the parent', () => {
    const doc = '- a\n\t- a1\n\t- a2\n- b'
    const out = drop(doc, lineStart(doc, '- a'), lineStart(doc, '- b'), true)
    expect(out).toBe('- b\n- a\n\t- a1\n\t- a2')
  })
})

describe('re-nesting on drop (slot.indent adopts the target depth)', () => {
  it('flattens a nested item to root when dropped at a root-indent target', () => {
    const doc = '- a\n\t- nested\n- b'
    expect(drop(doc, lineStart(doc, 'nested'), lineStart(doc, '- b'), true)).toBe(
      '- a\n- b\n- nested',
    )
  })
  it('re-indents the whole sub-block, preserving relative nesting', () => {
    const doc = '- a\n\t- p\n\t\t- c\n- b'
    expect(drop(doc, lineStart(doc, '- p'), lineStart(doc, '- b'), true)).toBe(
      '- a\n- b\n- p\n\t- c',
    )
  })
})

describe('click (no drag past threshold) toggles a checkbox, never reorders', () => {
  it('unchecked → checked toggle change targets the box only', () => {
    const doc = '- [ ] todo\n- [ ] next'
    const c = checkboxToggleChange(scanDoc(doc), doc.indexOf('[ ]'))!
    expect(applyEdits(doc, [c])).toBe('- [x] todo\n- [ ] next')
  })
  it('checked → unchecked', () => {
    const doc = '- [x] done'
    const c = checkboxToggleChange(scanDoc(doc), 2)!
    expect(applyEdits(doc, [c])).toBe('- [ ] done')
  })
  it('targets the box past the first line, behind a quote', () => {
    expect(checkboxToggleChange(scanDoc('a\n> - [ ] b'), 6)).toEqual({
      from: 6,
      to: 9,
      insert: '[x]',
    })
  })
  it('returns null for a bullet (no toggle) so a click just places the caret', () => {
    expect(checkboxToggleChange(scanDoc('- plain'), 0)).toBe(null)
  })
})

describe('renumberRuns', () => {
  it('produces minimal digit rewrites', () => {
    expect(renumberRuns(scanDoc('3. a\n4. b\n5. c'), [0])).toEqual([])
  })
  it('fixes a broken run', () => {
    const doc = '1. a\n1. b\n1. c'
    expect(applyEdits(doc, renumberRuns(scanDoc(doc), [0]))).toBe('1. a\n2. b\n3. c')
  })
  it('counts every run of the list, each from its first item, and a nested run from 1', () => {
    const doc = '5. a\n\t3. x\n\t3. y\n7. b\n- c\n9. d\n9. e'
    expect(applyEdits(doc, renumberRuns(scanDoc(doc), [0]))).toBe(
      '5. a\n\t1. x\n\t2. y\n6. b\n- c\n9. d\n10. e',
    )
  })
  it('a quote carried by an item holds a list of its own, read apart from the one around it', () => {
    const doc = '1. a\n  > 1. q\n  > 3. r\n3. b'
    const outer = scanDoc(doc)
    expect(applyEdits(doc, renumberRuns(outer, [0]))).toBe('1. a\n  > 1. q\n  > 3. r\n2. b')
    expect(applyEdits(doc, renumberRuns(outer, [0, doc.indexOf('  > 1.')]))).toBe(
      '1. a\n  > 1. q\n  > 2. r\n2. b',
    )
  })
})

describe('drag inside a callout (prefix-aware)', () => {
  it('reorders a callout bullet without doubling the `>` prefix', () => {
    const doc = '> [!callout] head\n> - one\n> - two'
    expect(drop(doc, doc.indexOf('one'), doc.indexOf('two'), true)).toBe(
      '> [!callout] head\n> - two\n> - one',
    )
  })
  it('an item that was its whole list heals its hole as it does outside a quote', () => {
    const doc = '> 1. a\n>\n> - x\n>\n> 1. b'
    expect(drop(doc, doc.indexOf('x'), doc.indexOf('1. b'), true)).toBe('> 1. a\n>\n> 1. b\n> 2. x')
  })
  it('subBlockAt does NOT swallow a top-level indented sibling across the box boundary', () => {
    const doc = '> - a\n\t- x'
    const block = subBlockAt(scanDoc(doc), doc.indexOf('a'))
    expect(block.to).toBe(doc.indexOf('\n')) // block is just `> - a`, not the `\t- x` line
  })
  it('subBlockAt DOES keep a same-box deeper child', () => {
    const doc = '> - a\n> \t- child'
    const block = subBlockAt(scanDoc(doc), doc.indexOf('a'))
    expect(block.to).toBe(doc.length) // the `> \t- child` shares the `>` box → captured
  })
})
