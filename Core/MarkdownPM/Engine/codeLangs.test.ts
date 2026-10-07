// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { CODE_LANGS, codeFence } from './codeLangs'
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
    expect(codeFence('ts')).toEqual({ name: 'TypeScript', diff: false })
    expect(codeFence('tsx').name).toBe('TypeScript')
    expect(codeFence('TypeScript').name).toBe('TypeScript')
    expect(codeFence('bash').name).toBe('Shell')
  })
  it('reads the same however it was cased or spaced', () => {
    expect(codeFence('  PYTHON ').name).toBe('Python')
  })
  it('answers nothing for a word no language carries', () => {
    expect(codeFence('brainfuck')).toEqual({ name: null, diff: false })
    expect(codeFence('')).toEqual({ name: null, diff: false })
  })
  it('reads a diff joined to its language by any separator, on either side', () => {
    for (const word of [
      'diff-ts',
      'diff/ts',
      'diff|ts',
      'ts-diff',
      'ts/diff',
      'ts|diff',
      'patch-ts',
    ])
      expect(codeFence(word)).toEqual({ name: 'TypeScript', diff: true })
  })
  it('reads a bare diff, and a diff in a language no roster entry names, as a diff with no colors', () => {
    expect(codeFence('diff')).toEqual({ name: null, diff: true })
    expect(codeFence('PATCH')).toEqual({ name: null, diff: true })
    expect(codeFence('diff-foo')).toEqual({ name: null, diff: true })
  })
  it('reads no diff in a word that only begins with one', () => {
    expect(codeFence('diffts')).toEqual({ name: null, diff: false })
    expect(codeFence('diff-')).toEqual({ name: null, diff: false })
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
