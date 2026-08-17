import { describe, it, expect } from 'vitest'
import { admitContentFile, contentId, KIND_ID_KEY, PAGE_ID_KEY } from './identity'

const ULID = '01KVGMT8BFG350FZZXAMG1QDRC'

describe('contentId', () => {
  it('reads the id under any kind key — the caller already knows the kind', () => {
    expect(contentId({ [KIND_ID_KEY.page]: ULID })).toBe(ULID)
    expect(contentId({ [KIND_ID_KEY.task]: ULID })).toBe(ULID)
    expect(contentId({ [KIND_ID_KEY.event]: ULID })).toBe(ULID)
  })

  it('is undefined when no kind key is present — the adoptable case, not an error', () => {
    expect(contentId({})).toBeUndefined()
    expect(contentId({ icon: 'star' })).toBeUndefined()
  })

  it('is undefined when a file carries two kind keys — no arm guesses which', () => {
    expect(contentId({ [KIND_ID_KEY.page]: ULID, [KIND_ID_KEY.task]: ULID })).toBeUndefined()
  })

  it('is undefined for a non-string or empty value — YAML admits numbers, maps and lists', () => {
    expect(contentId({ [PAGE_ID_KEY]: 3 })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: null })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: { nested: true } })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: ['a'] })).toBeUndefined()
    expect(contentId({ [PAGE_ID_KEY]: '' })).toBeUndefined()
  })

  // Deliberately lenient: shape is the admission predicate's job. Keeping this loose is what lets
  // the asset-key guard stay the thing that decides whether an id may name a folder.
  it('returns a hand-authored id verbatim — it does not police shape', () => {
    expect(contentId({ [PAGE_ID_KEY]: 'research-bizops' })).toBe('research-bizops')
  })
})

describe('admitContentFile', () => {
  it('admits a well-formed key matching the folder-declared kind', () => {
    expect(admitContentFile({ [KIND_ID_KEY.page]: ULID }, 'page')).toEqual({
      state: 'member',
      id: ULID,
    })
    expect(admitContentFile({ [KIND_ID_KEY.task]: ULID }, 'task')).toEqual({
      state: 'member',
      id: ULID,
    })
  })

  it('reports a missing key as adoptable, never as a violation', () => {
    expect(admitContentFile({}, 'page')).toEqual({ state: 'missing' })
    expect(admitContentFile({ icon: 'star', '(Areas)': ['Work'] }, 'task')).toEqual({
      state: 'missing',
    })
  })

  // The whole reason the predicate reads all three keys: a TaskID in a Collection must read
  // INVISIBLE, not adoptable. Treating it as missing would stamp a second key onto it.
  it('rejects a key contradicting the folder as unknown, not missing', () => {
    expect(admitContentFile({ [KIND_ID_KEY.task]: ULID }, 'page')).toEqual({
      state: 'unknown',
      reason: 'contradicting',
    })
    expect(admitContentFile({ [KIND_ID_KEY.page]: ULID }, 'event')).toEqual({
      state: 'unknown',
      reason: 'contradicting',
    })
  })

  // An emptied key is an ABSENT key: clearing a property in an outside editor writes `PageID:`
  // with nothing after it, and everywhere else in Pommora an emptied value deletes its key.
  it('treats an emptied key as missing, not malformed — the file stays adoptable', () => {
    for (const empty of [null, '', undefined]) {
      expect(admitContentFile({ [KIND_ID_KEY.page]: empty }, 'page')).toEqual({ state: 'missing' })
    }
    // And an emptied key alongside a real one is not "dual" — there is only one key.
    expect(
      admitContentFile({ [KIND_ID_KEY.page]: ULID, [KIND_ID_KEY.task]: null }, 'page'),
    ).toEqual({ state: 'member', id: ULID })
  })

  it('rejects a value that cannot be an identity — hand-authored keys are a supported input', () => {
    for (const bad of ['hello world', 'research-bizops', 3, { a: 1 }, ['x']]) {
      expect(admitContentFile({ [KIND_ID_KEY.page]: bad }, 'page')).toEqual({
        state: 'unknown',
        reason: 'malformed',
      })
    }
  })

  it('rejects two kind keys outright, ahead of any shape or agreement check', () => {
    expect(
      admitContentFile({ [KIND_ID_KEY.page]: ULID, [KIND_ID_KEY.task]: ULID }, 'page'),
    ).toEqual({ state: 'unknown', reason: 'dual' })
    // Dual wins even when one of the two is itself garbage — the file is ambiguous either way.
    expect(
      admitContentFile({ [KIND_ID_KEY.page]: ULID, [KIND_ID_KEY.event]: 'junk' }, 'page'),
    ).toEqual({ state: 'unknown', reason: 'dual' })
  })

  it('treats the keys as exact — a case variant is not the key', () => {
    expect(admitContentFile({ pageid: ULID }, 'page')).toEqual({ state: 'missing' })
    expect(admitContentFile({ PAGEID: ULID }, 'page')).toEqual({ state: 'missing' })
  })

  // No synonym read: a legacy `id:` page is adoptable, exactly like a page that never had one.
  it('does not recognize the legacy bare key', () => {
    expect(admitContentFile({ id: ULID }, 'page')).toEqual({ state: 'missing' })
  })

  it('ignores an unrelated ULID-shaped value under a foreign key', () => {
    expect(admitContentFile({ someOtherId: ULID }, 'page')).toEqual({ state: 'missing' })
  })
})
