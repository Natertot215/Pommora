// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PreviewRulesRow } from './PreviewRulesRow'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { makeTree } from '../Testing/testTree'
import type { FilterGroup, FilterRule, StandaloneFilter } from '../Views/filterRules'
import { RESERVED_PROPERTY_ID } from '../Properties/properties'
import { RESERVED_LABEL } from '../Properties/Cells/columnLabel'
import * as x from './settings-rows.css'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const titleRule: FilterRule = {
  property_id: RESERVED_PROPERTY_ID.title,
  op: 'contains',
  value: 'a',
}
const createdRule: FilterRule = { property_id: RESERVED_PROPERTY_ID.createdAt, op: 'is_empty' }

const render = async (openInPreview?: StandaloneFilter): Promise<void> => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
  })
  useSession.setState({
    tree: makeTree({
      personalization: openInPreview ? { openInPreview } : {},
      registry: [{ id: 'prop_mood', name: 'Mood', type: 'text' }],
    }),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <PreviewRulesRow
        label="Open In Preview"
        hint="Pages matching these rules open within preview windows by default."
      />,
    ),
  )
}

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
})

const stored = (): unknown => useSession.getState().tree?.config.personalization.openInPreview
const click = async (el: Element | undefined): Promise<void> => {
  await act(async () => (el as HTMLElement).click())
}
const byLabel = (label: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`))
const manage = (): HTMLButtonElement =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Manage',
  ) as HTMLButtonElement
const offered = (): (string | null)[] =>
  [...document.querySelectorAll('[data-picker-portal] *')].map((el) => el.textContent)
const option = (text: string): Element | undefined =>
  [...document.querySelectorAll('[data-picker-portal] *')]
    .filter((el) => el.textContent === text)
    .at(-1)

describe('PreviewRulesRow', () => {
  it('the count reads the rule count', async () => {
    await render({ rules: { match: 'any', rules: [titleRule, createdRule] }, enabled: true })
    expect(host.querySelector(`.${x.manageCluster}`)?.firstElementChild?.textContent).toBe('2')
  })

  it('adding a rule through the pane writes the key', async () => {
    await render()
    await click(manage())
    await click(byLabel('Filter property')[0])
    await click(option(RESERVED_LABEL[RESERVED_PROPERTY_ID.createdAt]))
    expect(stored()).toEqual({
      rules: {
        match: 'any',
        rules: [expect.objectContaining({ property_id: RESERVED_PROPERTY_ID.createdAt })],
      },
      enabled: true,
    })
  })

  it('turning the footer Off keeps the rules and writes enabled: false', async () => {
    const rules: FilterGroup = { match: 'any', rules: [titleRule] }
    await render({ rules, enabled: true })
    await click(manage())
    await click(byLabel('Filter active')[0])
    expect(stored()).toEqual({ rules, enabled: false })
  })

  it('clearing the last rule with the filter on stores no key', async () => {
    await render({ rules: { match: 'any', rules: [titleRule] }, enabled: true })
    await click(manage())
    await click(byLabel('Remove filter')[0])
    await act(async () => {
      await new Promise((r) => setTimeout(r, 260))
    })
    expect(stored()).toBeUndefined()
  })

  it('offers Title, Location, Created, and each Context, and neither Last Modified nor a user property', async () => {
    await render()
    await click(manage())
    await click(byLabel('Filter property')[0])
    const labels = offered()
    for (const t of ['Title', 'Location', RESERVED_LABEL[RESERVED_PROPERTY_ID.createdAt], 'Realms'])
      expect(labels).toContain(t)
    expect(labels).not.toContain(RESERVED_LABEL[RESERVED_PROPERTY_ID.modifiedAt])
    expect(labels).not.toContain('Mood')
  })
})
