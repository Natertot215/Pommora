import type { NexusTree } from '@shared/types'
import { TileHost } from '@renderer/Tiles/TileHost'
import { InterfaceScaffold } from './InterfaceScaffold'

// Module-level: a fresh literal per render would churn every tile memo downstream.
const HOMEPAGE_HOST = { kind: 'homepage' } as const

export function HomepageView({ tree }: { tree: NexusTree | null }): React.JSX.Element {
  return (
    <InterfaceScaffold
      owner={{
        path: '',
        kind: 'homepage',
        name: tree?.nexus.name ?? 'Home',
        banner: tree?.homepage.banner,
        headingIconHidden: tree?.homepage.headingIconHidden,
      }}
    >
      <TileHost host={HOMEPAGE_HOST} />
    </InterfaceScaffold>
  )
}
