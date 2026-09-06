export const isAbsolute = (p: string): boolean => p.startsWith('/')

function normalize(p: string): string {
  const abs = isAbsolute(p)
  const out: string[] = []
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!abs) out.push('..')
      continue
    }
    out.push(seg)
  }
  const body = out.join('/')
  return abs ? `/${body}` : body || '.'
}

export const join = (...parts: string[]): string => normalize(parts.filter(Boolean).join('/'))

export function dirname(p: string): string {
  const trimmed = p.replace(/\/+$/, '') || (isAbsolute(p) ? '/' : '')
  const i = trimmed.lastIndexOf('/')
  if (i < 0) return '.'
  return i === 0 ? '/' : trimmed.slice(0, i)
}

export function basename(p: string, ext?: string): string {
  const trimmed = p.replace(/\/+$/, '')
  const base = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  return ext && base !== ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base
}

export function extname(p: string): string {
  const base = basename(p)
  const i = base.lastIndexOf('.')
  return i <= 0 ? '' : base.slice(i)
}

const segments = (p: string): string[] =>
  normalize(p)
    .split('/')
    .filter((s) => s && s !== '.')

export function relative(from: string, to: string): string {
  const a = segments(from)
  const b = segments(to)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/')
}

/** Joins a nexus-relative parent with a child, where an empty parent means the root itself. */
export const relJoin = (parent: string, child: string): string =>
  parent ? `${parent}/${child}` : child
