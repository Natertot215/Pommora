import { describe, it, expect } from 'vitest'
import { sanitizeExclusions } from './exclusionInput'
import { shouldSkipDir, type WatchScope } from './exclusion'

const value = (folders: unknown): string[] => {
  const r = sanitizeExclusions(folders)
  if (!r.ok) throw new Error(`expected ok, got ${r.error.message}`)
  return r.value
}

describe('sanitizeExclusions', () => {
  it('keeps a valid list, normalizing a trailing slash off', () => {
    expect(value(['Archive/', 'Vault A'])).toEqual(['Archive', 'Vault A'])
  })
  it('collapses case-folded duplicates, keeping the first spelling', () => {
    expect(value(['Archive', 'archive', 'ARCHIVE/'])).toEqual(['Archive'])
  })
  it('an empty list is a valid empty result, not a refusal', () => {
    expect(value([])).toEqual([])
  })
  it('refuses on the first bad entry without storing a partial list', () => {
    const r = sanitizeExclusions(['Archive', '/bad', 'Vault A'])
    expect(r.ok).toBe(false)
  })
  it('refuses a non-array and a non-string element', () => {
    expect(sanitizeExclusions('nope').ok).toBe(false)
    expect(sanitizeExclusions(['Archive', 42]).ok).toBe(false)
  })
})

describe('sanitizeExclusions crosses the matcher', () => {
  it('a folder it stores is the folder shouldSkipDir prunes under the same scope', () => {
    const scope: WatchScope = { excluded: value(['Archive/']), assetDir: '' }
    expect(shouldSkipDir('Archive', 'Archive', scope)).toBe(true)
    expect(shouldSkipDir('Keep', 'Keep', scope)).toBe(false)
  })
})
