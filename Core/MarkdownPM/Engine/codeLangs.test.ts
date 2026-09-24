// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { CODE_LANGS, codeLanguageName } from './codeLangs'
import { codeHighlight, codeLanguages } from '../codeHighlight'
import { CODE_TAGS } from '../codeGlyphs'

describe('the code-language roster', () => {
  it('keys every tag to a language that exists', () => {
    const names: string[] = CODE_LANGS.map((l) => l.name)
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

describe('a code block’s colors', () => {
  const painted = async (doc: string): Promise<string[]> => {
    const view = new EditorView({
      state: EditorState.create({ doc, extensions: [codeHighlight] }),
      parent: document.body,
    })
    await codeLanguages.find((l) => l.name === 'JavaScript')?.load()
    await new Promise((r) => setTimeout(r, 0))
    const words = [...view.contentDOM.querySelectorAll('.syntax-keyword')].map(
      (e) => e.textContent ?? '',
    )
    view.destroy()
    return words
  }

  it('come from the language its fence names', async () => {
    expect(await painted('```js\nconst a = 1\n```')).toEqual(['const'])
  })

  it('stay off prose the fences don’t hold', async () => {
    expect(await painted('const a = 1\n\n```js\nlet b\n```')).toEqual(['let'])
    expect(await painted('```js\nconst a = 1')).toEqual([])
  })
})
