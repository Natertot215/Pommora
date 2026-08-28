// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssetMap, NexusTree } from '@shared/types'
import type { Crop } from '@shared/schemas'
import { coverStyle } from '@shared/cropGeometry'
import { cropKeyFor } from '@shared/nexusPaths'
import { resolveAssetValue } from '@renderer/Assets/assetUrl'
import { useSession } from '@renderer/store'
import { AssetImage, cropFor } from './AssetImage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// A fresh version per test so the URL-keyed aspect cache (a module singleton) never carries an
// entry between mounts, while the crop key (the rel) stays stable.
let ver = 100
const freshMap = (): AssetMap => ({
  files: { 'cover.png': ['file-assets/Cover.png'] },
  version: ver++,
})
const treeWith = (crops: Record<string, Crop>): NexusTree => ({ crops }) as unknown as NexusTree

let images: MockImage[] = []
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  set src(_v: string) {
    images.push(this)
  }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  images = []
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    },
  )
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 400,
    height: 200,
    top: 0,
    left: 0,
    right: 400,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const mount = (el: ReactNode): Promise<void> => act(async () => root.render(el))
const loadLastImage = (w: number, h: number): Promise<void> =>
  act(async () => {
    const img = images[images.length - 1]
    img.naturalWidth = w
    img.naturalHeight = h
    img.onload?.()
  })

describe('AssetImage', () => {
  it('renders a plain img and loads no aspect when no crop exists', async () => {
    useSession.setState({ assetMap: freshMap(), tree: treeWith({}) })
    await mount(<AssetImage value="[[Cover.png]]" />)
    const img = host.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('file-assets/Cover.png')
    expect(host.querySelector('div')).toBeNull()
    expect(images).toHaveLength(0)
  })

  it('paints a div through coverStyle when a crop exists under the resolved key', async () => {
    const crop: Crop = { x: 0.3, y: 0.4, zoom: 2 }
    useSession.setState({ assetMap: freshMap(), tree: treeWith({ 'file-assets/Cover.png': crop }) })
    await mount(<AssetImage value="[[Cover.png]]" />)
    await loadLastImage(200, 100)
    const div = host.querySelector('div')
    expect(div).not.toBeNull()
    const cover = coverStyle(crop, 0.5, 0.5)
    expect(div?.style.backgroundSize).toBe(cover?.backgroundSize)
    expect(div?.style.backgroundPosition).toBe(cover?.backgroundPosition)
  })

  it('paints the preview crop over the stored one', async () => {
    const stored: Crop = { x: 0.3, y: 0.4, zoom: 2 }
    const preview: Crop = { x: 0.9, y: 0.1, zoom: 1 }
    useSession.setState({
      assetMap: freshMap(),
      tree: treeWith({ 'file-assets/Cover.png': stored }),
    })
    await mount(<AssetImage value="[[Cover.png]]" preview={preview} />)
    await loadLastImage(200, 100)
    expect(host.querySelector('div')?.style.backgroundPosition).toBe(
      coverStyle(preview, 0.5, 0.5)?.backgroundPosition,
    )
  })

  it('falls back when the image fails to load', async () => {
    useSession.setState({ assetMap: freshMap(), tree: treeWith({}) })
    await mount(<AssetImage value="[[Cover.png]]" fallback={<span data-fb="1" />} />)
    await act(async () => {
      host.querySelector('img')?.dispatchEvent(new Event('error'))
    })
    expect(host.querySelector('[data-fb]')).not.toBeNull()
    expect(host.querySelector('img')).toBeNull()
  })

  it('cropFor keys an image the way main does (renderer half of the must-agree)', () => {
    const crop: Crop = { x: 0.5, y: 0.5, zoom: 1 }
    expect(cropFor('[[Cover.png]]', freshMap(), { 'file-assets/Cover.png': crop })).toEqual(crop)
    const resolved = resolveAssetValue('[[Cover.png]]', freshMap())
    expect(cropKeyFor(resolved.kind === 'asset' ? resolved.rel : null, '[[Cover.png]]')).toBe(
      'file-assets/Cover.png',
    )
  })
})
