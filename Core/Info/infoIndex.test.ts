import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO_ROOT } from '../Testing/engineGraph'
import { ENTRIES, parseInfoIndex } from './infoIndex'

const CORE = join(REPO_ROOT, 'Core')
const CITATION = /\binfoFor\(\s*(['"])([^'"]*)\1/g

describe('the InfoIndex format', () => {
  it('reads each tagged entry, trimmed', () => {
    expect(parseInfoIndex('<a-b>\n\nOne **two**.\n\n</a-b>\n')).toEqual(
      new Map([['a-b', 'One **two**.']]),
    )
  })
  it('leaves headings, frontmatter, and text between entries to the file', () => {
    const text = '---\ndescription: x\n---\n### Group\n\n<a>\nBody\n</a>\n\nLoose.\n'
    expect(parseInfoIndex(text)).toEqual(new Map([['a', 'Body']]))
  })
  it('reads a Windows checkout and the trailing spaces an editor leaves on a tag line', () => {
    expect(parseInfoIndex('<a>\r\nBody\r\n</a>\r\n')).toEqual(new Map([['a', 'Body']]))
    expect(parseInfoIndex('<a> \nBody\n</a>\t\n')).toEqual(new Map([['a', 'Body']]))
  })
  it('reads nothing from a mismatched tag, an ID outside kebab case, or an empty file', () => {
    expect(parseInfoIndex('<a>\nBody\n</b>\n').size).toBe(0)
    expect(parseInfoIndex('<Date_Format>\nBody\n</Date_Format>\n').size).toBe(0)
    expect(parseInfoIndex('').size).toBe(0)
  })
})

describe('citations', () => {
  it('cite an entry with wording by a literal ID', () => {
    for (const rel of readdirSync(CORE, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(rel) || /\.test\.tsx?$/.test(rel) || rel.startsWith('node_modules'))
        continue
      const text = readFileSync(join(CORE, rel), 'utf8')
      const ids = [...text.matchAll(CITATION)].map((m) => m[2])
      expect(ids.length, `${rel}: every infoFor call names a literal ID`).toBe(
        text.match(/\binfoFor\(/g)?.length ?? 0,
      )
      for (const id of ids) expect(ENTRIES.get(id), `${rel}: ${id}`).toBeTruthy()
    }
  })
})
