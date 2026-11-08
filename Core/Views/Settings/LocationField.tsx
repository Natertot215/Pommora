import { useMemo, useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { Icon } from '@pommora/uix/Symbols'
import { TokenField } from '@pommora/uix/Fields/TokenField'
import { foldKey, matches, matchKey, matchQuery } from '../../Paths/caseFold'
import { EntityIcon } from '../../Assets/EntityIcon'
import { type Disclosure, DisclosureRow, useDisclosureSet } from '@pommora/uix/Menus/DisclosureRow'
import { MenuDesc, MenuScrollFrame } from '@pommora/uix/Menus/MenuRows'
import { pickRuns } from '@pommora/uix/Menus/pickRuns'
import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
import { PICKER_MAX_HEIGHT, treePane } from '@pommora/uix/Pickers/picker-base.css'
import { useKeepInView, usePaneCtl } from '@pommora/uix/Interactions/paneCtl'
import * as fp from './filter-frame.css'
import { useMultiValue } from './useMultiValue'

export type Folder = CollectionNode | SetNode

export function flattenNodes(nodes: Folder[] | undefined): Folder[] {
  return (nodes ?? []).flatMap((n) => [n, ...flattenNodes(n.sets)])
}

/** Matches with their whole subtrees, under the ancestors that lead to them; `leads` names those ancestors, which open by default. */
function narrowed(nodes: Folder[], query: string): { nodes: Folder[]; leads: Set<string> } {
  const leads = new Set<string>()
  const walk = <N extends Folder>(ns: N[], place: string): N[] =>
    ns.flatMap((n) => {
      const sets = walk(n.sets ?? [], place ? `${place}/${n.title}` : n.title)
      if (sets.length > 0) leads.add(n.id)
      const kept = sets.length > 0 || matches(matchKey(n.title, place), query)
      return kept ? [{ ...n, sets }] : []
    })
  return { nodes: walk(nodes, ''), leads }
}

const shownRows = (nodes: Folder[], isOpen: (id: string) => boolean): Folder[] =>
  nodes.flatMap((n) => [n, ...(isOpen(n.id) ? shownRows(n.sets ?? [], isOpen) : [])])

function LocationTree({
  nodes,
  shown,
  disclosure,
  activeId,
  keepInView,
  onPick,
}: {
  nodes: Folder[]
  shown: string[]
  disclosure: Disclosure
  activeId: string | null
  keepInView: (el: HTMLElement | null) => void
  onPick: (id: string) => void
}): React.JSX.Element {
  const renderLevel = (ns: Folder[]): React.JSX.Element[] => {
    const runs = pickRuns(
      ns.map((n) => shown.includes(n.id)),
      ns.map((n) => disclosure.isOpen(n.id) && (n.sets?.length ?? 0) > 0),
    )
    return ns.map((n, i) => {
      const kids = n.sets ?? []
      const active = n.id === activeId
      return (
        <DisclosureRow
          key={n.id}
          ref={active ? keepInView : undefined}
          title={n.title}
          icon={<EntityIcon kind={n.kind} icon={n.icon} size="body" />}
          chevron={kids.length > 0 ? 'chevron' : 'spacer'}
          open={disclosure.isOpen(n.id)}
          onToggle={() => disclosure.toggle(n.id)}
          onClick={() => onPick(n.id)}
          active={active}
          picked={runs[i]}
        >
          {kids.length > 0 ? renderLevel(kids) : undefined}
        </DisclosureRow>
      )
    })
  }
  return (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>
      {nodes.length ? renderLevel(nodes) : <MenuDesc>No Sets in this collection.</MenuDesc>}
    </MenuScrollFrame>
  )
}

export function LocationField({
  values,
  nodes,
  folderById,
  names,
  onCommit,
}: {
  values: string[]
  nodes: Folder[]
  folderById: ReadonlyMap<string, Folder>
  names: boolean
  onCommit: (next: string[]) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const { shown, toggle } = useMultiValue(values, onCommit)
  const q = matchQuery(draft)
  const tree = useMemo(
    () => (q ? narrowed(nodes, q) : { nodes, leads: new Set<string>() }),
    [nodes, q],
  )
  const expanded = useDisclosureSet()
  const narrowedOpen = useDisclosureSet(tree.leads, q)
  const disclosure = q ? narrowedOpen : expanded
  const rows = shownRows(tree.nodes, disclosure.isOpen)
  const pick = (id: string): void => {
    toggle(id)
    setDraft('')
  }
  const enter = (name: string): void => {
    if (!names) return
    const fold = foldKey(name)
    if (!shown.some((v) => foldKey(v) === fold)) toggle(name)
    setDraft('')
  }
  const dismiss = (): void => {
    setOpen(false)
    setDraft('')
  }
  const { row, ctl } = usePaneCtl(
    rows,
    open ? draft : null,
    { open, pick: (n) => pick(n.id), close: dismiss },
    null,
  )
  const keepInView = useKeepInView(row?.id)

  return (
    <>
      <TokenField
        ref={ref}
        chrome="bordered"
        className={fp.locationField}
        entries={shown.map((v) => {
          const node = folderById.get(v)
          return {
            key: v,
            label: node?.title ?? v,
            icon: node ? (
              <EntityIcon kind={node.kind} icon={node.icon} size="body" />
            ) : (
              <Icon name="folder-search" size="body" />
            ),
            onRemove: () => toggle(v),
          }
        })}
        draft={draft}
        placeholder="Value"
        ariaLabel="Filter values"
        onFocus={() => setOpen(true)}
        onBlur={dismiss}
        onPress={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (open) ctl.current.move(e.key === 'ArrowDown' ? 1 : -1)
            else setOpen(true)
          } else if (e.key === 'Enter' && open && row) {
            e.preventDefault()
            ctl.current.pick()
          } else if (e.key === 'Escape' && open) {
            // The field drives its pane's keys, so Escape closes it whether the pane is shown or hidden.
            e.preventDefault()
            ctl.current.close()
          }
        }}
        onDraftChange={(d) => {
          setDraft(d)
          setOpen(true)
        }}
        onEnter={enter}
      />
      <PickerMenu
        open={open && (!q || tree.nodes.length > 0)}
        onDismiss={dismiss}
        triggerRef={ref}
        origin="left"
        contentClassName={treePane}
        focus="keep"
      >
        {open && (
          <LocationTree
            nodes={tree.nodes}
            shown={shown}
            disclosure={disclosure}
            activeId={row?.id ?? null}
            keepInView={keepInView}
            onPick={pick}
          />
        )}
      </PickerMenu>
    </>
  )
}
