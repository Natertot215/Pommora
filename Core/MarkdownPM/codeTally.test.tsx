// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { cleanupEditor, mountEditor, stubEditorBridge } from '../Testing/editorHarness'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
stubEditorBridge()
afterEach(async () => {
  await cleanupEditor()
})

describe('a diff fence’s tally', () => {
  const doc = '```diff\n+a\n+b\n-c\n```'
  const pill = (view: { contentDOM: HTMLElement }) =>
    view.contentDOM.querySelector('.codeblock-tally')

  it('reads its net change, then added over removed', async () => {
    expect(pill(await mountEditor({ initialBody: doc }))?.textContent).toBe('+1+2 / −1')
  })

  it('recounts when a line changes sign', async () => {
    const view = await mountEditor({ initialBody: doc })
    const at = view.state.doc.toString().indexOf('-c')
    await act(async () => view.dispatch({ changes: { from: at, to: at + 1, insert: '+' } }))
    expect(pill(view)?.textContent).toBe('+3+3 / −0')
  })
})
