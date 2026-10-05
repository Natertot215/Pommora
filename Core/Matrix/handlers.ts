import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fault, NO_STORE, ok } from '../Contract/result'
import { isPlainObject, isStringArray } from '../Contract/validators'
import { readScope, readValue, writeKeys, writeValue } from '../Platform/localState'
import type { Lens } from './Engine/viewport'
import type { MatrixPatch } from './matrixConfig'
import { readMatrixFile, writeMatrixFile } from './matrixFile'
import { readMatrixGraph } from './matrixGraph'
import { isLayoutPatch, isLens, readPositions, type MatrixLayout } from './matrixLayout'

export const matrixHandlers = {
  'matrix:read': withRoot(async (root) => ok(await readMatrixFile(root))),

  'matrix:write': withWriteRoot(async (root, _ctx, patch: unknown) => {
    if (!isPlainObject(patch)) return fault('Matrix patch must be an object.')
    await writeMatrixFile(root, patch as MatrixPatch)
    return ok(null)
  }),

  'matrix:graph': withRoot((_root, _ctx, paths: unknown) => {
    if (paths !== undefined && !isStringArray(paths)) return fault('Paths must be strings.')
    const reply = readMatrixGraph(paths)
    return reply ? ok(reply) : fault('The index is not ready.')
  }),

  'matrixLayout:load': withRoot(() => {
    const lens = readValue<Lens>('matrixFrame')
    return ok({
      positions: readPositions(readScope('matrixLayout')),
      lens: isLens(lens) ? lens : null,
    } satisfies MatrixLayout)
  }),

  'matrixLayout:save': withWriteRoot((_root, _ctx, patch: unknown) => {
    if (!isLayoutPatch(patch))
      return fault('A layout patch needs finite positions or a finite lens.')
    if (patch.positions && !writeKeys('matrixLayout', patch.positions)) return NO_STORE
    if (patch.lens && !writeValue('matrixFrame', patch.lens)) return NO_STORE
    return ok(null)
  }),
} satisfies Partial<Handlers>
