import type { AgendaKind } from '../Paths/nexusPaths'

type Entity = { held?: true; node?: true; container?: true; mark?: string }

export const ENTITIES = {
  collection: { held: true, node: true, container: true },
  set: { held: true, node: true, container: true },
  page: { held: true, node: true, mark: 'P' },
  space: { held: true, node: true },
  context: { held: true },
  task: { mark: 'T' },
  event: { mark: 'E' },
} as const satisfies Record<
  'collection' | 'set' | 'page' | 'space' | 'context' | AgendaKind,
  Entity
>

type EntityKind = keyof typeof ENTITIES

type KindWith<F extends keyof Entity> = {
  [K in EntityKind]: (typeof ENTITIES)[K] extends Record<F, unknown> ? K : never
}[EntityKind]

export type HeldKind = KindWith<'held'>
export type NodeKind = KindWith<'node'>
export type ContainerKind = KindWith<'container'>
export type ContentKind = KindWith<'mark'>

const kindsWith = <F extends keyof Entity>(flag: F): KindWith<F>[] =>
  (Object.keys(ENTITIES) as EntityKind[]).filter((k): k is KindWith<F> => flag in ENTITIES[k])

export const HELD_KINDS = kindsWith('held')
export const NODE_KINDS = kindsWith('node')
export const CONTAINER_KINDS = kindsWith('container')
export const CONTENT_KINDS = kindsWith('mark')
