import type { ReactNode } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { menuDropLine } from '@pommora/uix/Menus'
import { carries, LineZone } from '@pommora/uix/Interactions/drag'
import { selectTargetOf } from '../../Navigation/navRef'
import { TAB_FAMILY } from '../../Navigation/tabRows'
import type { MutateRequest } from '../../Nexus/mutateRequest'
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
      line={(slot) => menuDropLine(slot)}
      slotKey={(slot) => `${slot.parentId}/${slot.beforeId}`}
      label={(id) => entry(id)?.title ?? ''}
      glyph={(id) => {
        const e = entry(id)
        return e && <Icon name={e.icon} />
      }}
      carry={[
        carries(TAB_FAMILY, (id) => {
          const e = entry(id)
          return e?.kind === 'page' || e?.kind === 'space'
            ? selectTargetOf({ kind: e.kind, id, path: e.path })
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
