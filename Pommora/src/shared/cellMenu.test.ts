import { describe, expect, it } from 'vitest'
import { type CellMenuContext, cellMenuContextFor, cellMenuModel } from './cellMenu'
import type { ResolvedColumn } from './types'

describe('cellMenuModel', () => {
  it('title: Open Preview + stateful Open lead + Rename + Change Icon + New Page pair + the send block + separator-gated Delete', () => {
    const m = cellMenuModel({ kind: 'title' })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([
      ['Open Preview', 'title:preview'],
      ['Open New Tab', 'title:newtab'],
      ['Rename', 'title:rename'],
      ['Change Icon', 'title:icon'],
      ['New Page Above', 'title:newabove'],
      ['New Page Below', 'title:newbelow'],
      ['Copy Link', 'title:copylink'],
      ['Copy Path', 'title:copypath'],
      ['Delete', 'title:delete'],
    ])
    // An already-open page reads "Open" (focus, I-1) — same action either way.
    expect(cellMenuModel({ kind: 'title', alreadyOpen: true }).items[1].label).toBe('Open')
    expect(m.items.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
    expect(m.items.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
    expect(m.style).toBeUndefined()
  })

  it('title: Move To leads the send block only where the cell was given somewhere to send to', () => {
    const withTargets = cellMenuModel({
      kind: 'title',
      moveTargets: [{ id: 'c1', label: 'Notes', path: 'Notes' }],
    })
    expect(withTargets.items.slice(-4, -1).map((i) => i.action)).toEqual([
      'title:moveto',
      'title:copylink',
      'title:copypath',
    ])
    expect(withTargets.items.find((i) => i.action === 'title:moveto')?.separatorBefore).toBe(true)
    expect(withTargets.items.find((i) => i.action === 'title:copylink')?.separatorBefore).toBe(
      false,
    )
    expect(cellMenuModel({ kind: 'title', moveTargets: [] }).items).not.toContainEqual(
      expect.objectContaining({ action: 'title:moveto' }),
    )
  })

  it('style-only: the per-type Style radios, no plain items', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'number',
      current: { look: 'bar' },
      barCapable: true,
    })
    expect(m.items).toEqual([])
    expect(m.style?.rows.map((r) => r.label)).toEqual(['Number', 'Bar'])
  })

  it('a clearable style-only (status) adds Clear under the Style radios', () => {
    const m = cellMenuModel({
      kind: 'style-only',
      type: 'status',
      current: { look: 'pill' },
      clearable: true,
    })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([['Clear', 'cell:clear']])
    expect(m.style?.rows.map((r) => r.label)).toEqual(['Pill', 'Capsule', 'Checkbox'])
    expect(m.style?.rows.find((r) => r.value === 'pill')?.checked).toBe(true)
  })

  it('clear-only (select/multi/context): just Clear', () => {
    const m = cellMenuModel({ kind: 'clear-only' })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([['Clear', 'cell:clear']])
    expect(m.style).toBeUndefined()
  })

  it('a file value: Add alone off the value’s area, the full set off a label', () => {
    const area = cellMenuModel({ kind: 'file', onChip: false })
    expect(area.items.map((i) => [i.label, i.action])).toEqual([['Add File', 'file:add']])
    // Replace and Remove address the label that was clicked; the value's own area has no file for
    // either to act on.
    const onChip = cellMenuModel({ kind: 'file', onChip: true })
    expect(onChip.items.map((i) => [i.label, i.action])).toEqual([
      ['Add File', 'file:add'],
      ['Replace File', 'file:replace'],
      ['Remove File', 'file:remove'],
    ])
    expect(onChip.style).toBeUndefined()
  })

  it('a card’s two Removes are told apart by their words, not their position', () => {
    // `hideable` appends a Remove that drops the property from the VIEW. A file cell carries its
    // own Remove for the reference, and two items spelled the same — one destructive to a value,
    // one to the view's configuration — would differ only by where they sit.
    const card = cellMenuModel({ kind: 'file', onChip: true, hideable: true })
    const labels = card.items.map((i) => i.label)
    expect(labels).toEqual(['Add File', 'Replace File', 'Remove File', 'Remove from View'])
    expect(new Set(labels).size).toBe(labels.length)
    // Every other type keeps the plain word.
    expect(cellMenuModel({ kind: 'clear-only', hideable: true }).items.at(-1)?.label).toBe('Remove')
  })

  it('link (a filled url cell): Edit + Rename + Clear, no Style (its look is per-property)', () => {
    const m = cellMenuModel({ kind: 'link', filled: true })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([
      ['Edit', 'cell:edit'],
      ['Rename', 'cell:rename'],
      ['Clear', 'cell:clear'],
    ])
    expect(m.style).toBeUndefined()
  })

  it('link (an empty url cell): Edit alone — Rename/Clear are no-ops with no value', () => {
    const m = cellMenuModel({ kind: 'link', filled: false })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([['Edit', 'cell:edit']])
  })

  it('hideable (cards) appends a separated Remove after the base items', () => {
    const m = cellMenuModel({ kind: 'clear-only', hideable: true })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([
      ['Clear', 'cell:clear'],
      ['Remove', 'cell:hide'],
    ])
    expect(m.items.find((i) => i.action === 'cell:hide')?.separatorBefore).toBe(true)
  })

  it('remove-only (a hideable cell with no other menu): Remove alone, no separator', () => {
    const m = cellMenuModel({ kind: 'remove-only', hideable: true })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([['Remove', 'cell:hide']])
    expect(m.items[0].separatorBefore).toBe(false)
  })

  it('hideable style-only with no base item (checkbox): Remove does NOT self-separate', () => {
    // main/cellMenu inserts the Style▸↔items divider once Remove lands in items, so Remove keying on
    // its own separator too would double it. Style present + Remove, single divider.
    const m = cellMenuModel({ kind: 'style-only', type: 'checkbox', current: {}, hideable: true })
    expect(m.items.map((i) => [i.label, i.action])).toEqual([['Remove', 'cell:hide']])
    expect(m.items[0].separatorBefore).toBe(false)
    expect(m.style).toBeDefined()
  })

  it('a hideable title never gets Remove — the title can never be dropped', () => {
    const m = cellMenuModel({ kind: 'title', hideable: true })
    expect(m.items.some((i) => i.action === 'cell:hide')).toBe(false)
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
    expect(cellMenuContextFor(prop(), 'file', {}, true, false, false, true)).toEqual({
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

  it('checkbox/number/last_edited_time → style-only with no Clear', () => {
    expect(cellMenuContextFor(prop(), 'number', {}, true)).toEqual({
      kind: 'style-only',
      type: 'number',
      current: {},
    })
  })

  it('number carries barCapable only when a bar can render (gates the Bar look)', () => {
    expect(cellMenuContextFor(prop(), 'number', {}, true, false, true)).toEqual({
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
    expect(cellMenuContextFor(prop(), 'select', {}, true, true)).toEqual({
      kind: 'clear-only',
      hideable: true,
    })
    // Empty select would be null (no menu) — but hideable still needs a Remove: remove-only MUST carry
    // the hideable flag, or the model appends nothing and the menu never pops (the composition seam).
    const ctx = cellMenuContextFor(prop(), 'select', {}, false, true)
    expect(ctx).toEqual({ kind: 'remove-only', hideable: true })
    expect(cellMenuModel(ctx as CellMenuContext).items.map((i) => i.action)).toEqual(['cell:hide'])
    expect(cellMenuContextFor(prop(), undefined, {}, true, true)).toEqual({
      kind: 'remove-only',
      hideable: true,
    })
  })
})
