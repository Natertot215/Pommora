import type { HostPlatform } from '../Contract/bridge'
import { isAtOrUnder, join, stripMarkdownExt } from './posix'

export const PATH_FORMATS = ['absolute', 'home', 'relative'] as const
export type PathFormat = (typeof PATH_FORMATS)[number]

interface PathForm {
  format: PathFormat
  extensions: boolean
  root: string
  home: string
  platform: HostPlatform
}

/** A Nexus-relative path as Copy Path writes it; a Nexus outside the home folder copies its home-anchored paths whole. */
export function formatPath(rel: string, form: PathForm): string {
  const named = form.extensions ? rel : stripMarkdownExt(rel)
  const text = anchored(named, form)
  return form.platform === 'windows' ? text.replaceAll('/', '\\') : text
}

function anchored(rel: string, { format, root, home }: PathForm): string {
  switch (format) {
    case 'relative':
      return rel
    case 'absolute':
      return join(root, rel)
    case 'home': {
      const abs = join(root, rel)
      return isAtOrUnder(abs, home) ? `~${abs.slice(home.length)}` : abs
    }
  }
}
