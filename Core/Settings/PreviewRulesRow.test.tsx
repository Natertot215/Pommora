// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PreviewRulesRow } from './PreviewRulesRow'
import { useSession } from '../Session/store'
import { stubDialer } from '../vitest.setup'
import { makeTree } from '../Testing/testTree'
import type { FilterGroup, FilterRule, StandaloneFilter } from '../Views/filterRules'
import { FILEDATA } from '../Properties/properties'
import { trailingFigure } from '@pommora/uix/Menus/menu-row.css'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const titleRule: FilterRule = {
  property_id: FILEDATA.title.id,
  op: 'contains',
  value: 'a',
}
const createdRule: FilterRule = { property_id: FILEDATA.createdAt.id, op: 'is_empty' }

const render = async (openInPreview?: StandaloneFilter): Promise<void> => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
  })
  useSession.setState({
    tree: makeTree({
      personalization: openInPreview ? { openInPreview } : {},
      registry: [{ id: 'prop_mood', label: 'Mood', key: 'Mood', type: 'text' }],
    }),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <PreviewRulesRow
        row={{
          kind: 'previewRules',
          label: 'Open In Preview',
          caption: 'Pages matching these rules open within preview windows by default.',
        }}
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
    expect(host.getElementsByClassName(trailingFigure)[0]?.textContent).toBe('2')
  })

  it('adding a rule through the pane writes the key', async () => {
    await render()
    await click(manage())
    await click(byLabel('Filter property')[0])
    await click(option(FILEDATA.createdAt.label))
    expect(stored()).toEqual({
      rules: {
        match: 'any',
        rules: [expect.objectContaining({ property_id: FILEDATA.createdAt.id })],
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
    expect(stored()).toBeUndefined()
  })

  it('offers Title, Location, Created, and each Context, and neither Last Modified nor a user property', async () => {
    await render()
    await click(manage())
    await click(byLabel('Filter property')[0])
    const labels = offered()
    for (const t of ['Title', 'Location', FILEDATA.createdAt.label, 'Realms'])
      expect(labels).toContain(t)
    expect(labels).not.toContain(FILEDATA.modifiedAt.label)
    expect(labels).not.toContain('Mood')
  })
})
