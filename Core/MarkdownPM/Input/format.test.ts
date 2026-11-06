import { describe, it, expect } from 'vitest'
import {
  editFor,
  toggleInline,
  setHeading,
  setList,
  listKindOf,
  setBlock,
  type FormatEdit,
} from './format'
import { EditorState } from '@codemirror/state'
import { editEvent, landEdit, listRenumber } from './listRenumber'
import { type DocScan, scanDoc } from '../Engine/docScan'
import type { Paint, PaintColor } from '../Engine/paints'

const apply = (doc: string, edit: FormatEdit | null): string => {
  if (!edit) throw new Error('no edit')
  return landEdit(doc, edit.changes, editEvent(edit), 'page')
}
const listed = (
  doc: string,
  kind: Parameters<typeof setList>[3],
  from = 0,
  to = doc.length,
  settings = {},
): string => apply(doc, setList(scanDoc(doc), from, to, kind, settings))
const picked = (
  doc: string,
  from: number,
  to: number,
  ...picks: ((scan: DocScan, from: number, to: number) => FormatEdit)[]
): string => {
  let state = EditorState.create({
    doc,
    selection: { anchor: from, head: to },
    extensions: listRenumber,
  })
  for (const pick of picks) {
    const { from: f, to: t } = state.selection.main
    const e = pick(scanDoc(state.doc.toString()), f, t)
    const selection = e.selection === undefined ? undefined : { anchor: e.selection }
    state = state.update({ changes: e.changes, selection, userEvent: editEvent(e) }).state
  }
  return state.doc.toString()
}

describe('toggleInline', () => {
  it('wraps a selection', () => {
    expect(apply('hello', toggleInline(scanDoc('hello'), 0, 5, 'bold'))).toBe('**hello**')
  })
  it('unwraps when the selection already sits inside the mark', () => {
    const doc = 'a **bold** b'
    expect(apply(doc, toggleInline(scanDoc(doc), 5, 5, 'bold'))).toBe('a bold b')
  })
  it('unwraps a selection that includes the revealed markers', () => {
    expect(apply('a **bold** b', toggleInline(scanDoc('a **bold** b'), 2, 10, 'bold'))).toBe(
      'a bold b',
    )
    expect(apply('a *it* b', toggleInline(scanDoc('a *it* b'), 2, 6, 'italic'))).toBe('a it b')
  })
  it('bold and italic replace each other instead of nesting', () => {
    expect(apply('a **bold** b', toggleInline(scanDoc('a **bold** b'), 4, 8, 'italic'))).toBe(
      'a *bold* b',
    )
    expect(apply('a **bold** b', toggleInline(scanDoc('a **bold** b'), 2, 10, 'italic'))).toBe(
      'a *bold* b',
    )
    expect(apply('a **bold** b', toggleInline(scanDoc('a **bold** b'), 5, 5, 'italic'))).toBe(
      'a *bold* b',
    )
    expect(apply('a *it* b', toggleInline(scanDoc('a *it* b'), 3, 5, 'bold'))).toBe('a **it** b')
    expect(apply('a __b__ c', toggleInline(scanDoc('a __b__ c'), 4, 5, 'italic'))).toBe('a *b* c')
  })
  it('a partial selection inside the other mark nests instead of swapping the whole span', () => {
    const doc = 'a **one two** b'
    expect(apply(doc, toggleInline(scanDoc(doc), 4, 7, 'italic'))).toBe('a ***one* two** b')
  })
  it('bold-italic drops only the pressed mark, and other marks still nest', () => {
    expect(apply('a ***bi*** b', toggleInline(scanDoc('a ***bi*** b'), 2, 10, 'bold'))).toBe(
      'a *bi* b',
    )
    expect(apply('a ***bi*** b', toggleInline(scanDoc('a ***bi*** b'), 5, 7, 'italic'))).toBe(
      'a **bi** b',
    )
    expect(apply('a ~~s~~ b', toggleInline(scanDoc('a ~~s~~ b'), 4, 5, 'bold'))).toBe(
      'a ~~**s**~~ b',
    )
  })
  it('a leading or trailing space stays outside the wrap', () => {
    expect(apply('a bold b', toggleInline(scanDoc('a bold b'), 1, 7, 'bold'))).toBe('a **bold** b')
    expect(apply('a Page b', toggleInline(scanDoc('a Page b'), 2, 7, 'connection'))).toBe(
      'a [[Page]] b',
    )
  })
  it('link wraps with an empty url ready for typing', () => {
    expect(apply('site', toggleInline(scanDoc('site'), 0, 4, 'link'))).toBe('[site]()')
  })
  it('seats an empty link at its url, and an alias-first one at its text', () => {
    const url = toggleInline(scanDoc(''), 0, 0, 'link')
    expect(url?.changes.map((c) => c.insert).join('')).toBe('[]()')
    expect(url?.selection).toBe(3)
    const text = toggleInline(scanDoc(''), 0, 0, 'linkText')
    expect(text?.changes.map((c) => c.insert).join('')).toBe('[]()')
    expect(text?.selection).toBe(1)
  })
  it('connection wraps the selection in [[ ]], and unwraps from inside', () => {
    expect(apply('Page', toggleInline(scanDoc('Page'), 0, 4, 'connection'))).toBe('[[Page]]')
    expect(toggleInline(scanDoc('Page'), 0, 4, 'connection')?.selection).toBe(6)
    expect(toggleInline(scanDoc(''), 0, 0, 'connection')?.selection).toBe(2)
    const doc = 'a [[Page]] b'
    expect(apply(doc, toggleInline(scanDoc(doc), 5, 5, 'connection'))).toBe('a Page b')
  })
  // Unwrapping leaves the words that were in the sentence; for an aliased link those are the alias, not the title — removing a link shouldn't rewrite the prose to a name the reader never saw.
  it('unwrapping an aliased connection leaves the alias behind, not the title', () => {
    const doc = 'a [[Q3 Plan|the plan]] b'
    expect(apply(doc, toggleInline(scanDoc(doc), 14, 14, 'connection'))).toBe('a the plan b')
    const path = 'a [[A/B/Notes]] b'
    expect(apply(path, toggleInline(scanDoc(path), 10, 10, 'connection'))).toBe('a Notes b')
  })
  it('widens an edge inside a link to the whole link, so the mark wraps it', () => {
    const wrap = (doc: string, from: number, to: number, fmt: 'bold' | 'italic' | 'inlineCode') =>
      apply(doc, toggleInline(scanDoc(doc), from, to, fmt))
    expect(wrap('foo [[Bar]] baz', 6, 8, 'bold')).toBe('foo **[[Bar]]** baz')
    expect(wrap('foo [[Bar]] baz', 0, 7, 'bold')).toBe('**foo [[Bar]]** baz')
    expect(wrap('foo [[Bar]] baz', 7, 7, 'italic')).toBe('foo *[[Bar]]* baz')
    expect(wrap('[[Bar|Alias]]', 7, 9, 'bold')).toBe('**[[Bar|Alias]]**')
    expect(wrap('[label](https://x.com)', 16, 19, 'bold')).toBe('**[label](https://x.com)**')
    expect(wrap('[[A]] and [[B]]', 3, 13, 'bold')).toBe('**[[A]] and [[B]]**')
    expect(wrap('foo [[Bar]] baz', 6, 8, 'inlineCode')).toBe('foo `[[Bar]]` baz')
    expect(wrap('foo **[[Bar]]** baz', 9, 9, 'bold')).toBe('foo [[Bar]] baz')
  })
  it('paints a link whole from an edge inside it', () => {
    const doc = 'foo [[Bar]] baz'
    expect(apply(doc, toggleInline(scanDoc(doc), 6, 8, 'textColor', 'red'))).toBe(
      'foo =🔴[[Bar]]= baz',
    )
    expect(apply(doc, toggleInline(scanDoc(doc), 6, 8, 'highlight', 'accent'))).toBe(
      'foo ==[[Bar]]== baz',
    )
  })
  it('stands down inside inline code for every mark but Code', () => {
    const code = scanDoc('a `code` b')
    for (const action of ['format:bold', 'format:link', 'highlight:accent', 'textColor:red'])
      expect(editFor(action, code, 3, 7, {})).toBeNull()
    expect(apply('a `code` b', editFor('format:inlineCode', code, 3, 7, {}))).toBe('a code b')
    const into = scanDoc('plain `code` end')
    expect(editFor('format:bold', into, 0, 9, {})).toBeNull()
    expect(apply('plain `code` end', editFor('format:bold', into, 0, 5, {}))).toBe(
      '**plain** `code` end',
    )
  })
})

describe('setHeading', () => {
  it('sets a level', () => {
    expect(apply('hello', setHeading(scanDoc('hello'), 0, 5, 2))).toBe('## hello')
  })
  it('level 0 clears an existing heading', () => {
    expect(apply('## hello', setHeading(scanDoc('## hello'), 0, 8, 0))).toBe('hello')
  })
  it('replaces a list marker rather than stacking', () => {
    expect(apply('- item', setHeading(scanDoc('- item'), 0, 6, 1))).toBe('# item')
  })
  it('heads every selected line', () => {
    const three = 'one\ntwo\nthree'
    expect(apply(three, setHeading(scanDoc(three), 0, three.length, 2))).toBe(
      '## one\n## two\n## three',
    )
    expect(apply(three, setHeading(scanDoc(three), 0, 4, 2))).toBe('## one\ntwo\nthree')
    const heads = (level: 1 | 2) => (scan: DocScan, f: number, t: number) =>
      setHeading(scan, f, t, level)
    expect(picked('one\ntwo', 1, 5, heads(1), heads(2))).toBe('## one\n## two')
  })
  it('leaves a blank line unheaded', () => {
    const gapped = 'one\n\ntwo'
    expect(apply(gapped, setHeading(scanDoc(gapped), 0, gapped.length, 1))).toBe('# one\n\n# two')
  })
  it('heads a blank line the caret sits on', () => {
    const edit = setHeading(scanDoc(''), 0, 0, 2)
    expect(apply('', edit)).toBe('## ')
    expect(edit.selection).toBe(3)
    expect(apply('> one\n>\n> two', setHeading(scanDoc('> one\n>\n> two'), 7, 7, 2))).toBe(
      '> one\n> ## \n> two',
    )
  })
  it('returns every selected line to plain body at 0', () => {
    const heads = '# one\n## two'
    expect(apply(heads, setHeading(scanDoc(heads), 0, heads.length, 0))).toBe('one\ntwo')
  })
  it('writes before a callout head’s `- foo`, the text it shows', () => {
    const head = '> [!note] - foo'
    expect(apply(head, setHeading(scanDoc(head), 0, head.length, 2))).toBe('> [!note] ## - foo')
  })
})

describe('setList', () => {
  it('adds a bullet', () => {
    expect(listed('item', 'bullet', 0, 0)).toBe('- item')
  })
  it('seats a caret-only line’s marker at the margin, whatever whitespace it held', () => {
    expect(listed('   ', 'bullet', 1, 1)).toBe('- ')
  })
  it('re-applying the kind an item already has changes nothing', () => {
    expect(listed('- item', 'bullet', 2, 2)).toBe('- item')
  })
  it('switches ordered → task', () => {
    expect(listed('1. item', 'checkbox', 3, 3)).toBe('- [ ] item')
  })
  it('keeps an ordered item’s box text, which a bullet then reads as a box', () => {
    expect(listed('2. [x] foo', 'bullet', 4, 4)).toBe('- [x] foo')
  })
  it('leaves a plus as a bullet already, and a checklist pick keeps an empty box as text', () => {
    expect(listed('+ a', 'bullet', 2, 2)).toBe('+ a')
    expect(listed('- [] x', 'checkbox', 2, 2)).toBe('- [ ] [] x')
  })

  const three = 'one\ntwo\nthree'
  it('makes every selected line its own item, and none the selection ends at the start of', () => {
    expect(listed(three, 'bullet')).toBe('- one\n- two\n- three')
    expect(listed(three, 'bullet', 0, 4)).toBe('- one\ntwo\nthree')
    const lists = (kind: 'bullet' | 'ordered') => (scan: DocScan, f: number, t: number) =>
      setList(scan, f, t, kind, {})
    expect(picked('one\ntwo', 1, 5, lists('bullet'), lists('ordered'))).toBe('1. one\n2. two')
  })
  it('numbers an ordered run down the selection', () => {
    expect(listed(three, 'ordered')).toBe('1. one\n2. two\n3. three')
  })
  it('letters an alphabetical run down the selection', () => {
    expect(listed(three, 'alphabetical')).toBe('A. one\nB. two\nC. three')
  })
  it('leaves the items already of the kind and makes the plain lines items', () => {
    const all = '- one\n- two'
    expect(listed(all, 'bullet')).toBe(all)
    const mixed = '- one\ntwo'
    expect(listed(mixed, 'bullet')).toBe('- one\n- two')
    expect(setList(scanDoc(mixed), 0, mixed.length, 'bullet', {}).selection).toBeUndefined()
  })
  it('leaves a blank line unmarked', () => {
    const gapped = 'one\n\ntwo'
    expect(listed(gapped, 'bullet')).toBe('- one\n\n- two')
  })
  it('marks a blank line the caret sits on', () => {
    const edit = setList(scanDoc(''), 0, 0, 'bullet', {})
    expect(apply('', edit)).toBe('- ')
    expect(edit.selection).toBe(2)
    expect(listed('> ', 'ordered', 2, 2)).toBe('> 1. ')
    expect(listed('> one\n>\n> two', 'bullet', 7, 7)).toBe('> one\n> - \n> two')
    expect(listed('one\n  \ntwo', 'bullet', 5, 5)).toBe('one\n- \ntwo')
    expect(listed('- a\n\n  para', 'ordered', 4, 4)).toBe('- a\n1. \n  para')
    expect(listed('- a\n  \n  para', 'ordered', 5, 5)).toBe('- a\n1. \n  para')
  })
})

describe('a list-type pick from an item', () => {
  const example = '- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F'
  const pick = (item: string, preserveListLevels: boolean): string => {
    const at = example.indexOf(item)
    return listed(example, 'ordered', at, at, { preserveListLevels })
  }
  it('with Preserve List-Level Formatting on, reaches the group’s items of its type', () => {
    expect(pick('B', true)).toBe('- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F')
  })
  it('off, reaches the group and everything nested under it', () => {
    expect(pick('E', false)).toBe('- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F')
  })
})

describe('a list pick on an empty callout head nested in an item', () => {
  it('reads no list and changes nothing, since the head holds its own line', () => {
    const doc = '- a\n  > [!note]\n  > body\n- b'
    const head = doc.indexOf('[!note]')
    const scan = scanDoc(doc)
    expect(listKindOf(scan, head, head, {})).toBeNull()
    expect(setList(scan, head, head, 'ordered', {}).changes).toEqual([])
  })
})

describe('listKindOf', () => {
  const kindOf = (doc: string): ReturnType<typeof listKindOf> =>
    listKindOf(scanDoc(doc), 0, doc.length, {})

  it('reads the kind a whole block’s items agree on, through every level', () => {
    expect(kindOf('- a\n\t- b')).toBe('bullet')
    expect(kindOf('1. a\n2. b')).toBe('ordered')
    expect(kindOf('- [x] a\n- [ ] b')).toBe('checkbox')
    expect(kindOf('→ a\n→ b')).toBe('arrow')
    expect(kindOf('+ a\n- b')).toBe('bullet')
    expect(kindOf('- [] x')).toBe('bullet')
  })

  it('is null where the markers disagree, and where there are none', () => {
    expect(kindOf('- a\n1. b')).toBeNull()
    expect(kindOf('- a\nplain\n- b')).toBeNull()
    expect(kindOf('  para\n- a')).toBeNull()
    expect(kindOf('just prose')).toBeNull()
  })

  it('a continuation line is not a disagreement', () => {
    expect(kindOf('- a\n  wrapped\n- b')).toBe('bullet')
  })
})

describe('setList over a whole block', () => {
  it('rewrites every marker in the block', () => {
    expect(listed('- a\n- b', 'ordered')).toBe('1. a\n2. b')
    expect(listed('1. a\n2. b', 'checkbox')).toBe('- [ ] a\n- [ ] b')
    expect(listed('- [ ] a\n- [x] b', 'arrow')).toBe('→ a\n→ b')
    expect(listed('→ a\n→ b', 'bullet')).toBe('- a\n- b')
  })

  it('numbers per level, tab- or space-indented, so a nested run restarts and its parent keeps counting', () => {
    expect(listed('- a\n\t- x\n\t- y\n- b', 'ordered')).toBe('1. a\n\t1. x\n\t2. y\n2. b')
    expect(listed('- one\n  - two\n- three', 'ordered')).toBe('1. one\n  1. two\n2. three')
  })

  it('leaves wrapped continuation lines alone', () => {
    expect(listed('- a\n  wrapped body\n- b', 'ordered')).toBe('1. a\n  wrapped body\n2. b')
  })

  it('reads a code, math, or quote block and an indented line under an item as that item’s', () => {
    for (const fence of ['```', '$$']) {
      const doc = `1. Run this:\n   ${fence}\n   cmd\n\n   cmd2\n   ${fence}\n   Then check.\n2. Next`
      const bulleted = doc.replace('1. Run', '- Run').replace('2. Next', '- Next')
      const at = doc.indexOf('Then')
      expect(listed(doc, 'bullet', at, at)).toBe(bulleted)
      expect(listed(doc, 'bullet')).toBe(bulleted)
    }
    const quoted = '- a\n  > - b\n  cont of a\n- c'
    const at = quoted.indexOf('cont')
    expect(listed(quoted, 'ordered', at, at)).toBe('1. a\n  > - b\n  cont of a\n2. c')
    expect(listed(quoted, 'ordered')).toBe('1. a\n  > 1. b\n  cont of a\n2. c')
    const deeper = '- a\n  > - b\n  >   cont b\n  cont a\n- c'
    expect(listed(deeper, 'ordered', deeper.indexOf('cont b'), deeper.indexOf('\n- c'))).toBe(
      '1. a\n  > 1. b\n  >   cont b\n  cont a\n- c',
    )
    const apart = '- a\n\n- b\n\n  cont b\n\n- c'
    const paragraph = apart.indexOf('cont')
    expect(listed(apart, 'ordered', paragraph, paragraph)).toBe('- a\n\n- b\n\n  1. cont b\n\n- c')
    expect(listed(apart, 'ordered')).toBe('1. a\n\n1. b\n\n  1. cont b\n\n1. c')
  })

  it('finds a quoted marker behind its prefix rather than missing it', () => {
    expect(listed('> - a\n> - b', 'checkbox')).toBe('> - [ ] a\n> - [ ] b')
  })

  it('emits nothing when the markers already read as they should', () => {
    expect(setList(scanDoc('- a\n- b'), 0, 7, 'bullet', {}).changes).toEqual([])
  })

  it('leaves a run already of the type as it stands, and Bulleted then Numbered repairs it', () => {
    expect(listed('1. a\n1. b\n1. c', 'ordered')).toBe('1. a\n1. b\n1. c')
    expect(listed(listed('1. a\n1. b\n1. c', 'bullet'), 'ordered')).toBe('1. a\n2. b\n3. c')
  })
})

describe('the rows in a code block', () => {
  const row = (doc: string, action: string, from: number, to = from): string =>
    apply(doc, editFor(action, scanDoc(doc), from, to, {}))
  const word = '```js\nword\n```'
  const [wordFrom, wordTo] = [word.indexOf('word'), word.indexOf('word') + 4]

  it('Bold writes its marks around the selection', () => {
    expect(row(word, 'format:bold', wordFrom, wordTo)).toBe('```js\n**word**\n```')
  })
  it('Heading writes past the line’s own indent and strips nothing', () => {
    expect(row(word, 'heading:2', wordFrom)).toBe('```js\n## word\n```')
    expect(row('```js\n- foo\n```', 'heading:2', 6)).toBe('```js\n## - foo\n```')
    expect(row('```js\n    foo\n```', 'heading:2', 6)).toBe('```js\n    ## foo\n```')
  })
  it('a list pick counts nothing, and reaches no line past the ones it touches', () => {
    const doc = '```js\nfoo\nbar\n7. baz\n```'
    expect(row(doc, 'list:ordered', 6, 13)).toBe('```js\n1. foo\n1. bar\n7. baz\n```')
    expect(row('```js\n- a\n- b\n```', 'list:ordered', 8)).toBe('```js\n1. - a\n- b\n```')
  })
  it('a row picked twice writes again', () => {
    const lists = (scan: DocScan, f: number, t: number) => setList(scan, f, t, 'ordered', {})
    const heads = (scan: DocScan, f: number, t: number) => setHeading(scan, f, t, 2)
    const foo = '```js\n- foo\n```'
    expect(picked(foo, 8, 8, lists, lists)).toBe('```js\n1. 1. - foo\n```')
    expect(picked(foo, 8, 8, heads, heads)).toBe('```js\n## ## - foo\n```')
    const bold = '```js\n**word**\n```'
    expect(row(bold, 'format:bold', 6, 14)).toBe('```js\n****word****\n```')
  })
  it('refuses on a delimiter line', () => {
    const scan = scanDoc(word)
    for (const action of [
      'format:bold',
      'heading:2',
      'list:ordered',
      'block:quote',
      'block:callout',
    ])
      for (const at of [word.indexOf('js'), word.lastIndexOf('```')])
        expect(editFor(action, scan, at, at + 2, {})?.changes ?? []).toEqual([])
  })
  it('refuses a selection ending on a delimiter line', () => {
    const closed = 'prose\n```js\nx\n```\n'
    const opening = 'prose\n```js\nx\n```'
    const bold = (doc: string, to: number) => editFor('format:bold', scanDoc(doc), 0, to, {})
    expect(bold(closed, closed.length)).toBeNull()
    expect(bold(opening, opening.indexOf('js') + 2)).toBeNull()
  })
  it('Insert Link refuses on an opener', () => {
    const doc = '```notes.md\nx\n```'
    expect(editFor('link:insert', scanDoc(doc), 3, 11, {})).toBeNull()
  })
  it('a selection across a whole block still quotes it', () => {
    expect(row(word, 'block:quote', 0, word.length)).toBe('> ```js\n> word\n> ```')
  })
  it('a callout-shaped line in a quoted Markdown block is code, so a range pick takes it', () => {
    const doc = '> ```md\n> - a\n> [!note]\n> - b\n> ```'
    expect(row(doc, 'list:ordered', doc.indexOf('- a'), doc.indexOf('- b') + 3)).toBe(
      '> ```md\n> 1. a\n> 2. [!note]\n> 3. b\n> ```',
    )
  })
  it('a closer indented past its opener holds no list', () => {
    for (const indent of [' ', '  ', '   ']) {
      const doc = `\`\`\`md\n- a\n${indent}\`\`\``
      const scan = scanDoc(doc)
      expect(listKindOf(scan, doc.length, doc.length, {})).toBeNull()
      expect(setList(scan, doc.length, doc.length, 'ordered', {}).changes).toEqual([])
    }
  })
  it('a bare `>` line takes a space from a row, so the fence still reads', () => {
    const doc = '> ```js\n>\n> ```'
    for (const [action, lead] of [
      ['heading:2', '> ## '],
      ['list:bullet', '> - '],
    ]) {
      const out = row(doc, action, 9)
      expect(out).toBe(`> \`\`\`js\n${lead}\n> \`\`\``)
      expect(scanDoc(out).fences[1]?.role).toBe('content')
    }
  })
  it('a pick on a plain line in a carried block reaches no list around the block', () => {
    const doc = '1. a\n   ```md\n   plain\n   ```\n2. b'
    expect(row(doc, 'list:bullet', doc.indexOf('plain'))).toBe(
      '1. a\n   ```md\n   - plain\n   ```\n2. b',
    )
  })
  it('writes after a diff line’s sign, whatever the language, so the sign survives', () => {
    for (const fence of ['```diff', '```md diff']) {
      const doc = `${fence}\n- removed\n+added\n\`\`\``
      const removed = doc.indexOf('- removed')
      const added = doc.indexOf('+added')
      const on = (at: number, line: string, written: string) =>
        doc.slice(0, at) + written + doc.slice(at + line.length)
      expect(row(doc, 'list:ordered', removed)).toBe(on(removed, '- removed', '- 1. removed'))
      expect(row(doc, 'heading:2', removed)).toBe(on(removed, '- removed', '- ## removed'))
      expect(row(doc, 'block:quote', added)).toBe(on(added, '+added', '+> added'))
      expect(row(doc, 'block:callout', added)).toBe(on(added, '+added', '+> [!callout] added'))
      expect(row(doc, 'format:bold', added, added + 6)).toBe(on(added, '+added', '+**added**'))
    }
  })
  it('a selection from prose through the block: list picks leave the code, Heading and Bold write', () => {
    const doc = 'para\n```js\n- code\n```\nmore'
    expect(row(doc, 'list:bullet', 0, doc.length)).toBe('- para\n```js\n- code\n```\n- more')
    expect(row(doc, 'heading:2', 0, doc.length)).toBe('## para\n```js\n## - code\n```\n## more')
    const scan = scanDoc(doc)
    for (const to of [doc.indexOf('code') + 4, doc.length])
      expect(editFor('format:bold', scan, 0, to, {})).not.toBeNull()
  })
})

describe('setBlock', () => {
  it('toggles a blockquote on and off', () => {
    expect(apply('text', setBlock(scanDoc('text'), 0, 4, 'quote'))).toBe('> text')
    expect(apply('> text', setBlock(scanDoc('> text'), 2, 6, 'quote'))).toBe('text')
  })
  it('quote toggle does NOT strip a callout (its `>` is box chrome) — wraps instead', () => {
    const c = '> [!callout] hi'
    expect(apply(c, setBlock(scanDoc(c), 4, 4, 'quote'))).toBe(`> ${c}`)
  })
  it('callout insert uses the `[!callout]` default (matches the `||` shorthand)', () => {
    expect(apply('hi', setBlock(scanDoc('hi'), 0, 2, 'callout'))).toBe('> [!callout] hi')
  })
  it('callout takes a heading’s or quote’s marker, and a list’s alone', () => {
    for (const [line, out] of [
      ['## hi', '> [!callout] hi'],
      ['> hi', '> [!callout] hi'],
      ['> - foo', '> [!callout] foo'],
      ['> 1. foo', '> [!callout] foo'],
      ['> ## hi', '> [!callout] hi'],
      ['- > foo', '> [!callout] > foo'],
    ])
      expect(apply(line, setBlock(scanDoc(line), 0, line.length, 'callout'))).toBe(out)
  })
  // The dispatcher hands a line formatter the whole selection, so quoting a block of prose makes one blockquote, not a quoted first line.
  const three = 'one\ntwo\nthree'
  it('quotes every selected line', () => {
    expect(apply(three, setBlock(scanDoc(three), 0, three.length, 'quote'))).toBe(
      '> one\n> two\n> three',
    )
    expect(apply(three, setBlock(scanDoc(three), 0, 4, 'quote'))).toBe('> one\ntwo\nthree')
  })
  it('clears the quote only where every selected line already is one', () => {
    const all = '> one\n> two'
    expect(apply(all, setBlock(scanDoc(all), 0, all.length, 'quote'))).toBe('one\ntwo')
    const mixed = '> one\ntwo'
    expect(apply(mixed, setBlock(scanDoc(mixed), 0, mixed.length, 'quote'))).toBe('> > one\n> two')
    const quote = (scan: DocScan, f: number, t: number) => setBlock(scan, f, t, 'quote')
    expect(picked('one\ntwo', 1, 5, quote, quote)).toBe('one\ntwo')
  })
  // A bare `>` is the quote's own blank line — skipping it would split one quote into two.
  it("carries a blank line through as the quote's own", () => {
    const gapped = 'one\n\ntwo'
    expect(apply(gapped, setBlock(scanDoc(gapped), 0, gapped.length, 'quote'))).toBe(
      '> one\n>\n> two',
    )
  })
  it('quotes a blank line on its own with the marker and its space', () => {
    const edit = setBlock(scanDoc(''), 0, 0, 'quote')
    expect(apply('', edit)).toBe('> ')
    expect(edit.selection).toBe(2)
  })
  it('seats the caret below a rule written on a blank line', () => {
    const edit = setBlock(scanDoc(''), 0, 0, 'hr')
    expect(apply('', edit)).toBe('---\n')
    expect(edit.selection).toBe(4)
    const doc = 'a\n\nb'
    const below = setBlock(scanDoc(doc), 2, 2, 'hr')
    expect(apply(doc, below)).toBe('a\n\n---\n\nb')
    expect(below.selection).toBe(7)
    const spaced = 'a\n\n\nb'
    expect(apply(spaced, setBlock(scanDoc(spaced), 3, 3, 'hr'))).toBe('a\n\n---\n\nb')
    expect(apply(spaced, setBlock(scanDoc(spaced), 2, 2, 'hr'))).toBe('a\n\n---\n\nb')
    const opening = '\ntext'
    const first = setBlock(scanDoc(opening), 0, 0, 'hr')
    expect(apply(opening, first)).toBe('---\n\ntext')
    expect(first.selection).toBe(4)
  })
  it('fences the whole selection as one block', () => {
    expect(apply(three, setBlock(scanDoc(three), 0, three.length, 'code'))).toBe(
      '```\none\ntwo\nthree\n```',
    )
    expect(apply(three, setBlock(scanDoc(three), 0, 4, 'code'))).toBe('```\none\n```\ntwo\nthree')
    const code = (scan: DocScan, f: number, t: number) => setBlock(scan, f, t, 'code')
    expect(picked('one\ntwo', 0, 4, code, code)).toBe('one\ntwo')
    expect(picked('one\ntwo', 1, 5, code, code)).toBe('one\ntwo')
  })

  it('fences a line as code', () => {
    expect(apply('x = 1', setBlock(scanDoc('x = 1'), 0, 5, 'code'))).toBe('```\nx = 1\n```')
  })
  it('inserts a 3×3 GFM table, blank-line separated as its own block', () => {
    const t = '|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |'
    expect(apply('', setBlock(scanDoc(''), 0, 0, 'table'))).toBe(`${t}\n`)
    expect(apply('hi', setBlock(scanDoc('hi'), 2, 2, 'table'))).toBe(`hi\n\n${t}\n`)
  })

  it('seats the caret below the table on an empty document and on one ending in a newline', () => {
    const t = '|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |'
    const empty = setBlock(scanDoc(''), 0, 0, 'table')
    expect(apply('', empty)).toBe(`${t}\n`)
    expect(empty.selection).toBe(t.length + 1)
    const trailing = setBlock(scanDoc('a\n\n'), 2, 2, 'table')
    expect(apply('a\n\n', trailing)).toBe(`a\n\n${t}\n\n`)
    expect(trailing.selection).toBe(t.length + 4)
    const fenced = setBlock(scanDoc('text\n\n\nrest'), 5, 5, 'table')
    expect(apply('text\n\n\nrest', fenced)).toBe(`text\n\n${t}\n\nrest`)
    expect(fenced.selection).toBe(6 + t.length + 1)
  })

  it('blank-line-fences the inserted table below too, so it never merges with an adjacent table', () => {
    const t = '|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |'
    const below = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    expect(apply(`text\n\n${below}`, setBlock(scanDoc(`text\n\n${below}`), 5, 5, 'table'))).toBe(
      `text\n\n${t}\n\n${below}`,
    )
    expect(
      apply(`text\n\n\n${below}`, setBlock(scanDoc(`text\n\n\n${below}`), 5, 5, 'table')),
    ).toBe(`text\n\n${t}\n\n${below}`)
  })
})

describe('highlight colors', () => {
  it('wraps with the written circle after the opening ==, caret after the content', () => {
    const e = toggleInline(scanDoc('hi'), 0, 2, 'highlight', 'red')
    expect(apply('hi', e)).toBe('==🔴hi==')
    expect(e?.selection).toBe(6)
  })
  it('recolors a highlight of another color, the accent included', () => {
    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'highlight', 'blue'))).toBe(
      '==🔵hi==',
    )
    expect(apply('==🟥hi==', toggleInline(scanDoc('==🟥hi=='), 5, 5, 'highlight', 'green'))).toBe(
      '==🟢hi==',
    )
    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'highlight', 'accent'))).toBe(
      '==hi==',
    )
  })
  it('removes a highlight already in the picked color', () => {
    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'highlight', 'red'))).toBe(
      'hi',
    )
    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'highlight'))).toBe('hi')
  })
  it('reaches a colored highlight from its revealed color mark', () => {
    const doc = 'a ==🔴text== b'
    expect(apply(doc, toggleInline(scanDoc(doc), 4, 4, 'highlight', 'accent'))).toBe('a ==text== b')
    expect(apply(doc, toggleInline(scanDoc(doc), 10, 10, 'highlight', 'red'))).toBe('a text b')
    expect(apply(doc, toggleInline(scanDoc(doc), 2, 12, 'highlight', 'green'))).toBe(
      'a ==🟢text== b',
    )
    expect(apply(doc, toggleInline(scanDoc(doc), 4, 10, 'highlight', 'accent'))).toBe(
      'a ==text== b',
    )
  })
})

describe('text colors', () => {
  it('wraps with the written circle after a lone =, caret after the content', () => {
    const e = toggleInline(scanDoc('hi'), 0, 2, 'textColor', 'red')
    expect(apply('hi', e)).toBe('=🔴hi=')
    expect(e?.selection).toBe(5)
  })
  it('wraps a bare caret, which reads as a text color once words follow its mark', () => {
    const e = toggleInline(scanDoc('a  b'), 2, 2, 'textColor', 'red')!
    expect(apply('a  b', e)).toBe('a =🔴= b')
    expect(e.selection).toBe(5)
  })
  it('turns a highlight into a text color and back, the span keeping one color', () => {
    expect(apply('==🔴hi==', toggleInline(scanDoc('==🔴hi=='), 5, 5, 'textColor', 'blue'))).toBe(
      '=🔵hi=',
    )
    expect(apply('==hi==', toggleInline(scanDoc('==hi=='), 3, 3, 'textColor', 'red'))).toBe(
      '=🔴hi=',
    )
    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight', 'green'))).toBe(
      '==🟢hi==',
    )
    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight', 'red'))).toBe(
      '==🔴hi==',
    )
    expect(apply('=🔴hi=', toggleInline(scanDoc('=🔴hi='), 4, 4, 'highlight', 'accent'))).toBe(
      '==hi==',
    )
  })
  it('recolors a text color, and removes one already in the picked color', () => {
    expect(apply('=🔵hi=', toggleInline(scanDoc('=🔵hi='), 4, 4, 'textColor', 'green'))).toBe(
      '=🟢hi=',
    )
    expect(apply('=🔵hi=', toggleInline(scanDoc('=🔵hi='), 4, 4, 'textColor', 'blue'))).toBe('hi')
  })
  it('acts on the whole span from a selection inside it or a caret on its revealed mark', () => {
    const doc = 'a ==🔴two words== b'
    expect(apply(doc, toggleInline(scanDoc(doc), 6, 9, 'textColor', 'blue'))).toBe(
      'a =🔵two words= b',
    )
    expect(apply('a =🔴x= b', toggleInline(scanDoc('a =🔴x= b'), 3, 3, 'textColor', 'red'))).toBe(
      'a x b',
    )
  })
  it('refuses words holding an =, which would close the text color early', () => {
    expect(toggleInline(scanDoc('x=1'), 0, 3, 'textColor', 'red')).toBeNull()
    expect(toggleInline(scanDoc('==a=b=='), 3, 3, 'textColor', 'red')).toBeNull()
  })
  it('refuses a fresh wrap beside an =, which would fuse its marker into a longer run', () => {
    expect(toggleInline(scanDoc('=🔴hi='), 6, 6, 'textColor', 'red')).toBeNull()
    expect(toggleInline(scanDoc('=🔴a=b'), 5, 6, 'textColor', 'blue')).toBeNull()
    expect(toggleInline(scanDoc('==hi==x'), 6, 7, 'textColor', 'blue')).toBeNull()
    expect(toggleInline(scanDoc('a=b and ==c=='), 2, 3, 'textColor', 'red')).toBeNull()
  })
  it('refuses a fresh highlight beside an =, which would erase the span it touches', () => {
    expect(toggleInline(scanDoc('a =🔴warm= b'), 10, 10, 'highlight', 'red')).toBeNull()
    expect(toggleInline(scanDoc('==a== b'), 5, 5, 'highlight')).toBeNull()
  })
  it('refuses a fresh paint over part of another, which would drop the one inside', () => {
    expect(toggleInline(scanDoc('a =🔴b= c'), 0, 9, 'highlight', 'green')).toBeNull()
    expect(toggleInline(scanDoc('a =🔴bc= d'), 0, 6, 'highlight', 'green')).toBeNull()
  })
  it('refuses a paint that would not read back as written', () => {
    const refused = (doc: string, from: number, to: number, paint: Paint, color?: PaintColor) =>
      toggleInline(scanDoc(doc), from, to, paint, color)
    expect(refused('a==b', 0, 4, 'highlight')).toBeNull()
    expect(refused('a=', 0, 2, 'highlight')).toBeNull()
    expect(refused('=a', 0, 2, 'highlight')).toBeNull()
    expect(refused('x == y', 0, 6, 'highlight')).toBeNull()
    expect(refused('ab\ncd', 0, 5, 'highlight', 'red')).toBeNull()
    expect(refused('ab\ncd', 0, 5, 'textColor', 'red')).toBeNull()
    expect(refused('run `npm test` now', 5, 8, 'highlight', 'red')).toBeNull()
    expect(refused('a $x+y$ b', 3, 4, 'highlight', 'red')).toBeNull()
    expect(refused('🔴 Urgent now', 0, 9, 'highlight')).toBeNull()
    expect(toggleInline(scanDoc('🔴 Urgent now'), 0, 9, 'highlight', 'accent')).toBeNull()
  })
  it('lets a text color hold an = inside code, a link, or math', () => {
    const doc = 'run `a = b` now'
    expect(apply(doc, toggleInline(scanDoc(doc), 0, 15, 'textColor', 'red'))).toBe(
      '=🔴run `a = b` now=',
    )
  })
  it('routes each paint’s menu action', () => {
    expect(apply('hi', editFor('textColor:red', scanDoc('hi'), 0, 2, {}))).toBe('=🔴hi=')
    expect(apply('hi', editFor('highlight:red', scanDoc('hi'), 0, 2, {}))).toBe('==🔴hi==')
  })
  it('removes any paint under the highlight chord, where the Accent row recolors', () => {
    const act = (doc: string, at: number, action: string) =>
      apply(doc, editFor(action, scanDoc(doc), at, at, {}))
    expect(act('==🔴hi==', 5, 'format:highlight')).toBe('hi')
    expect(act('=🔴hi=', 4, 'format:highlight')).toBe('hi')
    expect(act('=🔴hi=', 4, 'highlight:accent')).toBe('==hi==')
    expect(act('==🔴hi==', 5, 'highlight:accent')).toBe('==hi==')
    expect(act('==hi==', 3, 'highlight:accent')).toBe('hi')
  })
})
