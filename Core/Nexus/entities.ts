// The one list of entity kinds and what each one is; every alias below is derived from this table, with its resolved members beside it, and the words that count them close the file.

import type { AgendaKind } from '../Paths/nexusPaths'
import { basename, dirname, isMarkdownFile, titleFromPath } from '../Paths/posix'
import { capitalize } from '@pommora/uix/Utilities/capitalize'

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

/** A target that names a container by id: a Collection, a Set, or either's archive place. */
export const namesContainer = <T extends { kind: unknown }>(
  n: T | null | undefined,
): n is T & { kind: ContainerKind | 'archive' } => isContainer(n) || n?.kind === 'archive'

export type Counted = { kind: HeldKind | 'property' }

const PLURALS: Record<Counted['kind'], string> = {
  page: 'Pages',
  collection: 'Collections',
  set: 'Sets',
  space: 'Spaces',
  context: 'Contexts',
  property: 'Properties',
}

export const itemCount = (n: number): string => `${n} ${n === 1 ? 'Item' : 'Items'}`

export function countPhrase(items: readonly Counted[]): string {
  const kinds = new Set(items.map((r) => r.kind))
  const kind = kinds.size === 1 ? [...kinds][0] : null
  if (kind === null) return itemCount(items.length)
  return items.length === 1 ? `1 ${capitalize(kind)}` : `${items.length} ${PLURALS[kind]}`
}

export const unsweptLine = (count: number, what = ''): string =>
  `Couldn’t update ${what}${itemCount(count)}.`

/** Names each file only a fix by hand lets Pommora rewrite: a page by its title, a Space sidecar by its Space. */
export const refusedLine = (files: readonly string[]): string =>
  `Couldn’t safely rewrite ${files.map((f) => `“${isMarkdownFile(f) ? titleFromPath(f) : basename(dirname(f))}”`).join(', ')}.`
