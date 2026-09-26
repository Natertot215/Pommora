export interface PageDetail {
  id: string
  title: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
  bodyHash: string
}

export type BodyWrite = { stale: true } | { stale: false; hash: string }

export const coverOf = ({ frontmatter }: Pick<PageDetail, 'frontmatter'>): string | undefined =>
  typeof frontmatter.banner === 'string' ? frontmatter.banner : undefined
