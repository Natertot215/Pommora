// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Icon } from './index'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
})

it('a Tabler glyph draws larger in the same box as a Lucide icon at its size', () => {
  const host = document.createElement('div')
  root = createRoot(host)
  act(() =>
    root?.render(
      <>
        <Icon name="plus" size="control" />
        <Icon name="progress-check" size="control" />
      </>,
    ),
  )
  const [lucide, tabler] = host.querySelectorAll('svg')
  expect(tabler.getAttribute('width')).toBe(lucide.getAttribute('width'))
  expect(tabler.getAttribute('height')).toBe(lucide.getAttribute('height'))
  expect(tabler.style.scale).toBe('1.1')
})
