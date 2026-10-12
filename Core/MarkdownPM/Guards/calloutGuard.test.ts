import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { calloutDeleteVerdict, calloutGuard } from './calloutGuard'
import { scanDoc } from '../Engine/docScan'
import { typeKeys } from '../../Testing/markdownEngine'

const stripsCalloutPrefix = (doc: string, from: number, to: number): boolean =>
  calloutDeleteVerdict(doc, from, to, '', scanDoc(doc)).kind !== 'ok'

describe('calloutGuard — the deletes the verdict leaves alone', () => {
  const doc = '> [!callout] head\n> body'

  it('ALLOWS deleting a prefix-only body line — there is no content for the clamp to protect', () => {
    const d = '> [!callout] head\n>\n> tail'
    expect(stripsCalloutPrefix(d, 18, 19)).toBe(false)
  })
  it('is a no-op for inserts (to <= from)', () => {
    expect(stripsCalloutPrefix(doc, 20, 20)).toBe(false)
  })
  it('ignores non-callout quotes (a plain `> ` quote can still be de-quoted normally)', () => {
    const q = '> a plain quote'
    expect(stripsCalloutPrefix(q, 0, 2)).toBe(false)
  })
})

// Proves the wired extension actually CANCELS the transaction. Runs on a bare EditorState — no DOM — so it exercises the real transactionFilter end-to-end.
describe('calloutGuard — the wired filter cancels prefix-stripping transactions', () => {
  const doc = '> [!callout] head\n> body'
  const del = (from: number, to: number): string => {
    const state = EditorState.create({ doc, extensions: [calloutGuard] })
    return state.update({ changes: { from, to, insert: '' } }).newDoc.toString()
  }

  it('cancels stripping the whole body `> ` in place (no-op, box intact)', () => {
    expect(del(18, 20)).toBe(doc)
  })
  it('cancels deleting just the space (the `>body` corruption)', () => {
    expect(del(19, 20)).toBe(doc)
  })
  it('lets a JOIN through (merges the body up into the box)', () => {
    expect(del(17, 20)).toBe('> [!callout] headbody')
  })
  it('lets body content deletion through (prefix survives)', () => {
    expect(del(20, 24)).toBe('> [!callout] head\n> ')
  })
  it('lets the HEAD de-callout through (whole box removed on purpose)', () => {
    expect(del(0, 13)).toBe('head\n> body')
  })
})

describe('calloutGuard — the caret follows a clamped replacement', () => {
  it('typing over a selection from the body line’s start lands every character after the prefix', () => {
    const state = EditorState.create({
      doc: '> [!callout] head\n> body',
      selection: { anchor: 18, head: 21 },
      extensions: [calloutGuard],
    })
    expect(typeKeys(state, 'xyz')).toBe('> [!callout] head\n> xyzody')
  })
})
