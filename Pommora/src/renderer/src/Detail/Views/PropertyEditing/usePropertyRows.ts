import { useMemo } from 'react'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { resolveContextKeys } from '@shared/contextResolve'
import type { PropertyDefinition } from '@shared/properties'
import { applyValueAtRoot, type PropertyValue } from '@shared/propertyValue'
import type { PageFrontmatter } from '@shared/schemas'
import type { NexusTree, ViewRow } from '@shared/types'
import { asRenderableIcon } from '@renderer/design-system/symbols'
import { propertyTypeIconName } from '@renderer/Components/Detail/PropertyTypes'
import { useSession } from '@renderer/store'
import {
  contextIdentityOf,
  contextIdsOf,
  isContextColumnId,
  spaceIdentityOf,
} from '../pipeline/contextIdentity'
import { resolveFieldValue } from '../pipeline/value'
import { buildResolveContext, type ResolveContext } from '../Table/resolveContext'
import { sharedValueClickAction } from './valueClick'

// One home for both page-property surfaces — the Settings pane's Properties leaf and the floating
// preview's inspector. What they share is everything about resolving a page into rows and writing a
// value back; what they keep is their own frame, their own row chrome, and their own rule for which
// rows show. Every write here goes through the same primitives the table and cards use, so this is
// a shape over them rather than a second way to write.

/** Which value editor a row has open. */
export type Editing = { id: string; mode: 'picker' | 'editor' | 'date' } | null

/** The page this surface is about. The two hosts find it differently — one reads the open page, the
 *  other resolves a preview target — so it arrives already found. */
export interface PropertyRowsPage {
  id: string
  title: string
  path: string
}

export interface PropertyRows {
  schema: PropertyDefinition[]
  ctx: ResolveContext | null
  ctxRegistry: ContextsRegistry | null
  contextRows: { id: string; label: string; icon: string }[]
  contextValues: Record<string, string[]> | undefined
  row: ViewRow | null
  isContextRow: (id: string) => boolean
  commitValue: (propertyId: string, next: PropertyValue | null) => void
  commitContext: (contextId: string, ids: string[]) => void
  /** The click semantics every value surface shares. `onReveal` is the host's — a cleared checkbox
   *  would otherwise drop its own row out from under the cursor. */
  editRow: (
    def: PropertyDefinition,
    el: HTMLElement,
    handlers: {
      setTrigger: (el: HTMLElement) => void
      setEditing: (e: Editing) => void
      onReveal: (id: string) => void
    },
  ) => void
}

/** A page's owning Collection by path prefix — schema lives only on Collections. */
const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] =>
  tree?.collections.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []

export const propertyIcon = (def: PropertyDefinition): string =>
  asRenderableIcon(def.icon) ?? propertyTypeIconName(def.type) ?? 'tag'

export function usePropertyRows(
  page: PropertyRowsPage | null,
  fm: PageFrontmatter | null,
  setFm: React.Dispatch<React.SetStateAction<PageFrontmatter | null>>,
): PropertyRows {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const path = page?.path ?? ''

  const schema = useMemo(() => schemaForPage(tree, path), [tree, path])
  const ctx = useMemo<ResolveContext | null>(
    () => (tree ? buildResolveContext(tree, schema) : null),
    [tree, schema],
  )
  const contextRows = useMemo(
    () =>
      contextIdsOf(tree).flatMap((id) => {
        const identity = contextIdentityOf(tree, id)
        return identity ? [{ id, label: identity.title, icon: identity.icon }] : []
      }),
    [tree],
  )
  const ctxRegistry = useMemo<ContextsRegistry | null>(
    () => (tree?.contexts ? { contexts: tree.contexts.map((g) => g.def) } : null),
    [tree],
  )
  const contextValues = useMemo(() => {
    if (!fm || !ctxRegistry || !tree?.contexts) return undefined
    const spacesByContext = new Map(tree.contexts.map((g) => [g.def.id, g.spaces]))
    const links = resolveContextKeys(fm as Record<string, unknown>, ctxRegistry, spacesByContext)
    return links.size ? Object.fromEntries(links) : undefined
  }, [fm, ctxRegistry, tree])
  const row = useMemo<ViewRow | null>(
    () =>
      fm && page
        ? {
            id: page.id,
            title: page.title,
            icon: fm.icon,
            path: page.path,
            frontmatter: fm,
            contextValues,
          }
        : null,
    [fm, page, contextValues],
  )

  const isContextRow = (id: string): boolean => isContextColumnId(tree, id)

  const commitValue = (propertyId: string, next: PropertyValue | null): void => {
    const def = schema.find((d) => d.id === propertyId)
    if (!def) return
    setFm((prev) =>
      prev ? (applyValueAtRoot(prev as Record<string, unknown>, def, next) as typeof prev) : prev,
    )
    void mutate({ op: 'setProperty', path, propertyId, value: next })
  }

  const commitContext = (contextId: string, ids: string[]): void => {
    // Optimistic — main re-resolves authoritatively at the write boundary.
    const title = contextIdentityOf(tree, contextId)?.title
    if (title === undefined) return
    const titles = ids
      .map((sid) => spaceIdentityOf(tree, sid)?.title)
      .filter((t): t is string => t !== undefined)
    setFm((prev) => {
      if (!prev) return prev
      const next = { ...prev } as Record<string, unknown>
      if (titles.length) next[contextKey(title)] = titles
      else delete next[contextKey(title)]
      return next as PageFrontmatter
    })
    void mutate({ op: 'setContext', path, contextId, spaceIds: ids })
  }

  const editRow: PropertyRows['editRow'] = (def, el, { setTrigger, setEditing, onReveal }) => {
    setTrigger(el)
    // checkbox is true-or-absent on disk, never a stored false — the shared click-semantics router
    // handles it; number/url stay inline in the host.
    const current = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, undefined, current, def)
    if (shared) {
      if (shared.kind === 'commit') {
        commitValue(def.id, shared.value)
        if (def.type === 'checkbox' && shared.value === null) onReveal(def.id)
      } else setEditing({ id: def.id, mode: shared.kind === 'datetime' ? 'date' : 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
  }

  return {
    schema,
    ctx,
    ctxRegistry,
    contextRows,
    contextValues,
    row,
    isContextRow,
    commitValue,
    commitContext,
    editRow,
  }
}
