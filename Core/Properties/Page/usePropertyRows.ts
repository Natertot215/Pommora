import { useMemo } from 'react'
import { contextKey, type ContextsRegistry } from '@pommora/core/Contexts/contexts'
import { resolveContextKeys } from '@pommora/core/Contexts/contextResolve'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { applyValueAtRoot, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { useSession } from '../../Session/store'
import {
  contextIdentityOf,
  contextIdsOf,
  isContextColumnId,
  spaceIdentityOf,
} from '../../Contexts/contextIdentity'
import { resolveFieldValue } from '../value'
import { buildValueContext, type ValueContext } from '../valueContext'
import { sharedValueClickAction } from '../Pickers/valueClick'
import { fileChipIndex, fileValueMenu, pickFileInto } from '../Pickers/filePick'
import { linkValueMenuTarget, showConnectionMenu } from '../../Interface/Menus/connectionMenu'

export type Editing = { id: string; mode: 'picker' | 'editor' | 'date' | 'rename' } | null

interface PropertyRowsPage {
  id: string
  title: string
  path: string
}

export interface PropertyRows {
  schema: PropertyDefinition[]
  ctx: ValueContext | null
  contextRows: { id: string; label: string; icon: string }[]
  contextValues: Record<string, string[]> | undefined
  row: ViewRow | null
  isContextRow: (id: string) => boolean
  commitValue: (propertyId: string, next: PropertyValue | null) => void
  commitContext: (contextId: string, ids: string[]) => void
  valueMenu: (
    id: string,
    value: PropertyValue,
    target: EventTarget | null,
    handlers: { emptyRow: (id: string, clear: boolean) => void; setEditing: (e: Editing) => void },
  ) => boolean
  editRow: (
    def: PropertyDefinition,
    el: HTMLElement,
    handlers: {
      setTrigger: (el: HTMLElement) => void
      setEditing: (e: Editing) => void
      onReveal: (id: string) => void
    },
    from?: EventTarget | null,
  ) => void
}

const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] =>
  tree?.collections.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []

export function usePropertyRows(
  page: PropertyRowsPage | null,
  fm: PageFrontmatter | null,
  setFm: React.Dispatch<React.SetStateAction<PageFrontmatter | null>>,
): PropertyRows {
  const tree = useSession((s) => s.tree)
  const assetMap = useSession((s) => s.assetMap)
  const mutate = useSession((s) => s.mutate)
  const path = page?.path ?? ''

  const schema = useMemo(() => schemaForPage(tree, path), [tree, path])
  const ctx = useMemo<ValueContext | null>(
    () => (tree ? buildValueContext(tree, schema, assetMap) : null),
    [tree, schema, assetMap],
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
            createdAt: null,
            modifiedAt: null,
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

  const editRow: PropertyRows['editRow'] = (
    def,
    el,
    { setTrigger, setEditing, onReveal },
    from = el,
  ) => {
    setTrigger(el)
    // checkbox is true-or-absent on disk, never a stored false; number/url stay inline in the host.
    const current = row ? resolveFieldValue(row, def.id, schema) : ({ kind: 'null' } as const)
    const shared = sharedValueClickAction(def.type, current)
    if (shared) {
      if (shared.kind === 'commit') {
        commitValue(def.id, shared.value)
        if (def.type === 'checkbox' && shared.value === null) onReveal(def.id)
      } else if (shared.kind === 'file') {
        // The dialog, not a picker anchored to the row — the label clicked decides whether it replaces or adds, and the commit lands when it resolves.
        pickFileInto(def, current, fileChipIndex(from), (next) => commitValue(def.id, next))
      } else setEditing({ id: def.id, mode: shared.kind === 'datetime' ? 'date' : 'picker' })
      return
    }
    if (def.type === 'number' || def.type === 'url') setEditing({ id: def.id, mode: 'editor' })
  }

  const valueMenu: PropertyRows['valueMenu'] = (id, value, target, { emptyRow, setEditing }) => {
    const def = schema.find((d) => d.id === id)
    if (def?.type === 'file') {
      void fileValueMenu(def, value, target, (next) => commitValue(id, next))
      return true
    }
    const link =
      value.kind === 'url'
        ? linkValueMenuTarget(value.value, (action) => {
            if (action === 'link:clear') return emptyRow(id, true)
            if (action === 'rename' || action === 'editLink')
              setEditing({ id, mode: action === 'editLink' ? 'editor' : 'rename' })
          })
        : null
    if (!link) return false
    showConnectionMenu(link)
    return true
  }

  return {
    schema,
    ctx,
    contextRows,
    contextValues,
    row,
    isContextRow,
    commitValue,
    commitContext,
    valueMenu,
    editRow,
  }
}
