import { describe, it, expect } from 'vitest'
import { parseConnectionText } from '@shared/connections'
import type { AssetMap } from '@shared/types'
import { assetUrl, resolveAssetUrl, resolveAssetValue } from './assetUrl'

const map: AssetMap = {
  files: {
    'banner.png': ['file-assets/Banner.png'],
    'img.png': ['file-assets/a/IMG.png', 'file-assets/b/IMG.png'],
  },
  version: 7,
}

describe('resolveAssetValue', () => {
  it('resolves a wikilink by filename', () => {
    expect(resolveAssetValue('[[Banner.png]]', map)).toEqual({
      kind: 'asset',
      rel: 'file-assets/Banner.png',
    })
    expect(resolveAssetValue('[[banner.PNG]]', map)).toEqual({
      kind: 'asset',
      rel: 'file-assets/Banner.png',
    })
  })

  it('resolves on the title half of an aliased wikilink', () => {
    expect(resolveAssetValue('[[Banner.png|the header]]', map)).toEqual({
      kind: 'asset',
      rel: 'file-assets/Banner.png',
    })
  })

  it('takes the first by sorted path where several answer to one name', () => {
    expect(resolveAssetValue('[[IMG.png]]', map)).toEqual({
      kind: 'asset',
      rel: 'file-assets/a/IMG.png',
    })
  })

  it('a wikilink naming nothing is unresolved, never a broken image', () => {
    expect(resolveAssetValue('[[Missing.png]]', map)).toEqual({ kind: 'unresolved' })
    expect(resolveAssetUrl('[[Missing.png]]', map)).toBeNull()
  })

  it('a web address passes through as its own address', () => {
    for (const url of [
      'https://example.com/a.png',
      'http://x.test/b.jpg',
      'data:image/png;base64,AA',
    ])
      expect(resolveAssetValue(url, map)).toEqual({ kind: 'external', url })
  })

  it('a raw nexus-relative path passes through as a path', () => {
    expect(resolveAssetValue('.nexus/assets/nx1/banner-a.jpg', map)).toEqual({
      kind: 'asset',
      rel: '.nexus/assets/nx1/banner-a.jpg',
    })
    // A bare filename is a path, not a website — the dotted-host reading would break every asset.
    expect(resolveAssetValue('Banner.png', map)).toEqual({ kind: 'asset', rel: 'Banner.png' })
  })

  it('an empty or absent value renders nothing', () => {
    expect(resolveAssetValue('', map)).toEqual({ kind: 'unresolved' })
    expect(resolveAssetValue('   ', map)).toEqual({ kind: 'unresolved' })
    expect(resolveAssetUrl(null, map)).toBeNull()
    expect(resolveAssetUrl(undefined, map)).toBeNull()
  })

  it('agrees with parseConnectionText about what a whole-string wikilink is', () => {
    // An asset value and a Link property value are read by the same grammar; a spelling one
    // accepts and the other rejects would be a silent divergence.
    for (const raw of ['[[Banner.png]]', '[[Banner.png|alias]]', '  [[Banner.png]]  '])
      expect(parseConnectionText(raw) !== null).toBe(resolveAssetValue(raw, map).kind === 'asset')
    for (const raw of ['[[Banner.png', 'Banner.png]]', 'https://x.test/a.png', ''])
      expect(parseConnectionText(raw)).toBeNull()
  })
})

describe('resolveAssetUrl', () => {
  it('carries the map version so a re-saved file is re-requested', () => {
    expect(resolveAssetUrl('[[Banner.png]]', map)).toBe(`${assetUrl('file-assets/Banner.png')}?v=7`)
  })
  it('leaves a web address unversioned — it is not ours to bust', () => {
    expect(resolveAssetUrl('https://example.com/a.png', map)).toBe('https://example.com/a.png')
  })
})
