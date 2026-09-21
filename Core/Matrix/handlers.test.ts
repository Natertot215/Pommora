import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { closeSession, openSession } from '../Nexus/session'
import { writeValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { realpathPosix, tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { matrixHandlers } from './handlers'
import { DEFAULT_MATRIX_CONFIG } from './matrixConfig'

let root: string
const ctx = {} as HostContext

beforeEach(async () => {
  root = await realpathPosix(tempRoot('pom-matrix-handlers-'))
  installStores(memoryStores().stores)
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('matrix config channels', () => {
  it('refuses a patch that is not an object', async () => {
    const reply = await matrixHandlers['matrix:write'](ctx, 'forces')
    expect(reply).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'Matrix patch must be an object.' },
    })
  })

  it('round-trips one section', async () => {
    const space = { ...DEFAULT_MATRIX_CONFIG.forces.space, spread: 0.9 }
    expect(await matrixHandlers['matrix:write'](ctx, { forces: { space } })).toEqual({
      ok: true,
      value: null,
    })
    const reply = await matrixHandlers['matrix:read'](ctx)
    expect(reply.ok && reply.value.forces.space.spread).toBe(0.9)
    expect(reply.ok && reply.value.forces.connection).toEqual(
      DEFAULT_MATRIX_CONFIG.forces.connection,
    )
    expect(reply.ok && reply.value.group.mode).toBe('connection')
  })
})

describe('the layout channels', () => {
  it('refuses a non-finite coordinate', () => {
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [0, Number.NaN] } })).toEqual(
      {
        ok: false,
        error: {
          code: 'operation-failed',
          message: 'A layout patch needs finite positions or a finite frame.',
        },
      },
    )
    expect(matrixHandlers['matrixLayout:save'](ctx, {})).toEqual({
      ok: false,
      error: {
        code: 'operation-failed',
        message: 'A layout patch needs finite positions or a finite frame.',
      },
    })
  })

  it('refuses a position carrying anything past its pair', () => {
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2, 1] } }).ok).toBe(false)
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1] } }).ok).toBe(false)
  })

  it('reads a stored layout row by row, keeping every pair it understands', () => {
    writeValue('matrixLayout', { a: [1, 2], b: [3, 4, 1], c: [5], d: 'no' })
    const reply = matrixHandlers['matrixLayout:load']()
    expect(reply.ok && reply.value.positions).toEqual({ a: [1, 2], b: [3, 4] })
  })

  it('writes either half alone and loads both back', () => {
    matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2] } })
    matrixHandlers['matrixLayout:save'](ctx, { frame: { cx: 5, cy: 6, w: 7, h: 8 } })
    const reply = matrixHandlers['matrixLayout:load']()
    expect(reply).toEqual({
      ok: true,
      value: { positions: { a: [1, 2] }, frame: { cx: 5, cy: 6, w: 7, h: 8 } },
    })
  })

  it('loads a stored row the save would have refused as nothing', () => {
    writeValue('matrixLayout', { a: [1] })
    writeValue('matrixFrame', { cx: 0, cy: 0, w: 0, h: 0 })
    expect(matrixHandlers['matrixLayout:load']()).toEqual({
      ok: true,
      value: { positions: {}, frame: null },
    })
  })

  it('loads an unwritten layout as an empty map and no frame', () => {
    expect(matrixHandlers['matrixLayout:load']()).toEqual({
      ok: true,
      value: { positions: {}, frame: null },
    })
  })
})

describe('the graph channel', () => {
  it('fails while the index is unready rather than answering an empty graph', () => {
    expect(matrixHandlers['matrix:graph'](ctx, undefined)).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'The index is not ready.' },
    })
  })

  it('refuses paths that are not strings', () => {
    expect(matrixHandlers['matrix:graph'](ctx, [7])).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'Paths must be strings.' },
    })
  })
})
