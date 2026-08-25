// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AssetMap, NexusTree } from '@shared/types'
import type { Crop } from '@shared/schemas'
import { DEFAULT_CROP } from '@shared/cropGeometry'
import { useSession } from '@renderer/store'
import { ImagePicker } from './ImagePicker'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let ver = 200
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

const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createImageData' || prop === 'getImageData')
        return (w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
      return () => {}
    },
  },
)

beforeEach(() => {
  images = []
  // jsdom has no canvas; the glass materials' shader reads a 2d context.
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx2d) as unknown as typeof HTMLCanvasElement.prototype.getContext
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
    width: 280,
    height: 140,
    top: 0,
    left: 0,
    right: 280,
    bottom: 140,
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
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const mount = (el: React.ReactNode): Promise<void> => act(async () => root.render(el))
const loadImage = (w = 400, h = 200): Promise<void> =>
  act(async () => {
    for (const img of images) {
      img.naturalWidth = w
      img.naturalHeight = h
      img.onload?.()
    }
  })
const byText = (t: string): HTMLElement | undefined =>
  [...document.body.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === t)
const byLabel = (t: string): HTMLElement | null =>
  document.body.querySelector(`[aria-label="${t}"]`)

describe('ImagePicker', () => {
  const STORED: Crop = { x: 0.3, y: 0.4, zoom: 2 }

  it('renders nothing when closed', async () => {
    await mount(
      <ImagePicker
        open={false}
        value="[[Cover.png]]"
        shape="rect"
        boxAspect={0.5}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    )
    expect(document.body.querySelector('[aria-label="Save"]')).toBeNull()
    expect(byText('Save')).toBeUndefined()
  })

  it('Reset restores DEFAULT_CROP and Save reports it', async () => {
    useSession.setState({
      assetMap: freshMap(),
      tree: treeWith({ 'file-assets/Cover.png': STORED }),
    })
    const onSave = vi.fn()
    await mount(
      <ImagePicker
        open
        value="[[Cover.png]]"
        shape="rect"
        boxAspect={0.5}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )
    await loadImage()
    await act(async () => byLabel('Reset')?.click())
    await act(async () => byText('Save')?.click())
    expect(onSave).toHaveBeenCalledWith(DEFAULT_CROP)
  })

  it('Save is disabled while the aspect is null (an image that will not load)', async () => {
    useSession.setState({ assetMap: freshMap(), tree: treeWith({}) })
    await mount(
      <ImagePicker
        open
        value="[[Cover.png]]"
        shape="rect"
        boxAspect={0.5}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    )
    await act(async () => {
      for (const img of images) img.onerror?.()
    })
    expect((byText('Save') as HTMLButtonElement).disabled).toBe(true)
  })

  it('Escape cancels when idle', async () => {
    useSession.setState({ assetMap: freshMap(), tree: treeWith({}) })
    const onCancel = vi.fn()
    await mount(
      <ImagePicker
        open
        value="[[Cover.png]]"
        shape="rect"
        boxAspect={0.5}
        onCancel={onCancel}
        onSave={() => {}}
      />,
    )
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onCancel).toHaveBeenCalled()
  })

  it('holds Save while a re-picked image adopts, then releases even when the value is unchanged', async () => {
    const bothMap = {
      files: { 'cover.png': ['file-assets/Cover.png'], 'new.png': ['file-assets/New.png'] },
      version: ver++,
    }
    useSession.setState({ assetMap: bothMap, tree: treeWith({ 'file-assets/Cover.png': STORED }) })
    ;(window as { nexus?: unknown }).nexus = { pickFile: () => Promise.resolve('/abs/New.png') }
    let settle: (ok: boolean) => void = () => {}
    const onRepick = vi.fn(() => new Promise<boolean>((resolve) => (settle = resolve)))
    const base = {
      open: true as const,
      shape: 'rect' as const,
      boxAspect: 0.5,
      onCancel: () => {},
      onSave: () => {},
      onRepick,
    }
    await mount(<ImagePicker value="[[Cover.png]]" {...base} />)
    await loadImage()
    expect((byText('Save') as HTMLButtonElement).disabled).toBe(false)
    await act(async () => byLabel('Choose Image')?.click())
    await act(async () => {})
    expect(onRepick).toHaveBeenCalledWith('/abs/New.png')
    expect((byText('Save') as HTMLButtonElement).disabled).toBe(true)
    // A dedup adopt of the already-set image writes back the same value, so no value change comes.
    // The hold must release on the adopt resolving, or Save deadlocks against a change that never lands.
    await act(async () => settle(true))
    expect((byText('Save') as HTMLButtonElement).disabled).toBe(false)
    ;(window as { nexus?: unknown }).nexus = undefined
  })

  it('the colour input lands on draft.color, which Save reports', async () => {
    useSession.setState({
      assetMap: freshMap(),
      tree: treeWith({ 'file-assets/Cover.png': STORED }),
    })
    const onSave = vi.fn()
    await mount(
      <ImagePicker
        open
        value="[[Cover.png]]"
        shape="rect"
        boxAspect={0.5}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )
    await loadImage()
    const color = document.body.querySelector<HTMLInputElement>('input[type="color"]')
    expect(color).not.toBeNull()
    await act(async () => {
      if (color) {
        color.value = '#ff0000'
        color.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    await act(async () => byText('Save')?.click())
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ color: '#ff0000' }))
  })
})
