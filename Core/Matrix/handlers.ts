import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, NO_STORE, ok } from '../Contract/result'
import { isStringArray } from '../Contract/validators'
import { readValue, writeValue } from '../Platform/localState'
import { isPlainObject } from '../Properties/propertyValue'
import type { Frame } from './Engine/viewport'
import type { MatrixPatch } from './matrixConfig'
import { readMatrixFile, writeMatrixFile } from './matrixFile'
import { readMatrixGraph } from './matrixGraph'
import {
  isLayoutPatch,
  readPositions,
  isFrame,
  type MatrixLayout,
  type Positions,
} from './matrixLayout'

export const matrixHandlers = {
  'matrix:read': withRoot(async (root) => ok(await readMatrixFile(root))),

  'matrix:write': withWriteRoot(async (root, _ctx, patch: unknown) => {
    if (!isPlainObject(patch)) return fail('operation-failed', 'Matrix patch must be an object.')
    await writeMatrixFile(root, patch as MatrixPatch)
    return ok(null)
  }),

  'matrix:graph': withRoot((_root, _ctx, paths: unknown) => {
    if (paths !== undefined && !isStringArray(paths))
      return fail('operation-failed', 'Paths must be strings.')
    const reply = readMatrixGraph(paths)
    return reply ? ok(reply) : fail('operation-failed', 'The index is not ready.')
  }),

  'matrixLayout:load': withRoot(() => {
    const positions = readValue<Positions>('matrixLayout')
    const frame = readValue<Frame>('matrixFrame')
    return ok({
      positions: readPositions(positions),
      frame: isFrame(frame) ? frame : null,
    } satisfies MatrixLayout)
  }),

  'matrixLayout:save': withWriteRoot((_root, _ctx, patch: unknown) => {
    if (!isLayoutPatch(patch))
      return fail('operation-failed', 'A layout patch needs finite positions or a finite frame.')
    if (patch.positions && !writeValue('matrixLayout', patch.positions)) return NO_STORE
    if (patch.frame && !writeValue('matrixFrame', patch.frame)) return NO_STORE
    return ok(null)
  }),
} satisfies Partial<Handlers>
