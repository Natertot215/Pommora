// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode, NexusTree } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { FilterFrame, type FilterView } from './FilterFrame'
import { mountEachTest } from '../../Testing/viewHarness'
import { linkedSpacesTree } from '../../Testing/testTree'
import { itemPicked, menuCompact } from '@pommora/uix/Menus/menu-row.css'
import { FILEDATA_TARGETS } from '../paneTargets'
import { useSession } from '../../Session/store'

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  label: 'Status',
  key: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'g1',
      label: 'Open',
      color: 'gray',
      options: [
        { id: 'opt_todo', key: 'todo', label: 'todo' },
        { id: 'opt_done', key: 'done', label: 'done' },
      ],
    },
  ],
}
const checkDef: PropertyDefinition = {
  id: 'prop_check',
  label: 'Archived',
  key: 'Archived',
  type: 'checkbox',
}
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
afterEach(() => {
  document.body.innerHTML = ''
})
mountEachTest((h, r) => {
  host = h
  root = r
})
let saveSpy: ReturnType<typeof vi.fn<(next: FilterView) => void>>

// The pane's backend: each commit lands on the held view and redraws, as the view store and the Matrix store both do.
let current: SavedView
let currentTree: NexusTree | null
let seams: Pick<React.ComponentProps<typeof FilterFrame>, 'back' | 'targets'>
const frame = (): React.JSX.Element => (
  <FilterFrame
    locations={source.sets}
    view={current}
    read={() => current}
    schema={schema}
    tree={currentTree}
    {...seams}
    onCommit={(patch) => {
      current = { ...current, ...patch }
      saveSpy(current)
      root.render(frame())
    }}
  />
)
const mount = async (v: SavedView, tree: NexusTree | null = null): Promise<void> => {
  current = v
  currentTree = tree
  await act(async () => {
    root.render(frame())
  })
}
const texts = (): string => host.textContent ?? ''
const click = async (el: Element | null | undefined): Promise<void> => {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}
/** Let a disclosure beat elapse — a closing picker animates out, and a newly added row mounts collapsed for one frame, which jsdom does not flush inside act(). */
const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 260))
  })
}

const byLabel = (label: string): Element | undefined =>
  [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label)

const optionWithText = (t: string): Element | undefined =>
  [...document.querySelectorAll('[data-picker-portal] button, [data-picker-portal] [role]')]
    .concat([...document.body.querySelectorAll('button')])
    .filter((el) => el.textContent === t)
    .at(-1)

beforeEach(() => {
  saveSpy = vi.fn<(next: FilterView) => void>()
  seams = { back: { label: 'Settings', onBack: () => {} } }
})

const lastSaved = (): FilterView => saveSpy.mock.calls.at(-1)?.[0] as FilterView

const twoRules = (): SavedView =>
  view({
    filter: {
      match: 'all',
      rules: [
        { property_id: 'prop_status', op: 'is', values: ['opt_todo'] },
        { property_id: 'prop_check', op: 'is', value: 'true' },
      ],
    },
  })

describe('FilterFrame', () => {
  it('renders the match mode + a row per decoded rule', async () => {
    await mount(twoRules())
    expect(texts()).not.toContain('Matches')
    expect(texts()).toContain('All')
    expect(texts()).toContain('Status')
    expect(texts()).toContain('Archived')
    expect(texts()).toContain('Is Checked')
  })

  it('the pane carries the compact row rule itself, whatever hosts it', async () => {
    await mount(twoRules())
    const pane = host.firstElementChild
    expect(pane?.classList.contains(menuCompact)).toBe(true)
    expect(pane?.contains(byLabel('Filter property') ?? null)).toBe(true)
  })

  it('the footer switch parks the filter without touching its rules or mode', async () => {
    await mount(twoRules())
    await click(byLabel('Filter active'))
    const saved = lastSaved()
    expect(saved.filter_enabled).toBe(false)
    expect(saved.filter).toEqual(twoRules().filter)
  })

  it('parked rows stay live', async () => {
    await mount(view({ ...twoRules(), filter_enabled: false }))
    expect(byLabel('Matches')).toBeTruthy()
  })

  it('a back row leads the pane when given, and none stands without it', async () => {
    const onBack = vi.fn()
    seams = { back: { label: 'Settings', onBack } }
    await mount(view())
    expect(texts()).toContain('Filtering')
    await click([...host.querySelectorAll('*')].find((el) => el.textContent === 'Settings'))
    expect(onBack).toHaveBeenCalledOnce()
    seams = {}
    await mount(view())
    expect(texts()).not.toContain('Filtering')
  })

  it('a supplied target list replaces the derived one', async () => {
    seams = { targets: [FILEDATA_TARGETS.title] }
    await mount(view())
    await click(byLabel('Filter property'))
    const offered = [...document.querySelectorAll('[data-picker-portal] *')].map(
      (el) => el.textContent,
    )
    expect(offered).toContain('Title')
    expect(offered).not.toContain('Archived')
  })

  it('a hand-authored filter can still be parked, not just reset', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: 'prop_status', op: 'is', value: 'opt_todo' },
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
    await click(byLabel('Matches'))
    expect(saveSpy).not.toHaveBeenCalled()
    expect(byLabel('Matches')?.textContent).toContain('All')
    await click(byLabel('Filter property'))
    await click(
      optionWithText('Archived') ??
        [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
    )
    expect(lastSaved().filter).toEqual({
      match: 'all',
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

  it('a drafted rule appends under the footer mode', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [{ property_id: 'prop_status', op: 'is', values: ['opt_todo'] }],
        },
      }),
    )
    await click(byLabel('Add filter rule'))
    await settle()
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
      match: 'all',
      rules: [
        { property_id: 'prop_status', op: 'is', values: ['opt_todo'] },
        { property_id: 'prop_check', op: 'is', value: 'true' },
      ],
    })
  })

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

  // The second write re-serializes the whole rule list, so it must re-read the rows at call time rather than a snapshot predating the first write.
  it('a blur-committed value survives a second write to the filter itself', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: '_title', op: 'is' },
            { property_id: 'prop_status', op: 'is', value: 'opt_todo' },
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
    await click(byLabel('Matches'))
    expect(lastSaved().filter).toEqual({
      match: 'any',
      rules: [
        { property_id: '_title', op: 'is', value: 'urgent' },
        { property_id: 'prop_status', op: 'is', value: 'opt_todo' },
      ],
    })
  })

  it('two removals in one beat both stick', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: '_title', op: 'is', value: 'a' },
            { property_id: 'prop_status', op: 'is', value: 'opt_todo' },
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

  it('an uncommitted value is discarded when the pane unmounts', async () => {
    await mount(view({ filter: { match: 'all', rules: [{ property_id: '_title', op: 'is' }] } }))
    const input = host.querySelector('input')
    await act(async () => {
      if (input) input.value = 'stranded'
    })
    await act(() => root.unmount())
    expect(saveSpy).not.toHaveBeenCalled()
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
    expect(lastSaved().filter).toBeUndefined()
    await mount(view({ filter: lastSaved().filter }))
    expect(host.querySelector('[aria-label="Remove filter"]')).toBeNull()
    expect(host.querySelector('[class*="ruleRow"]')).not.toBeNull()
  })

  it('a locked tree renders Reset and no rule grid; Reset clears the slot', async () => {
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: 'prop_status', op: 'is', value: 'opt_todo' },
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
      match: 'any',
      rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }],
    })
  })

  describe('a rule’s ×', () => {
    const textRules = (): SavedView =>
      view({
        filter: {
          match: 'all',
          rules: [
            { property_id: '_title', op: 'is' },
            { property_id: '_title', op: 'contains' },
          ],
        },
      })
    const removes = (): HTMLElement[] => [
      ...host.querySelectorAll<HTMLElement>('[aria-label="Remove filter"]'),
    ]
    const typeInto = async (input: HTMLInputElement, text: string): Promise<void> => {
      await act(async () => {
        input.focus()
        input.value = text
      })
    }
    // A press the × doesn't prevent moves focus off the field, as a browser does before the click.
    const press = async (el: HTMLElement): Promise<void> => {
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      await act(async () => {
        el.dispatchEvent(down)
        if (!down.defaultPrevented) (document.activeElement as HTMLElement | null)?.blur()
      })
      await click(el)
    }

    it('keeps focus where it is on a press, on a rule and on the draft', async () => {
      await mount(textRules())
      await click(byLabel('Add filter rule'))
      await settle()
      expect(removes()).toHaveLength(3)
      for (const x of removes()) {
        const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        x.dispatchEvent(down)
        expect(down.defaultPrevented).toBe(true)
      }
    })

    it('removing one rule leaves a neighbour’s field mid-edit where it stands', async () => {
      await mount(textRules())
      const second = host.querySelectorAll('input')[1]
      await typeInto(second, 'foo')
      await press(removes()[0])
      expect(host.querySelectorAll('input')[0]).toBe(second)
      expect(document.activeElement).toBe(second)
      expect(second.value).toBe('foo')
      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(lastSaved().filter?.rules).toEqual([{ property_id: '_title', op: 'contains' }])
    })

    it('removing a rule mid-edit discards its edit', async () => {
      await mount(textRules())
      await typeInto(host.querySelectorAll('input')[0], 'foo')
      await press(removes()[0])
      expect(host.querySelectorAll('input')).toHaveLength(1)
      expect(host.querySelector('input')?.value).toBe('')
      expect(saveSpy).toHaveBeenCalledTimes(1)
    })

    it('a rule added from elsewhere leaves the rows already there and a field mid-edit standing', async () => {
      await mount(textRules())
      const second = host.querySelectorAll('input')[1]
      await typeInto(second, 'foo')
      const rules = textRules().filter?.rules ?? []
      await mount(
        view({
          filter: { match: 'all', rules: [...rules, { property_id: '_title', op: 'is' }] },
        }),
      )
      expect(host.querySelectorAll('input')).toHaveLength(3)
      expect(host.querySelectorAll('input')[1]).toBe(second)
      expect(second.value).toBe('foo')
    })

    it('the draft row’s reveal holds the rule it picks', async () => {
      await mount(textRules())
      await click(byLabel('Add filter rule'))
      await settle()
      const drafted = [...host.querySelectorAll('[data-reveal]')].at(-1)
      await click(
        [...host.querySelectorAll('button')]
          .filter((b) => b.getAttribute('aria-label') === 'Filter property')
          .at(-1),
      )
      await click(
        optionWithText('Archived') ??
          [...document.querySelectorAll('*')].filter((el) => el.textContent === 'Archived').at(-1),
      )
      expect(lastSaved().filter?.rules).toHaveLength(3)
      expect([...host.querySelectorAll('[data-reveal]')].at(-1)).toBe(drafted)
      expect(drafted?.textContent).toContain('Archived')
    })
  })

  it('removing the first of two rows writes the remaining rule at once', async () => {
    await mount(twoRules())
    await click(
      [...host.querySelectorAll('button')]
        .filter((b) => b.getAttribute('aria-label') === 'Remove filter')
        .at(0),
    )
    // The write lands immediately; deferring it would fire against state captured at click time.
    expect(lastSaved().filter).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_check', op: 'is', value: 'true' }],
    })
  })

  it('a date operand opens on its column’s clock, not the Nexus’s, and offers no End Date', async () => {
    const due: PropertyDefinition = { id: 'prop_due', label: 'Due', key: 'Due', type: 'dateTime' }
    useSession.setState({
      tree: { config: { registry: [], personalization: { timeFormat: 'twelveHour' } } } as never,
    })
    current = view({
      filter: {
        match: 'all',
        rules: [{ property_id: 'prop_due', op: 'is', value: '2026-10-22T15:30' }],
      },
      column_styles: { prop_due: { time_format: 'twentyFourHour' } },
    })
    await act(async () => {
      root.render(
        <FilterFrame
          locations={[]}
          view={current}
          read={() => current}
          schema={[due]}
          tree={null}
          onCommit={() => {}}
        />,
      )
    })
    await click(byLabel('Filter date'))
    const pane =
      document.querySelector('[data-picker-portal]:not([data-dismissal-shield])')?.textContent ?? ''
    expect(pane).toContain('15:30')
    expect(pane).not.toMatch(/\b(AM|PM)\b/)
    expect(pane).not.toContain('End Date')
  })
})

const locationField = (): HTMLInputElement =>
  host.querySelector('input[aria-label="Filter values"]') as HTMLInputElement
const focusLocation = async (): Promise<void> => {
  await act(async () => {
    locationField().focus()
  })
}
const typeLocation = async (text: string): Promise<void> => {
  // React reads the value off its own tracker, so a bare assignment looks like no change at all.
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setValue?.call(locationField(), text)
    locationField().dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const pressEnter = async (): Promise<void> => {
  await act(async () => {
    locationField().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
}
const pressKey = async (key: string): Promise<void> => {
  await act(async () => {
    locationField().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
}
const blurLocation = async (): Promise<void> => {
  await act(async () => {
    locationField().blur()
  })
}
const pressLocation = async (): Promise<void> => {
  await act(async () => {
    locationField().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })
}
const pickerRows = (): string[] =>
  [...document.querySelectorAll('[data-picker-portal] [role="button"]')].map(
    (el) => el.textContent ?? '',
  )

describe('FilterFrame location field', () => {
  const folder = (id: string, title: string, sets: unknown[] = []) => ({
    kind: 'set',
    id,
    title,
    path: title,
    sets,
    pages: [],
  })
  beforeEach(() => {
    Object.assign(source, {
      sets: [
        folder('p1', 'Projects', [folder('d1', 'Docs'), folder('n1', 'Notes')]),
        folder('a1', 'Archive'),
      ],
    })
  })
  afterEach(() => {
    Object.assign(source, { sets: [] })
  })
  const locationRule = (op: string, values?: string[]): SavedView =>
    view({
      filter: {
        match: 'any',
        rules: [{ property_id: '_location', op, ...(values ? { values } : {}) }],
      },
    })
  const savedValues = (): unknown =>
    ((lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>).values

  it('focusing the field opens the picker unfiltered', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    expect(pickerRows()).toEqual(['Projects', 'Archive'])
  })

  it('typing narrows the picker to matching folders with their ancestors open', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('note')
    expect(pickerRows()).toEqual(['Projects', 'Notes'])
  })

  it('typing a parent and a child narrows to the child under its parent', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('projects/docs')
    expect(pickerRows()).toEqual(['Projects', 'Docs'])
  })

  it('Enter under Contains adds the typed name and clears the draft, even one naming a folder', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('Docs')
    await pressEnter()
    expect(savedValues()).toEqual(['Docs'])
    expect(locationField().value).toBe('')
  })

  it('Enter under Is adds nothing', async () => {
    await mount(locationRule('is'))
    await focusLocation()
    await typeLocation('Docs')
    await pressEnter()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('a name equal by fold to a shown one is not added twice', async () => {
    await mount(locationRule('is_inside', ['Docs']))
    await focusLocation()
    await typeLocation('docs')
    await pressEnter()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('a picked folder joins the values and clears the draft', async () => {
    await mount(locationRule('is_inside', ['Docs']))
    await focusLocation()
    await typeLocation('doc')
    await click(optionWithText('Docs'))
    expect(savedValues()).toEqual(['Docs', 'd1'])
    expect(locationField().value).toBe('')
  })

  it('pressing the field opens the picker', async () => {
    await mount(locationRule('is_inside'))
    await pressLocation()
    expect(pickerRows()).toEqual(['Projects', 'Archive'])
  })

  it('Escape and blur each close the picker and clear the draft', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('doc')
    await pressKey('Escape')
    await settle()
    expect(pickerRows()).toEqual([])
    expect(locationField().value).toBe('')
    await typeLocation('doc')
    await blurLocation()
    await settle()
    expect(pickerRows()).toEqual([])
    expect(locationField().value).toBe('')
  })

  it('a press on the caret reopens the picker after Escape', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await pressKey('Escape')
    await settle()
    await pressLocation()
    expect(pickerRows()).toEqual(['Projects', 'Archive'])
  })

  it("a chip's × removes it while the picker stays open", async () => {
    await mount(locationRule('is_inside', ['d1', 'Docs']))
    await focusLocation()
    const remove = host.querySelector('button[aria-label="Remove"]') as HTMLElement
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    await act(async () => {
      remove.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
      remove.dispatchEvent(down)
    })
    await click(remove)
    expect(down.defaultPrevented).toBe(true)
    expect(savedValues()).toEqual(['Docs'])
    await settle()
    expect(pickerRows()).toEqual(['Projects', 'Archive'])
  })

  it('ArrowDown then Enter picks the highlighted folder under Is', async () => {
    await mount(locationRule('is'))
    await focusLocation()
    await pressKey('ArrowDown')
    await pressKey('ArrowDown')
    await pressEnter()
    expect(savedValues()).toEqual(['a1'])
  })

  it('typing drops the highlight, so Enter under Contains adds the name', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('doc')
    await pressKey('ArrowDown')
    await typeLocation('docs')
    await pressEnter()
    expect(savedValues()).toEqual(['docs'])
  })

  it("narrowing to a folder's name reaches its subfolders, open until collapsed", async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('proj')
    expect(pickerRows()).toEqual(['Projects', 'Docs', 'Notes'])
    await act(async () => {
      document
        .querySelector('[data-picker-portal] [data-drop-outline]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await settle()
    expect(pickerRows()).toEqual(['Projects'])
  })

  it('a lead collapsed under one draft opens again under another', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('note')
    expect(pickerRows()).toEqual(['Projects', 'Notes'])
    await act(async () => {
      document
        .querySelector('[data-picker-portal] [data-drop-outline]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await settle()
    expect(pickerRows()).toEqual(['Projects'])
    await typeLocation('not')
    await settle()
    expect(pickerRows()).toEqual(['Projects', 'Notes'])
  })

  it('a draft that matches nothing hides the picker', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('zzz')
    await settle()
    expect(document.querySelector('[data-picker-portal]')).toBeNull()
  })

  it('Escape over a draft that matches nothing closes the field, not the surface beneath', async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await typeLocation('zzz')
    const press = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    await act(async () => {
      locationField().dispatchEvent(press)
    })
    expect(press.defaultPrevented).toBe(true)
    expect(locationField().value).toBe('')
  })

  it("the tree's expansion survives the picker reopening", async () => {
    await mount(locationRule('is_inside'))
    await focusLocation()
    await act(async () => {
      document
        .querySelector('[data-picker-portal] [data-drop-outline]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(pickerRows()).toEqual(['Projects', 'Docs', 'Notes', 'Archive'])
    await pressKey('Escape')
    await settle()
    await pressLocation()
    expect(pickerRows()).toEqual(['Projects', 'Docs', 'Notes', 'Archive'])
  })

  it('switching Contains to Is keeps picked folders and drops names', async () => {
    await mount(locationRule('is_inside', ['d1', 'Docs']))
    await click(byLabel('Filter operator'))
    await click(optionWithText('Is'))
    expect(lastSaved().filter?.rules[0]).toEqual({
      property_id: '_location',
      op: 'is',
      values: ['d1'],
    })
    await mount(locationRule('is_inside', ['Docs']))
    await click(byLabel('Filter operator'))
    await click(optionWithText('Is'))
    expect(lastSaved().filter?.rules[0]).toEqual({ property_id: '_location', op: 'is' })
  })
})

describe('FilterFrame value editors', () => {
  it('location picks join into one ring across siblings, and an expanded parent ends the run', async () => {
    const set = (id: string, sets: unknown[] = []) => ({
      kind: 'set',
      id,
      title: id,
      path: id,
      sets,
      pages: [],
    })
    Object.assign(source, { sets: [set('A', [set('A1')]), set('B'), set('C')] })
    await mount(
      view({
        filter: {
          match: 'all',
          rules: [{ property_id: '_location', op: 'is', values: ['A', 'B', 'C'] }],
        },
      }),
    )
    await pressLocation()
    const row = (t: string): string => optionWithText(t)?.className ?? ''
    expect([row('A'), row('B'), row('C')]).toEqual([
      expect.stringContaining(itemPicked.first),
      expect.stringContaining(itemPicked.middle),
      expect.stringContaining(itemPicked.last),
    ])
    await act(async () => {
      document
        .querySelector('[data-picker-portal] [data-drop-outline]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect([row('A'), row('B'), row('C')]).toEqual([
      expect.stringContaining(itemPicked.solo),
      expect.stringContaining(itemPicked.first),
      expect.stringContaining(itemPicked.last),
    ])
    Object.assign(source, { sets: [] })
  })

  it('the chips picker toggles values[] and stays open — never a value key', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: 'prop_status', op: 'is' }] } }),
    )
    await click(host.querySelector('[aria-label="Filter values"]'))
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'todo').at(-1),
    )
    let rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['opt_todo'])
    expect('value' in rule).toBe(false)
    await mount(view({ filter: lastSaved().filter }))
    await click(host.querySelector('[aria-label="Filter values"]'))
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'done').at(-1),
    )
    rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['opt_todo', 'opt_done'])
  })

  const contextRule = view({
    filter: { match: 'all', rules: [{ property_id: 'g1', op: 'contains_any' }] },
  })

  it('a Context rule lists its Spaces with their icons', async () => {
    const tree = linkedSpacesTree()
    tree.contexts[0].spaces[0].icon = 'hash'
    await mount(contextRule, tree)
    await click(host.querySelector('[aria-label="Filter values"]'))
    const row = [...document.querySelectorAll('[role="button"]')].find(
      (el) => el.textContent === 'Work',
    )
    expect(row).toBeDefined()
    expect(row?.querySelector('.lucide-hash')).not.toBeNull()
  })

  it('a Context with no Spaces says so', async () => {
    const tree = linkedSpacesTree()
    tree.contexts[0].spaces = []
    await mount(contextRule, tree)
    await click(host.querySelector('[aria-label="Filter values"]'))
    expect(document.body.textContent).toContain('No options yet.')
  })

  it('two rapid picks inside the refetch window accumulate — the second never drops the first', async () => {
    await mount(
      view({ filter: { match: 'all', rules: [{ property_id: 'prop_status', op: 'is' }] } }),
    )
    await click(host.querySelector('[aria-label="Filter values"]'))
    // No remount between the two clicks — the stale-prop window the optimistic accumulator covers.
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'todo').at(-1),
    )
    await click(
      [...document.querySelectorAll('*')].filter((el) => el.textContent === 'done').at(-1),
    )
    const rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.values).toEqual(['opt_todo', 'opt_done'])
  })

  it('a checkbox rule renders no value editor and its operator carries the clause', async () => {
    await mount(
      view({
        filter: { match: 'all', rules: [{ property_id: 'prop_check', op: 'is', value: 'no' }] },
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
        input.focus()
        input.value = 'idea'
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
    })
    const rule = (lastSaved().filter as { rules: unknown[] }).rules[0] as Record<string, unknown>
    expect(rule.value).toBe('idea')
  })
})
