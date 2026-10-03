// The one list of entity kinds and what each one is; every alias below is derived from this table, with its resolved members beside it.

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

export type HeldKind = KindWith<'held'> // collection | set | page | space | context
export type NodeKind = KindWith<'node'> // collection | set | page | space
export type FolderNodeKind = Exclude<NodeKind, 'page'> // collection | set | space
export type ContainerKind = KindWith<'container'> // collection | set
export type ContentKind = KindWith<'mark'> // page | task | event

const kindsWith = <F extends keyof Entity>(flag: F): KindWith<F>[] =>
  (Object.keys(ENTITIES) as EntityKind[]).filter((k): k is KindWith<F> => flag in ENTITIES[k])

export const HELD_KINDS = kindsWith('held')
export const NODE_KINDS = kindsWith('node')
export const CONTAINER_KINDS = kindsWith('container')
export const CONTENT_KINDS = kindsWith('mark')

export const isContainerKind = (kind: unknown): kind is ContainerKind =>
  CONTAINER_KINDS.includes(kind as ContainerKind)

export const isContainer = <T extends { kind: unknown }>(
  n: T | null | undefined,
): n is T & { kind: ContainerKind } => n != null && isContainerKind(n.kind)
