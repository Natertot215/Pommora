import type { NexusTree } from '@shared/types'
import { BlockSurface } from '@renderer/Blocks/BlockSurface'
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
      <BlockSurface host={HOMEPAGE_HOST} />
    </InterfaceScaffold>
  )
}
