import { describe, it, expect } from 'vitest'
import { ASSETS_DIR_REL, thumbsRel } from './nexusPaths'
import {
  assetMatcher,
  excludedMatcher,
  manifestAdmits,
  neverWatched,
  outsideContent,
  sameScope,
  type WatchScope,
} from './exclusion'

const scope = (excluded: string[] = [], assetDir = ASSETS_DIR_REL): WatchScope => ({
  excluded,
  assetDir,
})

describe('outsideContent', () => {
  it('refuses hidden and package folders at any depth, and hidden names', () => {
    expect(outsideContent('.git', scope())).toBe('hidden')
    expect(outsideContent('.nexus', scope())).toBe('hidden')
    expect(outsideContent('_internal', scope())).toBe('hidden')
    expect(outsideContent('node_modules', scope())).toBe('hidden')
    expect(outsideContent('.obsidian/plugins/x/README.md', scope())).toBe('hidden')
    expect(outsideContent('Notes/_Drafts/Idea.md', scope())).toBe('hidden')
    expect(outsideContent('Notes/_Idea.md', scope())).toBe('hidden')
  })

  it('keeps normal paths', () => {
    expect(outsideContent('Vault A', scope())).toBeNull()
    expect(outsideContent('Vault A/Sub/Page.md', scope())).toBeNull()
    expect(outsideContent('Root Page.md', scope())).toBeNull()
  })

  it('applies user excludes by segment-prefix, NFC + case-insensitive', () => {
    expect(outsideContent('Archive', scope(['archive']))).toBe('excluded')
    expect(outsideContent('Vault A/Sub', scope(['Vault A']))).toBe('excluded')
    expect(outsideContent('Other', scope(['Vault A']))).toBeNull()
    expect(outsideContent('Vault A', scope(['Vault A/Sub']))).toBeNull()
  })

  it('skips the asset root and everything under it', () => {
    expect(outsideContent('file-assets', scope([], 'file-assets'))).toBe('asset')
    expect(outsideContent('file-assets/Sub', scope([], 'file-assets'))).toBe('asset')
    expect(outsideContent('file-assets', scope([], 'Media'))).toBeNull()
  })
})

describe('neverWatched', () => {
  it('holds every folder on the way to the hidden-folder rule', () => {
    expect(neverWatched(['Notes', '_Drafts', 'Idea.md'])).toBe(true)
    expect(neverWatched(['.git', 'HEAD'])).toBe(true)
    expect(neverWatched(['node_modules'])).toBe(true)
  })

  it('holds the leaf only to the dot, so sidecars and a hidden folder itself pass', () => {
    expect(neverWatched(['Notes', '_pagecollection.json'])).toBe(false)
    expect(neverWatched(['Notes', '_Drafts'])).toBe(false)
    expect(neverWatched(['Notes', '.DS_Store'])).toBe(true)
  })

  it('watches .nexus', () => {
    expect(neverWatched(['.nexus', 'contexts', 'Areas', 'Home', '_space.json'])).toBe(false)
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

describe('manifestAdmits', () => {
  const nexusId = 'NX1'
  const admits = manifestAdmits(scope())

  it('admits the trash, the config set, and a tile body', () => {
    expect(admits('.trash/Notes/2026__A.md.deleted/_record.json')).toBe(true)
    expect(admits('.trash/Notes/2026__A.md.deleted')).toBe(true)
    expect(admits('.nexus/assets/crops.json')).toBe(true)
    expect(admits('.nexus/settings.json')).toBe(true)
    expect(admits('.nexus/homepage/t1.md')).toBe(true)
  })

  it('refuses thumbnails, journals, databases, and foreign dot-entries', () => {
    expect(admits(thumbsRel(nexusId))).toBe(false)
    expect(admits(`${thumbsRel(nexusId)}/a.jpg`)).toBe(false)
    expect(admits('.nexus/property-cascade.json')).toBe(false)
    expect(admits('.nexus/context-rename.json')).toBe(false)
    expect(admits('.nexus/nexus.db-wal')).toBe(false)
    expect(admits('.obsidian/x')).toBe(false)
  })

  it('refuses an atomic-write temp while its target is a sibling', () => {
    expect(admits('Notes/Page.md.123', new Set(['Page.md']))).toBe(false)
    expect(admits('Notes/Page.md.123', new Set())).toBe(true)
  })

  it('refuses inside the trash what it refuses outside it', () => {
    const bundle = '.trash/Notes/2026__A.md.deleted'
    expect(admits(`${bundle}/_record.json.123`, new Set(['_record.json']))).toBe(false)
    expect(admits(`${bundle}/.DS_Store`)).toBe(false)
    expect(admits(`${bundle}/nexus.db-wal`)).toBe(false)
  })

  it('refuses an excluded folder and admits the asset root', () => {
    const withExcluded = manifestAdmits(scope(['Archive']))
    expect(withExcluded('Archive')).toBe(false)
    expect(withExcluded('Archive/x.md')).toBe(false)
    expect(withExcluded('.trash/Archive/2026__x.md.deleted/x.md')).toBe(false)
    expect(withExcluded('.trash/Notes/2026__x.md.deleted/x.md')).toBe(true)
    expect(withExcluded('Notes/x.md')).toBe(true)
    expect(admits(ASSETS_DIR_REL)).toBe(true)
  })

  it('refuses a thumbnail cache under any nexus id', () => {
    expect(admits(`${ASSETS_DIR_REL}/OTHER-ID/thumbnails/a.jpg`)).toBe(false)
  })
})
