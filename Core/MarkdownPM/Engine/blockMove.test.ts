import { describe, it, expect } from 'vitest'
import { blockAt as blockAtIn } from './blockModel'
import { moveRange } from './blockMove'
import { scanDoc } from './docScan'
import { applyEdits } from './markdownCode'

const blockAt = (doc: string, pos: number) => blockAtIn(scanDoc(doc), pos)

describe('moveRange (blank-separated block move)', () => {
  const apply = (doc: string, range: { from: number; to: number }, at: number): string | null => {
    const c = moveRange(doc, range, { at })
    return c ? applyEdits(doc, c) : null
  }

  it('moves a block to EOF without double-blanking the source or gluing the target', () => {
    const doc = 'A\n\nB\n\nC'
    expect(apply(doc, { from: 3, to: 4 }, doc.length)).toBe('A\n\nC\n\nB')
  })

  it('moves a multi-line block cleanly', () => {
    const doc = 'A\n\nB1\nB2\nB3\n\nC'
    expect(apply(doc, { from: 3, to: 11 }, doc.length)).toBe('A\n\nC\n\nB1\nB2\nB3')
  })

  it('moves a block to the top of the document', () => {
    const doc = 'A\n\nB\n\nC'
    expect(apply(doc, { from: 6, to: 7 }, 0)).toBe('C\n\nA\n\nB')
  })

  it('moves a block between two others', () => {
    const doc = 'A\n\nB\n\nC\n\nD'
    expect(apply(doc, { from: 3, to: 4 }, doc.indexOf('D'))).toBe('A\n\nC\n\nB\n\nD')
  })

  it('returns null when dropping a block onto its own start', () => {
    expect(moveRange('A\n\nB\n\nC', { from: 3, to: 4 }, { at: 3 })).toBeNull()
  })

  it('preserves a trailing newline and does not double-blank on a move to EOF', () => {
    const doc = 'A\n\nB\n\nC\n'
    expect(apply(doc, { from: 0, to: 1 }, doc.length)).toBe('B\n\nC\n\nA\n')
  })

  it('a heading-section reorder round-trips without compounding a blank', () => {
    const doc = '# A\nbody\n\n# B\nx'
    const secA = blockAt(doc, 0)
    expect(secA).not.toBeNull()
    const moved = applyEdits(doc, moveRange(doc, secA!, { at: doc.length })!)
    expect(moved).toBe('# B\nx\n\n# A\nbody')
    const secBack = blockAt(moved, moved.indexOf('# A'))
    expect(applyEdits(moved, moveRange(moved, secBack!, { at: 0 })!)).toBe(doc)
  })

  it('snaps a blank-line drop target to the next content block', () => {
    const doc = 'A\n\nB\n\nC' // at=5 is the blank line between B and C → land cleanly before C
    expect(apply(doc, { from: 0, to: 1 }, 5)).toBe('B\n\nA\n\nC')
  })

  it('returns null when dropping onto its own preceding blank', () => {
    expect(moveRange('A\n\nB\n\nC', { from: 3, to: 4 }, { at: 2 })).toBeNull()
  })

  it('injects a blank separator when moving within a doc that had none', () => {
    expect(apply('A\nB\nC', { from: 0, to: 1 }, 5)).toBe('B\nC\n\nA')
  })

  it('a single-block doc has no valid target', () => {
    expect(moveRange('only', { from: 0, to: 4 }, { at: 0 })).toBeNull()
    expect(moveRange('only', { from: 0, to: 4 }, { at: 4 })).toBeNull()
  })

  // A glue-adjacent seam (two blockStarts-distinct blocks with no blank between) must not fuse on a drop — the move has to re-blank-separate both new seams.
  it('does not lazily-continue a list when a block drops under it (no blank below the list)', () => {
    const doc = '- a\n- b\npara X\n\nmover'
    expect(apply(doc, { from: doc.indexOf('mover'), to: doc.length }, doc.indexOf('para X'))).toBe(
      '- a\n- b\n\nmover\n\npara X',
    )
  })

  it('does not merge two paragraphs when a block drops between glued blocks', () => {
    const doc = 'head para\n- list item\n\nmover'
    expect(
      apply(doc, { from: doc.indexOf('mover'), to: doc.length }, doc.indexOf('- list item')),
    ).toBe('head para\n\nmover\n\n- list item')
  })

  it('heals the hole so moving a block out from between two glued blocks does not fuse them', () => {
    const doc = 'alpha\n- a\n- b\n\nbeta'
    expect(apply(doc, { from: doc.indexOf('- a'), to: doc.indexOf('- b') + 3 }, doc.length)).toBe(
      'alpha\n\nbeta\n\n- a\n- b',
    )
  })

  it('does not double-blank when the source ends in a trailing blank line', () => {
    const doc = 'A\n\nB\n\n'
    expect(apply(doc, { from: 0, to: 1 }, doc.length)).toBe('B\n\nA\n')
  })
})
