import { describe, it, expect } from 'vitest'
import { CODE_LANGS, codeLanguageName } from './codeLangs'
import { CODE_LOADER_NAMES } from '../codeHighlight'
import { CODE_TAGS } from '../codeGlyphs'

describe('the code-language roster', () => {
  it('pairs every language with a loader', () => {
    const missing = CODE_LANGS.map((l) => l.name).filter((n) => !CODE_LOADER_NAMES.includes(n))
    expect(missing).toEqual([])
  })
  it('keys every tag to a language that exists', () => {
    const names = CODE_LANGS.map((l) => l.name)
    expect(Object.keys(CODE_TAGS).filter((n) => !names.includes(n))).toEqual([])
  })
  it('labels the tags that override their name', () => {
    expect(CODE_TAGS.Shell?.label).toBe('Command')
    expect(CODE_TAGS['C#']?.label).toBeNull()
    expect(CODE_TAGS.SQL?.label).toBeNull()
    expect(CODE_TAGS.TOML?.label).toBeNull()
    expect(CODE_TAGS.Python?.label).toBeUndefined()
  })

  // A word two languages both claim resolves to whichever sits earlier, so the other becomes a language the roster offers and no fence can reach.
  it('lets no word name two languages', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const l of CODE_LANGS)
      for (const word of [l.name.toLowerCase(), ...l.alias]) {
        const held = owner.get(word)
        if (held !== undefined && held !== l.name) clashes.push(`${word}: ${held} vs ${l.name}`)
        owner.set(word, l.name)
      }
    expect(clashes).toEqual([])
  })
})

describe('a fence word', () => {
  it('resolves to the language it names, whichever spelling it used', () => {
    expect(codeLanguageName('ts')).toBe('TypeScript')
    expect(codeLanguageName('tsx')).toBe('TypeScript')
    expect(codeLanguageName('TypeScript')).toBe('TypeScript')
    expect(codeLanguageName('bash')).toBe('Shell')
  })
  it('reads the same however it was cased or spaced', () => {
    expect(codeLanguageName('  PYTHON ')).toBe('Python')
  })
  it('answers nothing for a word no language carries', () => {
    expect(codeLanguageName('brainfuck')).toBeNull()
    expect(codeLanguageName('')).toBeNull()
  })
})
