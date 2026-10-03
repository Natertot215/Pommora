import { Audit } from './Audit/Audit'
import { CornerMenu } from './CornerMenu'
import { LedgerLeaf } from './Ledger/LedgerLeaf'
import { LEAVES, SECTIONS } from './Leaves/registry'
import { setHashRoute, useHashRoute } from './useHashRoute'
import './showcase.css'

const VIEWS = [
  { label: 'Dashboard', icon: 'chart-area', route: '' },
  { label: 'Showcase', icon: 'swatch-book', route: LEAVES[0].id },
] as const

export function App(): React.JSX.Element {
  const route = useHashRoute()
  const leaf = LEAVES.find((l) => l.id === route)
  const view = VIEWS[leaf ? 1 : 0]

  return (
    <>
      <CornerMenu
        side="left"
        title="View"
        icon={view.icon}
        label={view.label}
        groups={[
          VIEWS.map((v) => ({
            key: v.label,
            label: v.label,
            icon: v.icon,
            checked: v === view,
            onPick: () => setHashRoute(v.route),
          })),
        ]}
      />
      {leaf ? (
        <>
          <CornerMenu
            side="right"
            title="Leaves"
            icon={leaf.icon}
            label={leaf.label}
            groups={SECTIONS.map((sec) =>
              LEAVES.filter((l) => l.section === sec.id).map((l) => ({
                key: l.id,
                label: l.label,
                icon: l.icon,
                checked: l === leaf,
                onPick: () => setHashRoute(l.id),
              })),
            )}
          />
          <main>{leaf.render()}</main>
        </>
      ) : (
        <>
          <LedgerLeaf />
          <Audit />
        </>
      )}
    </>
  )
}
