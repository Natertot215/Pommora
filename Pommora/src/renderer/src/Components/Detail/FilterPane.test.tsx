// @vitest-environment jsdom
// State-level pane tests: decode → row stack, the wholesale write shapes, and the two independent
// axes (match mode vs parked). Visual truth = CDP.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { useSession } from '../../store'
import { FilterPane } from './FilterPane'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'g1',
      label: 'Open',
      color: 'gray',
      options: [
        { value: 'todo', label: 'Todo', group_id: 'g1' },
        { value: 'done', label: 'Done', group_id: 'g1' },
      ],
    },
  ],
}
const checkDef: PropertyDefinition = { id: 'prop_check', name: 'Archived', type: 'checkbox' }
const schema = [statusDef, checkDef]

const view = (over?: Partial<SavedView>): SavedView => ({
  id: 'view_1',
  name: 'Table',
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
  ...over,
})

const source = {
  kind: 'collection',
  id: 'col1',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages: [],
  properties: schema,
} as unknown as CollectionNode

let host: HTMLDivElement
let root: Root
let saveSpy: ReturnType<typeof vi.fn>

const mount = async (v: SavedView): Promise<void> => {
  await act(async () => {
    root.render(
      <FilterPane
        source={source}
        view={v}
        schema={schema}
        tree={null}
        label="Settings"
        onBack={() => {}}
      />,
    )
  })
}
const texts = (): string => host.textContent ?? ''
const click = async (el: Element | null | undefined): Promise<void> => {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}
/** Let a disclosure beat elapse — a removal animates before it writes, and a newly added row mounts
 *  collapsed for one frame, which jsdom does not flush inside act(). */
const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 260))
  })
}

const byLabel = (label: string): Element | undefined =>
  [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label)

// PickerMenu portals to body — options are queried document-wide.
const optionWithText = (t: string): Element | undefined =>
  [...document.querySelectorAll('[data-picker-portal] button, [data-picker-portal] [role]')]
    .concat([...document.body.querySelectorAll('button')])
    .filter((el) => el.textContent === t)
    .at(-1)

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  saveSpy = vi.fn(async () => ({ ok: true }))
  ;(window as unknown as { nexus: unknown }).nexus = {
    views: { save: saveSpy },
    activeViews: { set: vi.fn(async () => {}) },
  }
  useSession.setState({ load: vi.fn(async () => {}) as never })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

const lastSaved = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

const twoRules = (): SavedView =>
  view({
    filter: {
      match: 'all',
      rules: [
        { property_id: 'prop_status', op: 'is', values: ['todo'] },
        { property_id: 'prop_check', op: 'is', value: 'true' },
      ],
    },
  })

describe('FilterPane', () => {
  it('renders the match mode + a row per decoded rule', async () => {
    await mount(twoRules())
    // The mode control carries no visible label — its value IS the label (All / Any).
    expect(texts()).not.toContain('Matches')
    expect(texts()).toContain('All')
    expect(texts()).toContain('Status')
    expect(texts()).toContain('Archived')
    expect(texts()).toContain('Is Checked')
  })

  it('the footer switch parks the filter without touching its rules or mode', async () => {
    await mount(twoRules())
    await click(byLabel('Filter active'))
    const saved = lastSaved()
    expect(saved.filter_enabled).toBe(false)
    expect(saved.filter).toEqual(twoRules().filter)
  })

  // Parking is exactly when you want to keep authoring — the table just stops reacting.
  it('parked rows stay live', async () => {
    await mount(view({ ...twoRules(), filter_enabled: false }))
    expect(byLabel('Matches')).toBeTruthy()
    expect(byLabel('Toggle connector')).toBeTruthy()
  })

  it('a hand-authored filter can still be parked, not just reset', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: 'prop_status', op: 'is', value: 'todo' },
            { match: 'any', rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }] },
          ],
        },
      }),
    )
    expect(texts()).toContain('Hand-authored filter')
    expect(byLabel('Filter active')).toBeTruthy()
  })

  it('a mode picked on an empty filter sticks and lands on the first rule', async () => {
    await mount(view())
    // Two options, so the control flips in place — no menu to open.
    await click(byLabel('Matches'))
    expect(saveSpy).not.toHaveBeenCalled()
    expect(byLabel('Matches')?.textContent).toContain('Any')
    await click(byLabel('Filter property'))
    await click(
      optionWithText('Archived') ??
        [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
    )
    expect(lastSaved().filter).toEqual({
      match: 'any',
      rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }],
    })
  })

  it('the match toggle flips the mode without touching whether the filter runs', async () => {
    await mount(twoRules())
    await click(byLabel('Matches'))
    expect(lastSaved().filter?.match).toBe('any')
    expect(lastSaved().filter_enabled).toBeUndefined()
  })

  it('picking a mode while parked leaves the filter parked', async () => {
    await mount(view({ ...twoRules(), filter_enabled: false }))
    await click(byLabel('Matches'))
    expect(lastSaved().filter?.match).toBe('any')
    expect(lastSaved().filter_enabled).toBe(false)
  })

  // The Or is what splits the list into runs, so flipping it on the DRAFT is how a group boundary
  // gets authored before the rule is written.
  it("the draft's connector toggles, and its Or splits the run on completion", async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [{ property_id: 'prop_status', op: 'is', values: ['todo'] }],
        },
      }),
    )
    await click(byLabel('Add filter rule'))
    await settle()
    const connectors = [...host.querySelectorAll('button')].filter(
      (b) => b.getAttribute('aria-label') === 'Toggle connector',
    )
    // Row 0 carries no connector, so the draft's is the only one.
    expect(connectors.length).toBe(1)
    await click(connectors.at(-1))
    expect(saveSpy).not.toHaveBeenCalled()
    // The draft's picker is the LAST one — the existing row carries its own.
    await click(
      [...host.querySelectorAll('button')]
        .filter((b) => b.getAttribute('aria-label') === 'Filter property')
        .at(-1),
    )
    await click(
      optionWithText('Archived') ??
        [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
    )
    expect(lastSaved().filter).toEqual({
      match: 'any',
      rules: [
        { property_id: 'prop_status', op: 'is', values: ['todo'] },
        { property_id: 'prop_check', op: 'is', value: 'true' },
      ],
    })
  })

  // Two writes in one gesture — a value's blur-commit, then the click that caused it — must not
  // both build from the same pre-save render prop, or the second silently drops the first.
  it('a value committed on blur survives the click that caused the blur', async () => {
    await mount(view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is' }] } }))
    const input = host.querySelector('input')
    expect(input).toBeTruthy()
    await act(async () => {
      if (input) {
        input.focus()
        input.value = 'urgent'
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      }
    })
    await click(byLabel('Filter active'))
    const saved = lastSaved()
    expect(saved.filter_enabled).toBe(false)
    expect(saved.filter?.rules).toEqual([{ property_id: '_title', op: 'is', value: 'urgent' }])
  })

  // The same gesture, but the second write lands on the SAME axis. Sharing `filter` is the harder
  // case: the base object alone isn't enough, because the second write re-serializes the whole rule
  // list — from a snapshot that predates the first unless the rows are re-read at call time.
  it('a blur-committed value survives a second write to the filter itself', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: '_title', op: 'is' },
            { property_id: 'prop_status', op: 'is', value: 'todo' },
          ],
        },
      }),
    )
    const input = host.querySelector('input')
    await act(async () => {
      if (input) {
        input.focus()
        input.value = 'urgent'
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      }
    })
    // Flipping a connector rewrites `filter` wholesale — the value must still be in it.
    await click(byLabel('Toggle connector'))
    expect(lastSaved().filter).toEqual({
      match: 'any',
      rules: [
        { property_id: '_title', op: 'is', value: 'urgent' },
        { property_id: 'prop_status', op: 'is', value: 'todo' },
      ],
    })
  })

  // Two removals in one beat: the second must map against a snapshot that already reflects the first.
  it('two removals in one beat both stick', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: '_title', op: 'is', value: 'a' },
            { property_id: 'prop_status', op: 'is', value: 'todo' },
            { property_id: 'prop_check', op: 'is', value: 'true' },
          ],
        },
      }),
    )
    const removes = [...host.querySelectorAll('[aria-label="Remove filter"]')]
    expect(removes.length).toBe(3)
    await click(removes[2])
    await click(removes[1])
    expect(lastSaved().filter).toEqual({
      match: 'all',
      rules: [{ property_id: '_title', op: 'is', value: 'a' }],
    })
  })

  it('an uncommitted value flushes when the pane unmounts', async () => {
    await mount(view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is' }] } }))
    const input = host.querySelector('input')
    await act(async () => {
      if (input) input.value = 'stranded'
    })
    await act(() => root.unmount())
    expect(lastSaved().filter?.rules).toEqual([
      { property_id: '_title', op: 'is', value: 'stranded' },
    ])
    root = createRoot(host) // afterEach unmounts again
  })

  it('a value edited after an earlier commit still flushes on unmount', async () => {
    await mount(view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is' }] } }))
    await act(async () => {
      const first = host.querySelector('input')
      if (first) {
        first.focus()
        first.value = 'one'
        first.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      }
    })
    // The commit re-keys the input; re-query rather than reusing the detached node.
    await mount(
      view({
        filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'one' }] },
      }),
    )
    await act(async () => {
      const second = host.querySelector('input')
      if (second) second.value = 'two'
    })
    await act(() => root.unmount())
    expect(lastSaved().filter?.rules).toEqual([{ property_id: '_title', op: 'is', value: 'two' }])
    root = createRoot(host)
  })

  it('every authored rule carries a clear-×, including the only one', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'a' }] } }),
    )
    expect(host.querySelectorAll('[aria-label="Remove filter"]').length).toBe(1)
    await mount(twoRules())
    expect(host.querySelectorAll('[aria-label="Remove filter"]').length).toBe(2)
  })

  it('clearing the only rule empties the filter and leaves the blank lead row', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'a' }] } }),
    )
    await click(host.querySelector('[aria-label="Remove filter"]'))
    // Zero rows serializes to no filter at all, not an empty group that would still be "a filter".
    expect(lastSaved().filter).toBeUndefined()
    await mount(view({ filter: lastSaved().filter }))
    expect(host.querySelector('[aria-label="Remove filter"]')).toBeNull()
    expect(host.querySelector('[class*="ruleRow"]')).not.toBeNull()
  })

  it('toggling a connector And→Or re-serializes to any-of-runs', async () => {
    await mount(twoRules())
    await click(
      [...host.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === 'Toggle connector',
      ),
    )
    expect(lastSaved().filter).toEqual({
      match: 'any',
      rules: [
        { property_id: 'prop_status', op: 'is', values: ['todo'] },
        { property_id: 'prop_check', op: 'is', value: 'true' },
      ],
    })
  })

  it('a locked tree renders Reset and no rule grid; Reset clears the slot', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: 'prop_status', op: 'is', value: 'todo' },
            { match: 'any', rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }] },
          ],
        },
      }),
    )
    expect(texts()).toContain('Hand-authored filter')
    expect(texts()).toContain('Reset Filter')
    expect(byLabel('Matches')).toBeUndefined()
    expect(byLabel('Filter active')).toBeTruthy()
    await click([...host.querySelectorAll('*')].find((el) => el.textContent === 'Reset Filter'))
    expect(lastSaved().filter).toBeUndefined()
  })

  it('an empty filter shows one blank lead row with no "+" needed, and no clear-×', async () => {
    await mount(view())
    expect(texts()).toContain('Where')
    expect(byLabel('Filter property')).toBeTruthy()
    expect(byLabel('Remove filter')).toBeUndefined()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('picking a property on the lead row writes the first operator', async () => {
    await mount(view())
    expect(saveSpy).not.toHaveBeenCalled()
    await click(
      [...host.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === 'Filter property',
      ),
    )
    await click(
      optionWithText('Archived') ??
        [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
    )
    expect(lastSaved().filter).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }],
    })
  })

  it('removing the first of two rows promotes the second to the lead slot', async () => {
    await mount(twoRules())
    await click(
      [...host.querySelectorAll('button')]
        .filter((b) => b.getAttribute('aria-label') === 'Remove filter')
        .at(0),
    )
    // The write lands immediately; the collapse plays against the still-live rows. Deferring it
    // would fire against state captured at click time and clobber anything committed in the beat.
    expect(lastSaved().filter).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }],
    })
  })
})

describe('FilterPane value editors', () => {
  it('the chips picker toggles values[] and stays open — never a value key', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: 'prop_status', op: 'is' }] } }),
    )
    await click(host.querySelector('[aria-label="Filter values"]'))
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Todo').at(-1),
    )
    let rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['todo'])
    expect('value' in rule).toBe(false)
    // Stays open: the second option is still clickable without reopening.
    await mount(view({ filter: lastSaved().filter }))
    await click(host.querySelector('[aria-label="Filter values"]'))
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Done').at(-1),
    )
    rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['todo', 'done'])
  })

  it('two rapid picks inside the refetch window accumulate — the second never drops the first', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: 'prop_status', op: 'is' }] } }),
    )
    await click(host.querySelector('[aria-label="Filter values"]'))
    // No remount between the two clicks — the stale-prop window the optimistic accumulator covers.
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Todo').at(-1),
    )
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Done').at(-1),
    )
    const rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['todo', 'done'])
  })

  it('a checkbox rule renders no value editor and its operator carries the clause', async () => {
    await mount(
      view({
        filter: { match: 'all', rules: [{ property_id: 'prop_check', op: 'is', value: 'false' }] },
      }),
    )
    expect(texts()).toContain("Isn't Checked")
    expect([...host.querySelectorAll('input')]).toHaveLength(0)
    // Tag-agnostic: the chips trigger is a div, so querying `button` would pass vacuously.
    expect(host.querySelector('[aria-label="Filter values"]')).toBeNull()
  })

  it('a text rule commits its input on Enter', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'contains' }] } }),
    )
    const input = host.querySelector('input')
    expect(input).toBeTruthy()
    await act(async () => {
      if (input) {
        input.value = 'idea'
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
    })
    const rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.value).toBe('idea')
  })
})
