import { radiusOf } from './forces'

export type NodeKind = 'page' | 'folder' | 'space'
export type LinkKind = 'body' | 'citation' | 'frontmatter' | 'space' | 'location'
export type ConnectionKind = Extract<LinkKind, 'body' | 'citation' | 'frontmatter'>
export type GroupMode = 'connection' | 'location' | 'space'

export interface GraphInput {
  pages: Array<{ id: string; title: string; icon?: string; folderId: string; spaceIds: string[] }>
  folders: Array<{ id: string; title: string; icon?: string; parentId: string | null }>
  spaces: Array<{ id: string; title: string; icon?: string; spaceIds: string[] }>
  connections: Array<{ from: string; to: string; kind: ConnectionKind }>
}

interface BuildOptions {
  mode: GroupMode
  hideUnlinked: boolean
  visible: ReadonlySet<string> | null
}

export interface GraphNode {
  id: string
  kind: NodeKind
  title: string
  icon?: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  degree: number
  pinned: boolean
}

export interface GraphLink {
  source: number
  target: number
  kind: LinkKind
}

export interface Graph {
  nodes: GraphNode[]
  links: GraphLink[]
  index: Map<string, number>
}

type Inbound = Record<LinkKind, number>

const noInbound = (): Inbound => ({ body: 0, citation: 0, frontmatter: 0, space: 0, location: 0 })

export function buildGraph(input: GraphInput, options: BuildOptions): Graph {
  const nodes: GraphNode[] = []
  const index = new Map<string, number>()
  const add = (id: string, kind: NodeKind, title: string, icon?: string): void => {
    index.set(id, nodes.length)
    nodes.push({
      id,
      kind,
      title,
      icon,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 0,
      degree: 0,
      pinned: false,
    })
  }

  for (const p of input.pages)
    if (!options.visible || options.visible.has(p.id)) add(p.id, 'page', p.title, p.icon)
  if (options.mode === 'location')
    for (const f of input.folders) add(f.id, 'folder', f.title, f.icon)
  if (options.mode === 'space')
    for (const s of input.spaces)
      if (!options.visible || options.visible.has(s.id)) add(s.id, 'space', s.title, s.icon)

  const links: GraphLink[] = []
  const link = (from: string, to: string, kind: LinkKind): void => {
    const source = index.get(from)
    const target = index.get(to)
    if (source !== undefined && target !== undefined && source !== target)
      links.push({ source, target, kind })
  }

  for (const c of input.connections) link(c.from, c.to, c.kind)
  if (options.mode === 'location') {
    for (const p of input.pages) link(p.id, p.folderId, 'location')
    for (const f of input.folders) if (f.parentId) link(f.id, f.parentId, 'location')
  }
  if (options.mode === 'space') {
    for (const p of input.pages) for (const s of p.spaceIds) link(p.id, s, 'space')
    const drawn = new Set<string>()
    for (const s of input.spaces)
      for (const t of s.spaceIds) {
        const pair = s.id < t ? `${s.id}\u0000${t}` : `${t}\u0000${s.id}`
        if (drawn.has(pair)) continue
        drawn.add(pair)
        link(s.id, t, 'space')
      }
  }

  const inbound = nodes.map(noInbound)
  const spaceLinks = new Array<number>(nodes.length).fill(0)
  for (const l of links) {
    nodes[l.source].degree++
    nodes[l.target].degree++
    inbound[l.target][l.kind]++
    if (nodes[l.source].kind === 'space' && nodes[l.target].kind === 'space') {
      spaceLinks[l.source]++
      spaceLinks[l.target]++
    }
  }

  const members = new Array<number>(nodes.length).fill(0)
  const parentOf = new Map(input.folders.map((f) => [f.id, f.parentId]))
  for (const p of input.pages) {
    if (!index.has(p.id)) continue
    for (let f: string | null = p.folderId; f !== null; f = parentOf.get(f) ?? null) {
      const i = index.get(f)
      if (i !== undefined) members[i]++
    }
    for (const sp of p.spaceIds) {
      const i = index.get(sp)
      if (i !== undefined) members[i]++
    }
  }

  const keep = nodes.map(
    (n, i) =>
      !options.hideUnlinked ||
      (n.degree > 0 && (n.kind === 'page' || members[i] > 0 || spaceLinks[i] > 0)),
  )
  nodes.forEach((n, i) => {
    n.radius = radiusOf(n.kind, inbound[i], members[i], spaceLinks[i])
  })
  return compact(nodes, links, keep)
}

function compact(all: GraphNode[], allLinks: GraphLink[], keep: boolean[]): Graph {
  const remap = new Map<number, number>()
  const nodes: GraphNode[] = []
  const index = new Map<string, number>()
  all.forEach((n, i) => {
    if (!keep[i]) return
    remap.set(i, nodes.length)
    index.set(n.id, nodes.length)
    nodes.push(n)
  })
  for (const n of nodes) n.degree = 0
  const links: GraphLink[] = []
  for (const l of allLinks) {
    const source = remap.get(l.source)
    const target = remap.get(l.target)
    if (source === undefined || target === undefined) continue
    links.push({ source, target, kind: l.kind })
    nodes[source].degree++
    nodes[target].degree++
  }
  return { nodes, links, index }
}
