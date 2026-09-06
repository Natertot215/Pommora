import { describe, expect, it } from 'vitest'
import { FILE_TYPE_EXTS, FILE_TYPE_FALLBACK, fileTypeGlyphs, fileTypeIcon } from './fileTypes'
import { icons } from './index'

describe('fileTypeGlyphs', () => {
  it('registers a glyph for every extension on the roster', () => {
    expect(Object.keys(fileTypeGlyphs)).toHaveLength(FILE_TYPE_EXTS.length)
    for (const ext of FILE_TYPE_EXTS) {
      expect(fileTypeGlyphs[`file-type-${ext}`]).toBeTypeOf('object')
      expect(`file-type-${ext}` in icons).toBe(true)
    }
  })

  it('the fallback is a curated glyph, so an unmapped extension always renders', () => {
    expect(FILE_TYPE_FALLBACK in icons).toBe(true)
  })
})

describe('fileTypeIcon', () => {
  it('reads the extension off the name', () => {
    expect(fileTypeIcon('Report.pdf')).toBe('file-type-pdf')
    expect(fileTypeIcon('Component.tsx')).toBe('file-type-tsx')
    expect(fileTypeIcon('Component.ts')).toBe('file-type-ts')
  })

  it('matches case-insensitively', () => {
    expect(fileTypeIcon('SCAN.PDF')).toBe('file-type-pdf')
  })

  it('routes the common alternate spellings to the glyph they mean', () => {
    expect(fileTypeIcon('holiday.jpeg')).toBe('file-type-jpg')
    expect(fileTypeIcon('page.htm')).toBe('file-type-html')
    expect(fileTypeIcon('budget.xlsx')).toBe('file-type-xls')
    expect(fileTypeIcon('deck.pptx')).toBe('file-type-ppt')
    expect(fileTypeIcon('build.mjs')).toBe('file-type-js')
    expect(fileTypeIcon('build.cjs')).toBe('file-type-js')
  })

  it('an extension Tabler does not draw still names a file, so it takes the fallback', () => {
    expect(fileTypeIcon('notes.md')).toBe(FILE_TYPE_FALLBACK)
    expect(fileTypeIcon('clip.mp4')).toBe(FILE_TYPE_FALLBACK)
  })

  it('a name with no extension to read takes the fallback too — there is always a glyph', () => {
    expect(fileTypeIcon('README')).toBe(FILE_TYPE_FALLBACK)
    // A dotfile's whole name is its name, not an extension.
    expect(fileTypeIcon('.gitignore')).toBe(FILE_TYPE_FALLBACK)
    expect(fileTypeIcon('')).toBe(FILE_TYPE_FALLBACK)
    expect(fileTypeIcon('trailing.')).toBe(FILE_TYPE_FALLBACK)
  })
})
