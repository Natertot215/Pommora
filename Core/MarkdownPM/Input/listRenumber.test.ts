import { describe, it, expect } from 'vitest'
import { history, undo } from '@codemirror/commands'
import { EditorState, type Transaction } from '@codemirror/state'
import { editEvent, landEdit, listRenumber } from './listRenumber'
import { scanDoc } from '../Engine/docScan'
import {
  continueListOnEnter,
  indentListOnTab,
  outdentListOnShiftTab,
  smartBackspace,
  type Edit,
} from './edits'
import { setList } from './format'

const del = (doc: string, from: number, to: number, userEvent = 'delete'): string =>
  EditorState.create({ doc, extensions: [listRenumber] })
    .update({
      changes: { from, to, insert: '' },
      userEvent,
    })
    .state.doc.toString()

const list = '1. a\n2. b\n3. c'

describe('a line deletion closes the gap', () => {
  it('deleting a middle item closes the gap', () => {
    expect(del(list, 5, 10)).toBe('1. a\n2. c')
    expect(del('1. a\n2. b\n   1. k\n   2. m\n3. c', 5, 10)).toBe('1. a\n   1. k\n   2. m\n2. c')
  })

  it('deleting the last item leaves the run untouched', () => {
    expect(del(list, 9, 14)).toBe('1. a\n2. b')
  })

  it('deleting the first item counts on from the item that now leads', () => {
    expect(del(list, 0, 5)).toBe('2. b\n3. c')
  })

  it('a deletion within one line renumbers nothing', () => {
    expect(del(list, 8, 9)).toBe('1. a\n2. \n3. c')
  })

  it('an input edit with no selection across lines recounts nothing', () => {
    expect(del(list, 5, 10, 'input')).toBe('1. a\n3. c')
  })

  it('a line deletion inside a code block renumbers nothing', () => {
    expect(del('```\n1. a\n2. b\n3. c\n4. d\n```', 9, 14)).toBe('```\n1. a\n3. c\n4. d\n```')
  })

  it('a line deletion inside a Markdown code block closes the gap', () => {
    expect(del('```md\n1. a\n2. b\n3. c\n4. d\n```', 11, 16)).toBe('```md\n1. a\n2. c\n3. d\n```')
  })

  it('a line deletion outside any run passes through', () => {
    expect(del('one\ntwo\nthree', 4, 8)).toBe('one\nthree')
  })

  it('a list below a blank line keeps its numbers', () => {
    expect(del('1. a\n\n2. b\n\n3. c', 6, 12)).toBe('1. a\n\n3. c')
  })

  it('removing the blank line between two lists merges them and recounts', () => {
    expect(del('1. a\n2. b\n\n7. c\n8. d', 10, 11)).toBe('1. a\n2. b\n3. c\n4. d')
  })

  it('a marker taken by a selection recounts the run it broke', () => {
    const doc = '- p\n\t1. x\n\t2. y\n\t3. z'
    const y = doc.indexOf('2. y')
    expect(del(doc, y, y + 3)).toBe('- p\n\t1. x\n\ty\n\t2. z')
  })

  it('a flush line left by a taken marker ends the list, and the lower one keeps its numbers', () => {
    expect(del('1. a\n2. b\n3. c', 5, 8)).toBe('1. a\nb\n3. c')
  })

  it('a run that never began at 1 keeps its own base', () => {
    expect(del('5. a\n6. b\n7. c', 5, 10)).toBe('5. a\n6. c')
  })
})

const land = (doc: string, e: Edit | null): string =>
  landEdit(doc, e ? [e] : [], editEvent(e ?? {}), 'page')
const at = (doc: string, pos: number, t: typeof indentListOnTab): string =>
  land(doc, t(scanDoc(doc), pos, pos))

describe('an edit landed in a cell', () => {
  it('recounts a run between fence-shaped lines, which a cell reads as lines', () => {
    const doc = '```\n1. a\n2. b\n3. c\n```'
    const from = doc.indexOf('2. b')
    expect(landEdit(doc, [{ from, to: from + 5, insert: '' }], 'delete', 'lists')).toBe(
      '```\n1. a\n2. c\n```',
    )
  })
})

describe('a change resting on a carried block’s delimiter', () => {
  it('removing the blank below the block merges the two lists and recounts them', () => {
    const doc = '1. a\n   ```js\n   x\n   ```\n\n1. b\n2. c'
    const at = doc.indexOf('\n\n1. b')
    expect(del(doc, at, at + 1)).toBe('1. a\n   ```js\n   x\n   ```\n2. b\n3. c')
  })

  it('taking the item above the block counts past it from its opener', () => {
    expect(del('1. a\n2. b\n   ```js\n   x\n   ```\n3. c', 5, 10)).toBe(
      '1. a\n   ```js\n   x\n   ```\n2. c',
    )
  })

  const blocks = '   ```js\n   x\n   ```\n   ```js\n   y\n   ```'

  it('taking the item between two blocks counts past both', () => {
    const doc = '1. a\n   ```js\n   x\n   ```\n2. b\n   ```js\n   y\n   ```\n3. c'
    const from = doc.indexOf('2. b')
    expect(del(doc, from, from + 5)).toBe(`1. a\n${blocks}\n2. c`)
  })

  it('removing the blank below two blocks merges the lists and recounts them', () => {
    const doc = `1. a\n${blocks}\n\n1. b\n2. c`
    const at = doc.indexOf('\n\n1. b')
    expect(del(doc, at, at + 1)).toBe(`1. a\n${blocks}\n2. b\n3. c`)
  })
})

describe('a keystroke over a selection across items', () => {
  const over = (doc: string, from: number, to: number, insert: string, userEvent: string): string =>
    EditorState.create({ doc, selection: { anchor: from, head: to }, extensions: [listRenumber] })
      .update({ changes: { from, to, insert }, userEvent })
      .state.doc.toString()

  it('typing or Enter recounts the run it joins', () => {
    expect(over(list, 3, 8, 'x', 'input.type')).toBe('1. xb\n2. c')
    expect(over(list, 4, 10, '\n', 'input')).toBe('1. a\n2. c')
  })
})

describe('a level change recounts the run it joined and the run it left', () => {
  it('an indented item starts its nested run over, and the run it left closes up', () => {
    expect(at('A. a\nB. b\nC. c', 5, indentListOnTab)).toBe('A. a\n\tA. b\nB. c')
  })
  it('an indented item joins a nested run already there', () => {
    expect(at('1. a\n\t1. kid\n2. b', 13, indentListOnTab)).toBe('1. a\n\t1. kid\n\t2. b')
  })
  it('an outdented item continues the parent run, and the siblings it now holds start over', () => {
    expect(at('A. a\n\tA. b\n\tB. c\nB. d', 6, outdentListOnShiftTab)).toBe(
      'A. a\nB. b\n\tA. c\nC. d',
    )
  })
  it('an outdented item takes its place in a run that starts past 1', () => {
    expect(at('5. a\n\t1. b\n6. c', 6, outdentListOnShiftTab)).toBe('5. a\n6. b\n7. c')
  })
  it('switching a numbered item out of its run recounts the run below', () => {
    const doc = '- p\n\t1. a\n\t2. b\n\t\t- kid\n\t3. c'
    const b = doc.indexOf('b')
    const e = setList(scanDoc(doc), b, b + 1, 'bullet', {})
    expect(landEdit(doc, e.changes, editEvent(e), 'page')).toBe(
      '- p\n\t1. a\n\t- b\n\t\t- kid\n\t1. c',
    )
    expect(landEdit(doc, [smartBackspace(scanDoc(doc), b, b)!], 'delete', 'page')).toBe(
      '- p\n\t1. a\n\tb\n\t\t- kid\n\t2. c',
    )
    const run = '- p\n\t1. x\n\t2. y\n\t3. z'
    const y = run.indexOf('y')
    expect(landEdit(run, [smartBackspace(scanDoc(run), y, y)!], 'delete', 'page')).toBe(
      '- p\n\t1. x\n\ty\n\t2. z',
    )
    const apart = '- p\n\t1. a\n\n\t2. b\n\t3. c'
    const a = apart.indexOf('a')
    const l = setList(scanDoc(apart), a, a + 1, 'bullet', {})
    expect(landEdit(apart, l.changes, editEvent(l), 'page')).toBe('- p\n\t- a\n\n\t2. b\n\t3. c')
    const parent = '3. p\n\t1. a\n5. q'
    const n = parent.indexOf('a')
    const p = setList(scanDoc(parent), n, n + 1, 'bullet', {})
    expect(landEdit(parent, p.changes, editEvent(p), 'page')).toBe('3. p\n\t- a\n4. q')
  })
})

describe('Enter recounts the run it splits', () => {
  it('a nested run under the next item counts on its own', () => {
    const doc = '1. a\n   1. x\n2. b\n   1. y'
    expect(at(doc, doc.indexOf('\n   1. y'), continueListOnEnter)).toBe(
      '1. a\n   1. x\n2. b\n3. \n   1. y',
    )
  })
  it('a line of spaces ends a list', () => {
    expect(at('1. a\n   \n1. b', 4, continueListOnEnter)).toBe('1. a\n2. \n   \n1. b')
  })
  it('a caret at the start of an item’s text leaves that item’s number alone', () => {
    expect(at('5. \n6. b', 3, continueListOnEnter)).toBe('5. \n6. \n7. b')
  })
  it('continuing a bullet leaves the numbered list below it alone', () => {
    expect(at('- a\n1. x\n3. y', 3, continueListOnEnter)).toBe('- a\n- \n1. x\n3. y')
  })
  it('stops at a blank line, so the list below keeps its numbers', () => {
    expect(at('1. a\n\n2. b', 4, continueListOnEnter)).toBe('1. a\n2. \n\n2. b')
  })
  it('lands past a run that grew a digit, the caret behind the marker it wrote', () => {
    const state = EditorState.create({ doc: '9. a', extensions: listRenumber })
    const e = continueListOnEnter(scanDoc('9. a'), 4, 4)!
    const next = state.update({
      changes: e,
      selection: { anchor: e.selection },
      userEvent: editEvent(e),
    }).state
    expect(next.doc.toString()).toBe('9. a\n10. ')
    expect(next.selection.main.head).toBe(next.doc.length)
  })
  it('a lettered run past Z keeps its letters and carries on', () => {
    expect(at('Y. a\nZ. b\nA. c', 14, continueListOnEnter)).toBe('Y. a\nZ. b\nA. c\nB. ')
  })
  it('counts past a code block nested in the list, and never counts the code', () => {
    const doc = '- p\n\t1. x\n\t```\n\t1. y\n\t```\n\t1. z'
    expect(at(doc, 9, continueListOnEnter)).toBe('- p\n\t1. x\n\t2. \n\t```\n\t1. y\n\t```\n\t3. z')
  })
  it('repairs a gapped run the way delete and nest do', () => {
    expect(at('1. a\n3. b\n7. c', 9, continueListOnEnter)).toBe('1. a\n2. b\n3. \n4. c')
  })
})

describe('Lists ▸ continues the run a line joins', () => {
  const listed = (doc: string, from: number, to = from): string => {
    const e = setList(scanDoc(doc), from, to, 'ordered', {})
    return landEdit(doc, e.changes, editEvent(e), 'page')
  }
  it('a paragraph between two items takes its place, and the run below counts on', () => {
    expect(listed('1. a\n2. b\nc\n3. d', 10)).toBe('1. a\n2. b\n3. c\n4. d')
  })
  it('lines below a run continue it, past a nested item', () => {
    const doc = '1. a\n2. b\n  - aside\nc\nd'
    expect(listed(doc, 20, doc.length)).toBe('1. a\n2. b\n  - aside\n3. c\n4. d')
  })
  it('a run that began past 1 keeps its base', () => {
    expect(listed('5. a\nb', 5)).toBe('5. a\n6. b')
  })
  it('a pick leaves an item already numbered alone, and the run keeps its start', () => {
    expect(listed('5. a\n- b\n\n7. c', 0, 6)).toBe('5. a\n6. b\n\n7. c')
    expect(listed('1. a\n1. b\n1. c', 0)).toBe('1. a\n1. b\n1. c')
  })
  it('a line picked above a run starts it, since a run counts from its first item', () => {
    expect(listed('b\n5. a', 0)).toBe('1. b\n2. a')
  })
  it('a quoted line continues the quoted run', () => {
    expect(listed('> 1. a\n> b', 9)).toBe('> 1. a\n> 2. b')
  })
  it('a line a blank apart starts a list of its own', () => {
    expect(listed('1. a\n\nb', 6)).toBe('1. a\n\n1. b')
  })
  it('paragraphs apart by blank lines each become a list of their own', () => {
    const doc = 'a\n\nb\n\nc'
    expect(listed(doc, 0, doc.length)).toBe('1. a\n\n1. b\n\n1. c')
  })
  it('a blank line between two quotes ends the quoted run', () => {
    expect(listed('> 1. a\n\n> b', 10)).toBe('> 1. a\n\n> 1. b')
  })
  it('a paragraph between runs ends the run', () => {
    expect(listed('1. a\n\nplain\n\nb', 13)).toBe('1. a\n\nplain\n\n1. b')
  })
  it('a list-writing edit inside display math counts nothing', () => {
    const doc = '$$\n1. a\n$$'
    expect(
      landEdit(doc, [{ from: 8, to: 8, insert: '5. b\n' }], editEvent({ relist: true }), 'page'),
    ).toBe('$$\n1. a\n5. b\n$$')
  })
  it('a list-writing edit inside a Markdown code block counts within the block', () => {
    const doc = '```md\n1. a\n```'
    expect(
      landEdit(doc, [{ from: 11, to: 11, insert: '5. b\n' }], editEvent({ relist: true }), 'page'),
    ).toBe('```md\n1. a\n2. b\n```')
  })
  it('a pick wholly inside a Markdown code block switches its own list, and nothing else reaches the code or its fences', () => {
    const doc = '- p\n\t1. x\n\t```md\n\t- y\n\t- y2\n\t```\n\t1. z'
    const fence = doc.indexOf('```')
    expect(listed(doc, doc.indexOf('y'))).toBe(
      '- p\n\t1. x\n\t```md\n\t1. y\n\t2. y2\n\t```\n\t1. z',
    )
    expect(listed(doc, fence, doc.indexOf('y2') + 2)).toBe(
      '- p\n\t1. x\n\t```md\n\t1. y\n\t2. y2\n\t```\n\t1. z',
    )
    expect(listed(doc, fence)).toBe(doc)
    expect(listed(doc, doc.indexOf('y'), doc.length)).toBe(doc)
  })
  it('a carried Markdown block counts its own run, and the list around it counts past the block', () => {
    const doc = '1. a\n   ```md\n   1. x\n   2. y\n   ```\n2. b'
    const written = (at: string, insert: string): string => {
      const from = doc.indexOf(at)
      return landEdit(doc, [{ from, to: from, insert }], editEvent({ relist: true }), 'page')
    }
    expect(written('2. b', '9. n\n')).toBe('1. a\n   ```md\n   1. x\n   2. y\n   ```\n2. n\n3. b')
    expect(written('   2. y', '   9. n\n')).toBe(
      '1. a\n   ```md\n   1. x\n   2. n\n   3. y\n   ```\n2. b',
    )
  })
})

describe('a paste into a numbered list', () => {
  const pasted = (doc: string, from: number, to: number, insert: string): string =>
    EditorState.create({ doc, extensions: listRenumber })
      .update({ changes: { from, to, insert }, userEvent: 'input.paste' })
      .state.doc.toString()

  it('recounts around lines it brings, whatever numbers they hold', () => {
    expect(pasted('1. a\n2. b\n3. c', 9, 9, '\n9. x\n9. y')).toBe('1. a\n2. b\n3. x\n4. y\n5. c')
    expect(pasted('5. a\n6. b', 5, 5, '1. x\n2. y\n')).toBe('5. a\n6. x\n7. y\n8. b')
    expect(pasted('5. a\n6. b', 0, 0, 'intro\n1. x\n')).toBe('intro\n1. x\n2. a\n3. b')
  })
  it('recounts a single item it writes into the gap between two lists', () => {
    expect(pasted('1. a\n\n3. c\n4. d', 5, 5, '2. b')).toBe('1. a\n2. b\n3. c\n4. d')
  })
  it('over a selection closes the gap the items leave', () => {
    const doc = '1. a\n2. b\n3. c\n4. d'
    expect(pasted(doc, 5, 15, '2. x\n')).toBe('1. a\n2. x\n3. d')
    expect(pasted(doc, 8, 14, 'x')).toBe('1. a\n2. x\n3. d')
  })
  it('splits nothing below a flush line it brings', () => {
    expect(pasted('1. a\n2. b\n3. c', 9, 9, ' x\nplain')).toBe('1. a\n2. b x\nplain\n3. c')
  })
  it('leaves words pasted inside an item alone, a gapped run included', () => {
    expect(pasted('1. a\n3. b', 4, 4, 'word')).toBe('1. aword\n3. b')
  })
  it('counts nothing inside a code block or display math', () => {
    expect(pasted('```\n1. a\n```', 8, 8, '\n1. b')).toBe('```\n1. a\n1. b\n```')
    expect(pasted('$$\n1. a\n$$', 7, 7, '\n1. b')).toBe('$$\n1. a\n1. b\n$$')
  })
  it('takes one undo, its numbers with it', () => {
    const state = EditorState.create({
      doc: '1. a\n2. b',
      extensions: [history(), listRenumber],
    })
    const view = {
      state,
      dispatch: (tr: Transaction) => {
        view.state = tr.state
      },
    }
    view.dispatch(
      state.update({ changes: { from: 4, insert: '\n1. x' }, userEvent: 'input.paste' }),
    )
    expect(view.state.doc.toString()).toBe('1. a\n2. x\n3. b')
    undo(view)
    expect(view.state.doc.toString()).toBe('1. a\n2. b')
  })
})
