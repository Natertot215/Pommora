import { describe, expect, it } from 'vitest'
import { type CellMenuContext, cellMenuContextFor, cellMenuModel } from './cellMenu'
import { dateDefaults } from '../Properties/columnStyles'

const DATES = dateDefaults('full')

describe('cellMenuModel', () => {
  it('title: Preview + stateful Open row + Rename + Edit Icon + New Page pair + the send block + separator-gated Delete', () => {
    const m = cellMenuModel({ kind: 'title' })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Preview', 'title:window'],
      ['New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Edit Icon', 'title:icon'],
      ['New Page Above', 'title:newabove'],
      ['New Page Below', 'title:newbelow'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['View History', 'title:history'],
      ['Delete', 'title:delete'],
    ])
    expect(cellMenuModel({ kind: 'title', alreadyOpen: true })[0].label).toBe('Open')
    expect(m.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
    expect(m.some((i) => i.submenu)).toBe(false)
  })

  it('title: Move To leads the send block only where the cell was given somewhere to send to', () => {
    const withTargets = cellMenuModel({
      kind: 'title',
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    })
    const labels = withTargets.map((i) => i.label)
    const at = labels.indexOf('Move To')
    expect(labels.slice(at, at + 4)).toEqual(['Move To', 'Copy Link', 'Copy Path', 'View History'])
    expect(withTargets[at].separatorBefore).toBe(true)
    expect(withTargets[at + 1].separatorBefore).toBeUndefined()
    expect(cellMenuModel({ kind: 'title', moveTargets: [] })).not.toContainEqual(
      expect.objectContaining({ label: 'Move To' }),
    )
  })

  it('style-only: the per-type Format ▸ row alone', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'number',
      current: { ...DATES, look: 'bar' },
      barCapable: true,
    })
    expect(m.map((i) => i.label)).toEqual(['Format'])
    expect(m[0].submenu?.map((r) => r.label)).toEqual(['Number', 'Bar'])
  })

  it('a clearable style-only (status) adds Clear under the Style radios', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'status',
      current: { ...DATES, look: 'standard' },
      clearable: true,
    })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Style', undefined],
      ['Clear', 'cell:clear'],
    ])
    expect(m[1].separatorBefore).toBe(true)
    expect(m[0].submenu?.map((r) => r.label)).toEqual(['Standard', 'Compact'])
    expect(m[0].submenu?.find((r) => r.action === 'style:look:standard')?.checked).toBe(true)
  })

  it('clear-only (context): just Clear', () => {
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
    const card = cellMenuModel({ kind: 'file', onChip: true, hideable: true })
    const labels = card.map((i) => i.label)
    expect(labels).toEqual(['Add File', 'Replace File', 'Remove File', 'Remove from View'])
    expect(new Set(labels).size).toBe(labels.length)
    expect(cellMenuModel({ kind: 'clear-only', hideable: true }).at(-1)?.label).toBe('Remove')
  })

  it('link (a filled Link cell): Edit + Rename, then a separated Clear, no Style (its look is per-property)', () => {
    const m = cellMenuModel({ kind: 'link', filled: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Edit', 'editLink'],
      ['Rename', 'rename'],
      ['Clear', 'cell:clear'],
    ])
    expect(m[2].separatorBefore).toBe(true)
    expect(m.some((i) => i.submenu)).toBe(false)
  })

  it('text: Edit, then Clear and Remove together beneath it', () => {
    const m = cellMenuModel({ kind: 'text', filled: true, hideable: true })
    expect(m.map((i) => [i.label, i.action, i.separatorBefore])).toEqual([
      ['Edit', 'cell:edit', undefined],
      ['Clear', 'cell:clear', true],
      ['Remove', 'cell:hide', undefined],
    ])
    expect(cellMenuModel({ kind: 'text', filled: false }).map((i) => i.label)).toEqual(['Edit'])
  })

  it('link (an empty Link cell): Edit alone — Rename/Clear are no-ops with no value', () => {
    const m = cellMenuModel({ kind: 'link', filled: false })
    expect(m.map((i) => [i.label, i.action])).toEqual([['Edit', 'editLink']])
  })

  it('hideable (cards) appends Remove beside Clear', () => {
    const m = cellMenuModel({ kind: 'clear-only', hideable: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([
      ['Clear', 'cell:clear'],
      ['Remove', 'cell:hide'],
    ])
    expect(m.find((i) => i.action === 'cell:hide')?.separatorBefore).toBeUndefined()
  })

  it('remove-only (a hideable cell with no other menu): Remove alone, no separator', () => {
    const m = cellMenuModel({ kind: 'remove-only', hideable: true })
    expect(m.map((i) => [i.label, i.action])).toEqual([['Remove', 'cell:hide']])
    expect(m[0].separatorBefore).toBeUndefined()
  })

  it('hideable style-only with no base item (checkbox): Remove sits under the Style ▸ divider once', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'checkbox',
      current: DATES,
      hideable: true,
    })
    expect(m.map((i) => [i.label, i.action, i.separatorBefore])).toEqual([
      ['Style', undefined, undefined],
      ['Remove', 'cell:hide', true],
    ])
  })

  it('a hideable title never gets Remove — the title can never be dropped', () => {
    const m = cellMenuModel({ kind: 'title', hideable: true })
    expect(m.some((i) => i.action === 'cell:hide')).toBe(false)
  })
})

describe('cellMenuContextFor', () => {
  it('a title column → the page-meta title menu', () => {
    expect(cellMenuContextFor('title', DATES, true)).toEqual({
      kind: 'title',
    })
  })

  it('a context column → clear-only when filled, no menu when empty', () => {
    expect(cellMenuContextFor('context', DATES, true)).toEqual({ kind: 'clear-only' })
    expect(cellMenuContextFor('context', DATES, false)).toBeNull()
  })

  it('a text column → its Edit menu, filled or empty', () => {
    expect(cellMenuContextFor('text', DATES, true)).toEqual({ kind: 'text', filled: true })
    expect(cellMenuContextFor('text', DATES, false)).toEqual({ kind: 'text', filled: false })
  })

  it('a link column → the link menu, carrying filled; a file cell has no look left to offer', () => {
    expect(cellMenuContextFor('link', DATES, true)).toEqual({ kind: 'link', filled: true })
    expect(cellMenuContextFor('file', DATES, false)).toEqual({
      kind: 'file',
      onChip: false,
    })
    expect(cellMenuContextFor('file', DATES, true, { onChip: true })).toEqual({
      kind: 'file',
      onChip: true,
    })
  })

  it('status/dateTime → style-only, Clear gated on filled', () => {
    expect(cellMenuContextFor('status', DATES, true)).toEqual({
      kind: 'style-only',
      type: 'status',
      current: DATES,
      clearable: true,
    })
    expect(cellMenuContextFor('status', DATES, false)).toEqual({
      kind: 'style-only',
      type: 'status',
      current: DATES,
      clearable: false,
    })
  })

  it('checkbox/number → style-only with no Clear; a stamp gets Style but never Clear', () => {
    expect(cellMenuContextFor('number', DATES, true)).toEqual({
      kind: 'style-only',
      type: 'number',
      current: DATES,
    })
    for (const type of ['createdTime', 'lastEditedTime'] as const) {
      const ctx = cellMenuContextFor(type, DATES, true)
      expect(ctx).toEqual({ kind: 'style-only', type, current: DATES, clearable: false })
      expect(cellMenuModel(ctx as CellMenuContext).some((i) => i.action === 'cell:clear')).toBe(
        false,
      )
    }
  })

  it('number carries barCapable only when a bar can render (gates the Bar look)', () => {
    expect(cellMenuContextFor('number', DATES, true, { barCapable: true })).toEqual({
      kind: 'style-only',
      type: 'number',
      current: DATES,
      barCapable: true,
    })
  })

  it('select/multiSelect → style-only like Status, Clear gated on filled', () => {
    for (const type of ['select', 'multiSelect'] as const) {
      expect(cellMenuContextFor(type, DATES, true)).toEqual({
        kind: 'style-only',
        type,
        current: DATES,
        clearable: true,
      })
      expect(cellMenuContextFor(type, DATES, false)).toEqual({
        kind: 'style-only',
        type,
        current: DATES,
        clearable: false,
      })
    }
    const filled = cellMenuModel(cellMenuContextFor('select', DATES, true) as CellMenuContext)
    expect(filled.find((i) => i.submenu)?.submenu?.map((i) => i.label)).toEqual([
      'Standard',
      'Compact',
    ])
    expect(filled.some((i) => i.action === 'cell:clear')).toBe(true)
    const empty = cellMenuModel(cellMenuContextFor('multiSelect', DATES, false) as CellMenuContext)
    expect(empty.some((i) => i.action === 'cell:clear')).toBe(false)
  })

  it('an unsupported/undefined type → no menu', () => {
    expect(cellMenuContextFor(undefined, DATES, true)).toBeNull()
  })

  it('hideable (cards): a styled cell carries hideable; a menu-less cell becomes remove-only', () => {
    expect(cellMenuContextFor('select', DATES, true, { hideable: true })).toEqual({
      kind: 'style-only',
      type: 'select',
      current: DATES,
      clearable: true,
      hideable: true,
    })
    const ctx = cellMenuContextFor('select', DATES, false, { hideable: true })
    expect(cellMenuModel(ctx as CellMenuContext).at(-1)?.action).toBe('cell:hide')
    expect(cellMenuContextFor(undefined, DATES, true, { hideable: true })).toEqual({
      kind: 'remove-only',
      hideable: true,
    })
  })
})
