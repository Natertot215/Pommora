import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { listRenumberOnDelete } from './ListRenumber'

const del = (doc: string, from: number, to: number, userEvent = 'delete'): string =>
  EditorState.create({ doc, extensions: [listRenumberOnDelete] })
    .update({
      changes: { from, to, insert: '' },
      userEvent,
    })
    .state.doc.toString()

const list = '1. a\n2. b\n3. c'

describe('listRenumberOnDelete', () => {
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

  it('a line deletion outside any run passes through', () => {
    expect(del('one\ntwo\nthree', 4, 8)).toBe('one\nthree')
  })

  it('a run that never began at 1 keeps its own base', () => {
    expect(del('5. a\n6. b\n7. c', 5, 10)).toBe('5. a\n6. c')
  })
})
