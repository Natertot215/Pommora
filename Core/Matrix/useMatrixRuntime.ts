import { useSyncExternalStore } from 'react'
import { matrixRuntime } from './matrixRuntime'

export const useMatrixHover = (): string | null =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.hoveredId)

export const useMatrixCount = (): number =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.graph.nodes.length)
