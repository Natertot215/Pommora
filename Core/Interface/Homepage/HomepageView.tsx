import type { NexusTree } from '../../Nexus/tree'
import { HOMEPAGE_HOST } from '../../Tiles/tiles'
import { TileHost } from '../../Tiles/TileHost'
import { InterfaceScaffold } from '../InterfaceScaffold'

export function HomepageView({ tree }: { tree: NexusTree | null }): React.JSX.Element {
  return (
    <InterfaceScaffold
      owner={{
        path: '',
        kind: 'homepage',
        title: tree?.nexus.name ?? 'Home',
        banner: tree?.homepage.banner,
        headingIconHidden: tree?.homepage.headingIconHidden,
      }}
    >
      <TileHost key={tree?.nexus.rootPath} host={HOMEPAGE_HOST} />
    </InterfaceScaffold>
  )
}
