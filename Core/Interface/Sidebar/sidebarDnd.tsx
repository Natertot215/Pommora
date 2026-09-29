import type { ReactNode } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { rowDropLine } from '@pommora/uix/Menus'
import { carries, LineZone } from '@pommora/uix/Interactions/drag'
import { type SelectTarget, TAB_FAMILY } from '@pommora/core/Navigation/navRef'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import { useSession } from '../../Session/store'
import { type Index, sidebarCommit, sidebarSlot, sidebarSnapshot } from './sidebarDndModel'

export function SidebarDnd({
  index,
  onCommit,
  children,
}: {
  index: Index
  onCommit: (commit: MutateRequest, id: string) => void
  children: ReactNode
}): React.JSX.Element {
  const entry = (id: string) => index.byId.get(id)
  return (
    <LineZone
      snap={(id, g) => sidebarSnapshot(index, useSession.getState().personalization, id, g.rows)}
      resolve={(_id, point, s) => sidebarSlot(s, point.y)}
      commit={(id, slot, s) => {
        const req = sidebarCommit(s, slot)
        if (req) onCommit(req, id)
      }}
      line={(slot) => rowDropLine(slot.edge, slot.depth)}
      slotKey={(slot) => `${slot.parentId}/${slot.beforeId}`}
      label={(id) => entry(id)?.title ?? ''}
      chip={(id) => {
        const e = entry(id)
        return (
          e && (
            <>
              <Icon name={e.icon} size="body" />
              {e.title}
            </>
          )
        )
      }}
      carry={[
        carries(TAB_FAMILY, (id): SelectTarget | null => {
          const e = entry(id)
          return e?.kind === 'page'
            ? { kind: 'page', id, path: e.path }
            : e?.kind === 'space'
              ? { kind: 'space', id }
              : null
        }),
      ]}
      disclose
      watch={[index]}
    >
      {children}
    </LineZone>
  )
}
