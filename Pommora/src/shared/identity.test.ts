import { describe, it, expect } from 'vitest'
import { admitContentFile, contentId, ID_KEY, kindOf, markId } from './identity'

const PAGE = '01KVGMT8BFP350FZZXAMG1QDRC'
const TASK = '01KVGMT8BFT350FZZXAMG1QDRC'
const EVENT = '01KVGMT8BFE350FZZXAMG1QDRC'
const UNMARKED = '01KVGMT8BF9350FZZXAMG1QDRC'

describe('the kind mark', () => {
  it('replaces the first random character, leaving the encoded time intact', () => {
    expect(markId(UNMARKED, 'page')).toBe(PAGE)
    expect(markId(UNMARKED, 'task')).toBe(TASK)
    expect(markId(UNMARKED, 'event')).toBe(EVENT)
    expect(markId(UNMARKED, 'page').slice(0, 10)).toBe(UNMARKED.slice(0, 10))
  })

  it('reads the kind back off a marked id', () => {
    expect(kindOf(PAGE)).toBe('page')
    expect(kindOf(TASK)).toBe('task')
    expect(kindOf(EVENT)).toBe('event')
  })

  it('is null for an id carrying no mark — a hand-authored value or a non-content id', () => {
    expect(kindOf(UNMARKED)).toBeNull()
    expect(kindOf('research-bizops')).toBeNull()
    expect(kindOf('')).toBeNull()
  })
})

describe('contentId', () => {
  it('reads the id under the one key, whatever kind it marks', () => {
    expect(contentId({ [ID_KEY]: PAGE })).toBe(PAGE)
    expect(contentId({ [ID_KEY]: TASK })).toBe(TASK)
    expect(contentId({ [ID_KEY]: EVENT })).toBe(EVENT)
  })

  it('is undefined when the key is absent — the adoptable case, not an error', () => {
    expect(contentId({})).toBeUndefined()
    expect(contentId({ icon: 'star' })).toBeUndefined()
  })

  it('is undefined for a non-string or empty value — YAML admits numbers, maps and lists', () => {
    expect(contentId({ [ID_KEY]: 3 })).toBeUndefined()
    expect(contentId({ [ID_KEY]: null })).toBeUndefined()
    expect(contentId({ [ID_KEY]: { nested: true } })).toBeUndefined()
    expect(contentId({ [ID_KEY]: ['a'] })).toBeUndefined()
    expect(contentId({ [ID_KEY]: '' })).toBeUndefined()
  })

  it('returns a hand-authored id verbatim — it does not police shape', () => {
    expect(contentId({ [ID_KEY]: 'research-bizops' })).toBe('research-bizops')
  })
})

describe('admitContentFile', () => {
  it('admits an id whose mark matches the folder-declared kind', () => {
    expect(admitContentFile({ [ID_KEY]: PAGE }, 'page')).toEqual({ state: 'member', id: PAGE })
    expect(admitContentFile({ [ID_KEY]: TASK }, 'task')).toEqual({ state: 'member', id: TASK })
  })

  it('reports a missing key as adoptable, never as a violation', () => {
    expect(admitContentFile({}, 'page')).toEqual({ state: 'missing' })
    expect(admitContentFile({ icon: 'star', '<Areas>': ['Work'] }, 'task')).toEqual({
      state: 'missing',
    })
  })

  it('rejects a mark contradicting the folder as unknown, not missing', () => {
    expect(admitContentFile({ [ID_KEY]: TASK }, 'page')).toEqual({
      state: 'unknown',
      reason: 'contradicting',
    })
    expect(admitContentFile({ [ID_KEY]: PAGE }, 'event')).toEqual({
      state: 'unknown',
      reason: 'contradicting',
    })
  })

  it('rejects an unmarked ULID — a kind it cannot read is not a kind it may assume', () => {
    expect(admitContentFile({ [ID_KEY]: UNMARKED }, 'page')).toEqual({
      state: 'unknown',
      reason: 'contradicting',
    })
  })

  it('treats an emptied key as missing, not malformed — the file stays adoptable', () => {
    for (const empty of [null, '', undefined]) {
      expect(admitContentFile({ [ID_KEY]: empty }, 'page')).toEqual({ state: 'missing' })
    }
  })

  it('rejects a value that cannot be an identity — hand-authored keys are a supported input', () => {
    for (const bad of ['hello world', 'research-bizops', 3, { a: 1 }, ['x']]) {
      expect(admitContentFile({ [ID_KEY]: bad }, 'page')).toEqual({
        state: 'unknown',
        reason: 'malformed',
      })
    }
  })

  it('treats the key as exact — a case variant is not the key', () => {
    expect(admitContentFile({ id: PAGE }, 'page')).toEqual({ state: 'missing' })
    expect(admitContentFile({ Id: PAGE }, 'page')).toEqual({ state: 'missing' })
    expect(admitContentFile({ PageID: PAGE }, 'page')).toEqual({ state: 'missing' })
  })

  it('ignores an unrelated ULID-shaped value under a foreign key', () => {
    expect(admitContentFile({ someOtherId: PAGE }, 'page')).toEqual({ state: 'missing' })
  })
})
