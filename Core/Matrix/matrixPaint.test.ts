// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { DEFAULT_MATRIX_CONFIG } from './matrixConfig'
import { createPainter } from './matrixPaint'
import { matrixRuntime, type Surface } from './matrixRuntime'

const loading = vi.hoisted(() => ({ now: true }))
vi.mock('./iconCache', () => ({ iconFor: () => null, iconsLoading: () => loading.now }))

let detach: (() => void) | null = null
let calls: string[] = []

const context = (): CanvasRenderingContext2D =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get: (held, key) =>
      key in held
        ? held[key]
        : (): void => {
            calls.push(String(key))
          },
    set: (held, key, value) => {
      held[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D

beforeEach(() => {
  calls = []
  loading.now = true
  vi.stubGlobal('requestAnimationFrame', () => 0)
  useSession.setState({
    tree: makeTree(),
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    matrixGraph: { links: [], values: {} },
    matrixPositions: {},
    matrixLens: { cx: 0, cy: 0, w: 800, h: 600 },
    matrixLoad: { kind: 'loaded' },
    saveMatrixLayout: vi.fn() as never,
  } as never)
})

afterEach(() => {
  detach?.()
  detach = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const paintOn = (surface: Surface, live: string | null): (() => string[]) => {
  detach = matrixRuntime.attach(surface)
  matrixRuntime.setStage(surface, { x: 0, y: 0, width: 800, height: 600 })
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getContext').mockReturnValue(context() as never)
  Object.defineProperties(canvas, { clientWidth: { value: 800 }, clientHeight: { value: 600 } })
  const host = document.createElement('div')
  const painter = createPainter(host, canvas, surface, { current: live }, { current: null })
  return () => {
    calls = []
    painter.draw()
    return calls
  }
}

describe('createPainter', () => {
  it('holds its first picture with nodes blank while glyphs load, and no picture after', () => {
    useSession.setState({ tree: { ...makeTree(), collections: [] } })
    const drawn = paintOn({ visible: () => true }, null)

    loading.now = false
    expect(drawn()).not.toContain('arc')

    useSession.setState({ tree: makeTree() })
    loading.now = true
    const held = drawn()
    expect(held).toContain('arc')
    expect(held.at(-1)).toBe('clearRect')

    loading.now = false
    expect(drawn().at(-1)).not.toBe('clearRect')

    loading.now = true
    const later = drawn()
    expect(later).toContain('arc')
    expect(later.at(-1)).not.toBe('clearRect')
  })

  it("lights the surface's live subject rather than the node its pointer hovers", () => {
    useSession.setState({ matrixPositions: { p1: [0, 0], p2: [100, 0] } })
    loading.now = false
    let at = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (at += 64))
    const surface: Surface = { visible: () => true }
    const drawn = paintOn(surface, 'p1')
    matrixRuntime.setHovered(surface, 'p2')
    for (let i = 0; i < 10; i++) drawn()
    // Each node draws from its `arc`: one stroke for its edge, and a second for the ring only the subject wears.
    const strokes = drawn()
      .join(' ')
      .split('arc')
      .slice(1)
      .map((node) => node.split(' ').filter((c) => c === 'stroke').length)
    expect(strokes[matrixRuntime.indexOf('p1')]).toBe(2)
    expect(strokes[matrixRuntime.indexOf('p2')]).toBe(1)
  })
})
