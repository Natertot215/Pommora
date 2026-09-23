import { describe, expect, it } from 'vitest'
import { forgetAlias, rememberAlias } from './aliasMemory'

describe('the aliases a page has been given', () => {
  it('remembers the trimmed words', () => {
    expect(rememberAlias([], '  the notes  ')).toEqual(['the notes'])
  })

  it('a blank alias changes nothing', () => {
    expect(rememberAlias(['the notes'], '   ')).toBeNull()
  })

  it('the most recently given comes first', () => {
    expect(rememberAlias(['the notes'], 'my draft')).toEqual(['my draft', 'the notes'])
  })

  it('re-giving an alias promotes it rather than storing it twice', () => {
    expect(rememberAlias(['my draft', 'the notes'], 'the notes')).toEqual(['the notes', 'my draft'])
  })

  it('an alias already first changes nothing', () => {
    expect(rememberAlias(['the notes', 'my draft'], 'the notes')).toBeNull()
  })

  it('forgets only an alias the page holds', () => {
    expect(forgetAlias(['my draft', 'the notes'], 'the notes')).toEqual(['my draft'])
    expect(forgetAlias(['my draft'], 'never given')).toBeNull()
  })
})
