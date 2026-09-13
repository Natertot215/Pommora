const ROOT = /^(?:[A-Za-z]:\/|\/\/(?=[^/])|\/)/

const rootOf = (p: string): string => ROOT.exec(p)?.[0] ?? ''

export const isAbsolute = (p: string): boolean => /^(?:[A-Za-z]:)?[\\/]/.test(p)

function normalize(p: string): string {
  const root = rootOf(p)
  const out: string[] = []
  for (const seg of p.slice(root.length).split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!root) out.push('..')
      continue
    }
    out.push(seg)
  }
  const body = out.join('/')
  return root ? root + body : body || '.'
}

export const join = (...parts: string[]): string =>
  normalize(
    parts
      .filter(Boolean)
      .reduce((acc, part) => (acc ? `${acc.replace(/\/+$/, '')}/${part}` : part), ''),
  )

export function dirname(p: string): string {
  const root = rootOf(p)
  const trimmed = p.replace(/\/+$/, '')
  const i = trimmed.lastIndexOf('/')
  return i < root.length ? root || '.' : trimmed.slice(0, i)
}

export function relDirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i < 0 ? '' : p.slice(0, i)
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

export const relJoin = (parent: string, child: string): string =>
  parent ? `${parent}/${child}` : child

export function basenameNoMd(name: string): string {
  return name.replace(/\.md$/i, '')
}
