export interface PageDetail {
  id: string
  title: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
  bodyHash: string
}

export type BodyWrite = { stale: true } | { stale: false; hash: string }

export const coverOf = (detail: PageDetail): string | undefined =>
  typeof detail.frontmatter.banner === 'string' ? detail.frontmatter.banner : undefined

export const iconOf = (detail: PageDetail): string | undefined =>
  typeof detail.frontmatter.icon === 'string' ? detail.frontmatter.icon : undefined
