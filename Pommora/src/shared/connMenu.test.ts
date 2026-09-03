import { describe, expect, it } from 'vitest'
import { connMenuModel, type ConnMenuContext } from './connMenu'

const rows = (ctx: Partial<ConnMenuContext> = {}): [string, string][] =>
  connMenuModel({ surface: 'editor', editable: true, hasAlias: false, ...ctx }).map((i) => [
    i.label,
    i.action,
  ])

describe('a link naming a page', () => {
  it('offers the same actions in the editor and in a property cell, the ending aside', () => {
    expect(rows()).toEqual([
      ['Open Preview', 'title:preview'],
      ['Open New Tab', 'title:newtab'],
      ['Add Title', 'rename'],
      ['Edit Link', 'editLink'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
    ])
    expect(rows({ surface: 'cell' })).toEqual([...rows(), ['Clear', 'link:clear']])
  })

  it('names editing the title once one exists', () => {
    expect(rows({ hasAlias: true })).toContainEqual(['Edit Title', 'rename'])
  })

  it('withholds the authoring pair from a surface that cannot take the edit', () => {
    expect(rows({ editable: false }).map(([, a]) => a)).not.toContain('rename')
  })

  it('names focusing a page that already holds a tab', () => {
    expect(rows({ open: 'tab' })).toContainEqual(['Open', 'title:newtab'])
  })

  it('drops each open item where that surface already shows the page', () => {
    const actions = (ctx: Partial<ConnMenuContext>): string[] => rows(ctx).map(([, a]) => a)
    expect(actions({ open: 'detail' })).not.toContain('title:newtab')
    expect(actions({ open: 'detail' })).toContain('title:preview')
    expect(actions({ previewing: true })).not.toContain('title:preview')
    expect(actions({ previewing: true })).toContain('title:newtab')
    // Showing in both leaves nowhere left to open it.
    const both = actions({ open: 'detail', previewing: true })
    expect(both).not.toContain('title:preview')
    expect(both).not.toContain('title:newtab')
    expect(both[0]).toBe('rename')
  })

  it('a card ends with the Remove every card value offers', () => {
    expect(rows({ surface: 'cell', hideable: true }).at(-1)).toEqual(['Remove', 'link:hide'])
  })
})

describe('a link naming an address', () => {
  const ext = (ctx: Partial<ConnMenuContext> = {}): [string, string][] =>
    rows({ external: true, ...ctx })

  it('opens into either browser, and says which is which', () => {
    expect(ext().slice(0, 2)).toEqual([
      ['Open Preview', 'link:preview'],
      ['Open Browser', 'link:browser'],
    ])
  })

  it('the editor keeps the address among the items that rewrite the link', () => {
    expect(ext()).toEqual([
      ['Open Preview', 'link:preview'],
      ['Open Browser', 'link:browser'],
      ['Rename', 'rename'],
      ['Edit Link', 'editLink'],
      ['Copy Link', 'title:copylink'],
      ['Format', 'format:link-full'],
      ['Remove Link', 'link:remove'],
      ['Delete', 'link:delete'],
    ])
  })

  it('a cell copies the address alongside the opens, and can only empty its value', () => {
    expect(ext({ surface: 'cell' })).toEqual([
      ['Open Preview', 'link:preview'],
      ['Open Browser', 'link:browser'],
      ['Copy Link', 'title:copylink'],
      ['Rename', 'rename'],
      ['Edit Link', 'editLink'],
      ['Clear', 'link:clear'],
    ])
  })

  it('an address is never offered what needs a page behind it', () => {
    for (const surface of ['editor', 'cell'] as const)
      expect(ext({ surface }).map(([, a]) => a)).not.toContain('title:copypath')
  })

  it('a read-only surface is offered the address and nothing that rewrites the link', () => {
    expect(ext({ editable: false })).toEqual([
      ['Open Preview', 'link:preview'],
      ['Open Browser', 'link:browser'],
      ['Copy Link', 'title:copylink'],
    ])
  })

  it('Format lists the three link forms as its branch', () => {
    const format = connMenuModel({
      surface: 'editor',
      editable: true,
      hasAlias: false,
      external: true,
    }).find((i) => i.label === 'Format')
    expect(format?.submenu?.map((r) => r.action)).toEqual([
      'format:link-full',
      'format:link-short',
      'format:link-title',
    ])
  })

  it("never offers a page's history — the link menu points, it does not keep", () => {
    expect(
      JSON.stringify(
        connMenuModel({
          surface: 'editor',
          editable: true,
          hasAlias: false,
          open: 'closed',
          previewing: false,
        }),
      ),
    ).not.toContain('title:history')
  })
})
