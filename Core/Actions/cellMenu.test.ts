import { describe, expect, it } from 'vitest'
import { type CellMenuContext, cellMenuContextFor, cellMenuModel } from './cellMenu'
import type { ResolvedColumn } from '../Views/viewRow'

describe('cellMenuModel', () => {
  it('title: Open Preview + stateful Open lead + Rename + Edit Icon + New Page pair + the send block + separator-gated Delete', () => {
    const m = cellMenuModel({ kind: 'title' })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Open Preview', 'title:window'],
      ['Open New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Edit Icon', 'title:icon'],
      ['New Page Above', 'title:newabove'],
      ['New Page Below', 'title:newbelow'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['View History', 'title:history'],
      ['Delete', 'title:delete'],
    ])
    // An already-open page reads "Open" (focus, I-1) — same action either way.
    expect(cellMenuModel({ kind: 'title', alreadyOpen: true })[1].label).toBe('Open')
    expect(m.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
    expect(m.some((i) => i.submenu)).toBe(false)
  })

  it('title: Move To leads the send block only where the cell was given somewhere to send to', () => {
    const withTargets = cellMenuModel({
      kind: 'title',
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    })
    const actions = withTargets.map((i) => i.action)
    const at = actions.indexOf('title:moveto')
    expect(actions.slice(at, at + 4)).toEqual([
      'title:moveto',
      'title:copylink',
      'title:copypath',
      'title:history',
    ])
    expect(withTargets.find((i) => i.action === 'title:moveto')?.separatorBefore).toBe(true)
    expect(withTargets.find((i) => i.action === 'title:copylink')?.separatorBefore).toBe(false)
    expect(cellMenuModel({ kind: 'title', moveTargets: [] })).not.toContainEqual(
      expect.objectContaining({ action: 'title:moveto' }),
    )
  })

  it('style-only: the per-type Format ▸ row alone', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'number',
      current: { look: 'bar' },
      barCapable: true,
    })
    expect(m.map((i) => i.label)).toEqual(['Format'])
    expect(m[0].submenu?.map((r) => r.label)).toEqual(['Number', 'Bar'])
  })

  it('a clearable style-only (status) adds Clear under the Style radios', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'status',
      current: { look: 'standard' },
      clearable: true,
    })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Style', 'style:look:standard'],
      ['Clear', 'cell:clear'],
    ])
    expect(m[1].separatorBefore).toBe(true)
    expect(m[0].submenu?.map((r) => r.label)).toEqual(['Standard', 'Compact'])
    expect(m[0].submenu?.find((r) => r.action === 'style:look:standard')?.checked).toBe(true)
  })

  it('clear-only (select/multi/context): just Clear', () => {
    const m = cellMenuModel({ kind: 'clear-only' })
    expect(m.map((i) => [i.label, i.action])).toEqual([['Clear', 'cell:clear']])
    expect(m.some((i) => i.submenu)).toBe(false)
  })

  it('a file value: Add alone off the value’s area, the full set off a label', () => {
    const area = cellMenuModel({ kind: 'file', onChip: false })
    expect(area.map((i) => [i.label, i.action])).toEqual([['Add File', 'file:add']])
    const onChip = cellMenuModel({ kind: 'file', onChip: true })
    expect(onChip.map((i) => [i.label, i.action])).toEqual([
      ['Add File', 'file:add'],
      ['Replace File', 'file:replace'],
      ['Remove File', 'file:remove'],
    ])
    expect(onChip.some((i) => i.submenu)).toBe(false)
  })

  it('a card’s two Removes are told apart by their words, not their position', () => {
    // Two Removes spelled the same — one destructive to a value, one to the view — would differ only by position.
    const card = cellMenuModel({ kind: 'file', onChip: true, hideable: true })
    const labels = card.map((i) => i.label)
    expect(labels).toEqual(['Add File', 'Replace File', 'Remove File', 'Remove from View'])
    expect(new Set(labels).size).toBe(labels.length)
    expect(cellMenuModel({ kind: 'clear-only', hideable: true }).at(-1)?.label).toBe('Remove')
  })

  it('link (a filled url cell): Edit + Rename + Clear, no Style (its look is per-property)', () => {
    const m = cellMenuModel({ kind: 'link', filled: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Edit', 'cell:edit'],
      ['Rename', 'cell:rename'],
      ['Clear', 'cell:clear'],
    ])
    expect(m.some((i) => i.submenu)).toBe(false)
  })

  it('link (an empty url cell): Edit alone — Rename/Clear are no-ops with no value', () => {
    const m = cellMenuModel({ kind: 'link', filled: false })
    expect(m.map((i) => [i.label, i.action])).toEqual([['Edit', 'cell:edit']])
  })

  it('hideable (cards) appends a separated Remove after the base items', () => {
    const m = cellMenuModel({ kind: 'clear-only', hideable: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Clear', 'cell:clear'],
      ['Remove', 'cell:hide'],
    ])
    expect(m.find((i) => i.action === 'cell:hide')?.separatorBefore).toBe(true)
  })

  it('remove-only (a hideable cell with no other menu): Remove alone, no separator', () => {
    const m = cellMenuModel({ kind: 'remove-only', hideable: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([['Remove', 'cell:hide']])
    expect(m[0].separatorBefore).toBe(false)
  })

  it('hideable style-only with no base item (checkbox): Remove sits under the Style ▸ divider once', () => {
    const m = cellMenuModel({ kind: 'style-only', type: 'checkbox', current: {}, hideable: true })
    expect(m.map((i) => [i.label, i.action, i.separatorBefore])).toEqual([
      ['Style', 'style:look:checkbox', undefined],
      ['Remove', 'cell:hide', true],
    ])
  })

  it('a hideable title never gets Remove — the title can never be dropped', () => {
    const m = cellMenuModel({ kind: 'title', hideable: true })
    expect(m.some((i) => i.action === 'cell:hide')).toBe(false)
  })
})

describe('cellMenuContextFor', () => {
  const prop = (id = 'p'): ResolvedColumn => ({ id, kind: 'property' })

  it('a title column → the page-meta title menu', () => {
    expect(cellMenuContextFor({ id: 'title', kind: 'title' }, 'title', {}, true)).toEqual({
      kind: 'title',
    })
  })

  it('a context column → clear-only when filled, no menu when empty', () => {
    const context: ResolvedColumn = { id: 'ctx_areas', kind: 'context' }
    expect(cellMenuContextFor(context, 'context', {}, true)).toEqual({ kind: 'clear-only' })
    expect(cellMenuContextFor(context, 'context', {}, false)).toBeNull()
  })

  it('url → link (carrying filled); a file cell has no look left to offer', () => {
    expect(cellMenuContextFor(prop(), 'url', {}, true)).toEqual({ kind: 'link', filled: true })
    expect(cellMenuContextFor(prop(), 'file', {}, false)).toEqual({ kind: 'file', onChip: false })
    expect(cellMenuContextFor(prop(), 'file', {}, true, { onChip: true })).toEqual({
      kind: 'file',
      onChip: true,
    })
  })

  it('status/datetime → style-only, Clear gated on filled', () => {
    expect(cellMenuContextFor(prop(), 'status', {}, true)).toEqual({
      kind: 'style-only',
      type: 'status',
      current: {},
      clearable: true,
    })
    expect(cellMenuContextFor(prop(), 'status', {}, false)).toEqual({
      kind: 'style-only',
      type: 'status',
      current: {},
      clearable: false,
    })
  })

  it('checkbox/number and both stamps → style-only with no Clear', () => {
    expect(cellMenuContextFor(prop(), 'number', {}, true)).toEqual({
      kind: 'style-only',
      type: 'number',
      current: {},
    })
    expect(cellMenuContextFor(prop(), 'created_time', {}, true)).toEqual({
      kind: 'style-only',
      type: 'created_time',
      current: {},
    })
    expect(cellMenuContextFor(prop(), 'last_edited_time', {}, true)).toEqual({
      kind: 'style-only',
      type: 'last_edited_time',
      current: {},
    })
  })

  it('number carries barCapable only when a bar can render (gates the Bar look)', () => {
    expect(cellMenuContextFor(prop(), 'number', {}, true, { barCapable: true })).toEqual({
      kind: 'style-only',
      type: 'number',
      current: {},
      barCapable: true,
    })
  })

  it('select/multi/context → clear-only when filled, no menu when empty', () => {
    expect(cellMenuContextFor(prop(), 'select', {}, true)).toEqual({ kind: 'clear-only' })
    expect(cellMenuContextFor(prop(), 'multi_select', {}, false)).toBeNull()
  })

  it('an unsupported/undefined type → no menu', () => {
    expect(cellMenuContextFor(prop(), undefined, {}, true)).toBeNull()
  })

  it('hideable (cards): a filled cell carries hideable; a menu-less cell becomes remove-only', () => {
    expect(cellMenuContextFor(prop(), 'select', {}, true, { hideable: true })).toEqual({
      kind: 'clear-only',
      hideable: true,
    })
    // remove-only MUST carry the hideable flag, or the model appends nothing and the menu never pops.
    const ctx = cellMenuContextFor(prop(), 'select', {}, false, { hideable: true })
    expect(ctx).toEqual({ kind: 'remove-only', hideable: true })
    expect(cellMenuModel(ctx as CellMenuContext).map((i) => i.action)).toEqual(['cell:hide'])
    expect(cellMenuContextFor(prop(), undefined, {}, true, { hideable: true })).toEqual({
      kind: 'remove-only',
      hideable: true,
    })
  })
})
