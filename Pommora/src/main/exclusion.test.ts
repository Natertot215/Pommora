import { describe, it, expect } from 'vitest'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import {
  assetMatcher,
  excludedMatcher,
  sameScope,
  shouldSkipDir,
  type WatchScope,
} from './exclusion'

const scope = (excluded: string[] = [], assetDir = ASSETS_DIR_REL): WatchScope => ({
  excluded,
  assetDir,
})

describe('shouldSkipDir', () => {
  it('skips convention dirs', () => {
    expect(shouldSkipDir('.git', '.git', scope())).toBe(true)
    expect(shouldSkipDir('.nexus', '.nexus', scope())).toBe(true)
    expect(shouldSkipDir('_internal', '_internal', scope())).toBe(true)
    expect(shouldSkipDir('node_modules', 'node_modules', scope())).toBe(true)
  })

  it('keeps normal dirs', () => {
    expect(shouldSkipDir('Vault A', 'Vault A', scope())).toBe(false)
  })

  it('applies user excludes by segment-prefix, NFC + case-insensitive', () => {
    expect(shouldSkipDir('Archive', 'Archive', scope(['archive']))).toBe(true)
    expect(shouldSkipDir('Sub', 'Vault A/Sub', scope(['Vault A']))).toBe(true)
    expect(shouldSkipDir('Other', 'Other', scope(['Vault A']))).toBe(false)
    expect(shouldSkipDir('Vault A', 'Vault A', scope(['Vault A/Sub']))).toBe(false)
  })

  it('skips the asset root and everything under it', () => {
    expect(shouldSkipDir('file-assets', 'file-assets', scope([], 'file-assets'))).toBe(true)
    expect(shouldSkipDir('Sub', 'file-assets/Sub', scope([], 'file-assets'))).toBe(true)
    // The negative half: the same folder under a different asset root stays visible.
    expect(shouldSkipDir('file-assets', 'file-assets', scope([], 'Media'))).toBe(false)
  })
})

describe('assetMatcher', () => {
  it('matches the root and its descendants, whole-segment and normalized', () => {
    const m = assetMatcher('Media/Attachments')
    expect(m(['Media', 'Attachments'])).toBe(true)
    expect(m(['media', 'attachments', 'deep', 'x.png'])).toBe(true)
    expect(m(['Media'])).toBe(false)
    expect(m(['Media', 'Other'])).toBe(false)
  })

  it('does not match a sibling whose name merely extends the root', () => {
    const m = assetMatcher('file-assets')
    expect(m(['file-assets-old', 'x.png'])).toBe(false)
    expect(m(['file-assets', 'x.png'])).toBe(true)
  })

  it('an empty root matches nothing rather than everything', () => {
    const m = assetMatcher('')
    expect(m(['anything'])).toBe(false)
    expect(m([])).toBe(false)
  })

  it('compiles one root once — the per-entry and per-event callers reuse it', () => {
    expect(assetMatcher('file-assets')).toBe(assetMatcher('file-assets'))
    expect(assetMatcher('Media')).not.toBe(assetMatcher('file-assets'))
  })
})

describe('excludedMatcher', () => {
  it('compiles a list once — the per-entry and per-event callers reuse it', () => {
    const list = ['Archive']
    expect(excludedMatcher(list)).toBe(excludedMatcher(list))
    // A settings edit hands over a new list, which compiles fresh.
    expect(excludedMatcher(['Archive'])).not.toBe(excludedMatcher(list))
  })
})

describe('sameScope', () => {
  it('compares both halves as a unit', () => {
    expect(sameScope(scope(['A'], 'Media'), scope(['A'], 'Media'))).toBe(true)
    expect(sameScope(scope(['A'], 'Media'), scope(['B'], 'Media'))).toBe(false)
    expect(sameScope(scope(['A'], 'Media'), scope(['A'], 'Other'))).toBe(false)
    expect(sameScope(scope([], 'Media'), scope(['A'], 'Media'))).toBe(false)
  })
})
