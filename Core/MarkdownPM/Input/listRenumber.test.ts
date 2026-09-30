import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { listRenumber } from './listRenumber'
import { scanDoc } from '../Engine/docScan'
import { continueListOnEnter, indentListOnTab, outdentListOnShiftTab, type Edit } from './edits'
import { setList } from './format'
import { landEdit } from '../../Testing/markdownEngine'

const del = (doc: string, from: number, to: number, userEvent = 'delete'): string =>
  EditorState.create({ doc, extensions: [listRenumber('page')] })
    .update({
      changes: { from, to, insert: '' },
      userEvent,
    })
    .state.doc.toString()

const list = '1. a\n2. b\n3. c'

describe('a line deletion closes the gap', () => {
  it('deleting a middle item closes the gap', () => {
    expect(del(list, 5, 10)).toBe('1. a\n2. c')
  })

  it('deleting the last item leaves the run untouched', () => {
    expect(del(list, 9, 14)).toBe('1. a\n2. b')
  })

  it('deleting the first item renumbers from the smallest surviving digit', () => {
    expect(del(list, 0, 5)).toBe('2. b\n3. c')
  })

  it('a deletion within one line renumbers nothing', () => {
    expect(del(list, 8, 9)).toBe('1. a\n2. \n3. c')
  })

  it('a non-delete edit is not judged', () => {
    expect(del(list, 5, 10, 'input')).toBe('1. a\n3. c')
  })

  it('a line deletion inside a code block renumbers nothing', () => {
    expect(del('```\n1. a\n2. b\n3. c\n```', 4, 9)).toBe('```\n2. b\n3. c\n```')
  })

  it('a line deletion outside any run passes through', () => {
    expect(del('one\ntwo\nthree', 4, 8)).toBe('one\nthree')
  })

  it('closes the gap across a loose list', () => {
    expect(del('1. a\n\n2. b\n\n3. c', 6, 12)).toBe('1. a\n\n2. c')
  })

  it('a run that never began at 1 keeps its own base', () => {
    expect(del('5. a\n6. b\n7. c', 5, 10)).toBe('5. a\n6. c')
  })
})

const land = (doc: string, e: Edit | null): string => landEdit(doc, e ? [e] : [], e?.relist)
const at = (doc: string, pos: number, t: typeof indentListOnTab): string =>
  land(doc, t(scanDoc(doc), pos, pos))

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
})

describe('Enter recounts the run it splits', () => {
  it('a caret at the start of an item’s text leaves that item’s number alone', () => {
    expect(at('5. \n6. b', 3, continueListOnEnter)).toBe('5. \n6. \n7. b')
  })
  it('continuing a bullet leaves the numbered list below it alone', () => {
    expect(at('- a\n1. x\n3. y', 3, continueListOnEnter)).toBe('- a\n- \n1. x\n3. y')
  })
  it('counts on through a loose list', () => {
    expect(at('1. a\n\n2. b', 4, continueListOnEnter)).toBe('1. a\n2. \n\n3. b')
  })
  it('repairs a gapped run the way delete and nest do', () => {
    expect(at('1. a\n3. b\n7. c', 9, continueListOnEnter)).toBe('1. a\n2. b\n3. \n4. c')
  })
})

describe('Lists ▸ continues the run a line joins', () => {
  const listed = (doc: string, from: number, to = from): string => {
    const e = setList(doc, from, to, 'ordered')
    return landEdit(doc, e.changes, e.relist)
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
  it('a quoted line continues the quoted run', () => {
    expect(listed('> 1. a\n> b', 9)).toBe('> 1. a\n> 2. b')
  })
  it('a nested line continues its own level', () => {
    expect(listed('1. a\n  1. b\n  c', 15)).toBe('1. a\n  1. b\n  2. c')
  })
  it('a line a blank apart joins the run as a loose item', () => {
    expect(listed('1. a\n\nb', 6)).toBe('1. a\n\n2. b')
  })
  it('paragraphs apart by blank lines become one loose list', () => {
    const doc = 'a\n\nb\n\nc'
    expect(listed(doc, 0, doc.length)).toBe('1. a\n\n2. b\n\n3. c')
  })
  it('a blank line between two quotes ends the quoted run', () => {
    expect(listed('> 1. a\n\n> b', 10)).toBe('> 1. a\n\n> 1. b')
  })
  it('a paragraph between runs ends the run', () => {
    expect(listed('1. a\n\nplain\n\nb', 13)).toBe('1. a\n\nplain\n\n1. b')
  })
  it('a list-writing edit inside display math counts nothing', () => {
    const doc = '$$\n1. a\n$$'
    expect(landEdit(doc, [{ from: 8, to: 8, insert: '5. b\n' }], true)).toBe('$$\n1. a\n5. b\n$$')
  })
  it('a list-writing edit inside a code block counts nothing', () => {
    const doc = '```\n1. a\n```'
    expect(landEdit(doc, [{ from: 9, to: 9, insert: '5. b\n' }], true)).toBe('```\n1. a\n5. b\n```')
  })
})
