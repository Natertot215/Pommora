import { describe, expect, it } from 'vitest'
import { connectionMenuModel, type LinkMenuContext } from './connectionMenu'

const rows = (ctx: LinkMenuContext): [string, string | undefined][] =>
  connectionMenuModel(ctx).map((i) => [i.label, i.action])

const page: Omit<Extract<LinkMenuContext, { kind: 'page' }>, 'editable'> = {
  kind: 'page',
  open: 'closed',
  windowed: false,
}
const web = { kind: 'url', web: true } as const

describe('a link naming a page', () => {
  it('an editor lists the opens, the authoring pair, both copies, and what unlinks it', () => {
    expect(rows({ ...page, editable: true })).toEqual([
      ['Preview', 'title:window'],
      ['New Tab', 'title:newtab'],
      ['Rename', 'rename'],
      ['Edit Title', 'editLink'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['Remove Link', 'link:remove'],
      ['Delete', 'link:delete'],
    ])
  })

  it('a read-only surface lists the opens and the copies alone', () => {
    expect(rows({ ...page, editable: false })).toEqual([
      ['Preview', 'title:window'],
      ['New Tab', 'title:newtab'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
    ])
  })

  it('a value closes with Clear, and Remove where its surface hides values', () => {
    expect(rows({ ...page, editable: true, value: { hideable: false } }).slice(-1)).toEqual([
      ['Clear', 'cell:clear'],
    ])
    expect(rows({ ...page, editable: true, value: { hideable: true } }).slice(-2)).toEqual([
      ['Clear', 'cell:clear'],
      ['Remove', 'cell:hide'],
    ])
  })

  it('names focusing a page that already holds a tab', () => {
    expect(rows({ ...page, editable: true, open: 'tab' })).toContainEqual(['Open', 'title:newtab'])
  })

  it('drops each open item where that surface already shows the page', () => {
    const actions = (ctx: Partial<typeof page>): (string | undefined)[] =>
      rows({ ...page, ...ctx, editable: true }).map(([, a]) => a)
    expect(actions({ open: 'detail' })).not.toContain('title:newtab')
    expect(actions({ open: 'detail' })).toContain('title:window')
    expect(actions({ windowed: true })).not.toContain('title:window')
    expect(actions({ windowed: true })).toContain('title:newtab')
    expect(actions({ open: 'detail', windowed: true })[0]).toBe('rename')
  })

  it("never offers a page's history", () => {
    expect(rows({ ...page, editable: true }).map(([, a]) => a)).not.toContain('title:history')
  })
})

describe('a link naming an address', () => {
  it('an editor lists the opens, the authoring pair, the copy with Format, and what unlinks it', () => {
    expect(rows({ ...web, editable: true })).toEqual([
      ['Preview', 'link:window'],
      ['Open In Browser', 'link:browser'],
      ['Rename', 'rename'],
      ['Edit Link', 'editLink'],
      ['Copy Link', 'title:copylink'],
      ['Format', undefined],
      ['Remove Link', 'link:remove'],
      ['Delete', 'link:delete'],
    ])
  })

  it('a value lists the same opens and authoring, then the copy and its closing rows, with no Format', () => {
    expect(rows({ ...web, editable: true, value: { hideable: true } })).toEqual([
      ['Preview', 'link:window'],
      ['Open In Browser', 'link:browser'],
      ['Rename', 'rename'],
      ['Edit Link', 'editLink'],
      ['Copy Link', 'title:copylink'],
      ['Clear', 'cell:clear'],
      ['Remove', 'cell:hide'],
    ])
  })

  it('a read-only surface is offered the opens and the copy', () => {
    expect(rows({ ...web, editable: false })).toEqual([
      ['Preview', 'link:window'],
      ['Open In Browser', 'link:browser'],
      ['Copy Link', 'title:copylink'],
    ])
  })

  it('Format lists the three link forms for a web address', () => {
    const format = connectionMenuModel({ ...web, editable: true }).find((i) => i.label === 'Format')
    expect(format?.submenu?.map((r) => r.action)).toEqual([
      'format:link-full',
      'format:link-short',
      'format:link-title',
    ])
  })

  it('a non-web address opens in the browser alone and has no Page Title to format to', () => {
    const model = connectionMenuModel({ kind: 'url', web: false, editable: true })
    expect(model.map((i) => i.action).slice(0, 2)).toEqual(['link:browser', 'rename'])
    expect(model[1].separatorBefore).toBe(true)
    expect(model.find((i) => i.label === 'Format')?.submenu?.map((r) => r.label)).toEqual([
      'Full Link',
      'Short Link',
    ])
  })

  it('never offers what needs a page behind it', () => {
    expect(rows({ ...web, editable: true }).map(([, a]) => a)).not.toContain('title:copypath')
  })
})
