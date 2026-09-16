import {
  connectionText,
  normalizeTitle,
  pageEmbedPattern,
  pageEmbedText,
  pageLinkPattern,
  titleOf,
} from './connections'
import {
  encodeLinkTarget,
  markdownLinkRegex,
  targetFragment,
  targetNamesTitle,
  targetTitle,
} from './links'
import { linkNamesTitle, readLink } from './linkValue'
import { codeMask } from '../MarkdownPM/Engine/markdownCode'
import { sectionRunsIn } from './scan'

type LinkGroups = { page: string; heading?: string; alias?: string }
const groupsOf = (args: unknown[]): LinkGroups => args[args.length - 1] as LinkGroups
const offsetOf = (args: unknown[]): number => args[args.length - 3] as number

const escapedPipe = (half: string, alias: string | undefined): string =>
  alias ? `${half.endsWith('\\') ? '\\|' : '|'}${alias}` : ''

/** Code stays untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample. An alias and a markdown link's label ride through. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    const last = heading ?? page
    if (inCode(offsetOf(args)) || normalizeTitle(titleOf(page)) !== oldKey) return match
    // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a bare `|` into a cell and split the row into an extra column.
    const fragment = heading === undefined ? '' : `#${heading}`
    return `[[${newTitle}${fragment}${escapedPipe(last, alias)}]]`
  })
  // The embed pass sees POST-link-pass offsets — its mask must be built over the same string, or any length-changing link rewrite above shifts every later offset off the original mask.
  const inCodeAfter = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(pageEmbedPattern(), (match, ...args) => {
    const { page, heading } = groupsOf(args)
    if (inCodeAfter(offsetOf(args)) || normalizeTitle(page) !== oldKey) return match
    return heading === undefined ? pageEmbedText(newTitle) : `![[${newTitle}#${heading}]]`
  })
  // Rebuilt for the same reason. Only a target that NAMES a page moves, so a URL whose last segment happens to match the renamed title is left as written.
  const inCodeFinal = codeMask(afterEmbeds)
  return afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      if (inCodeFinal(offset) || !targetNamesTitle(target, oldKey)) return match
      const hash = target.indexOf('#')
      const fragment = hash === -1 ? '' : target.slice(hash)
      return `[${label}](${encodeLinkTarget(newTitle)}${fragment})`
    },
  )
}

/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment or `§` run counts only when `ownTitle` is that page. */
export function rewriteHeadingConnections(
  body: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  ownTitle = '',
  runs = false,
): string {
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  const own = normalizeTitle(ownTitle) === titleKey
  const names = (page: string | null): boolean =>
    page === '' ? own : page !== null && normalizeTitle(page) === titleKey
  const inCode = codeMask(body)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    if (heading === undefined || inCode(offsetOf(args))) return match
    if (!names(page) || normalizeTitle(titleOf(heading)) !== oldKey) return match
    return `[[${page}#${newHeading}${escapedPipe(heading, alias)}]]`
  })
  const inCodeAfter = codeMask(afterLinks)
  const afterMd = afterLinks.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      if (inCodeAfter(offset) || !names(targetTitle(target))) return match
      if (normalizeTitle(targetFragment(target)) !== oldKey) return match
      return `[${label}](${target.slice(0, target.indexOf('#'))}#${encodeLinkTarget(newHeading)})`
    },
  )
  if (!own || !runs) return afterMd
  const inCodeFinal = codeMask(afterMd)
  let out = afterMd
  for (const run of sectionRunsIn(afterMd, [oldHeading], inCodeFinal).reverse())
    out = `${out.slice(0, run.from + 1)}${newHeading}${out.slice(run.to)}`
  return out
}

/** Empty when the frontmatter names nothing — the cascade reads that as "no field write". */
export function rewriteFrontmatterConnections(
  values: Record<string, unknown>,
  oldKey: string,
  newTitle: string,
): Record<string, string> {
  const patch: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && linkNamesTitle(value, oldKey))
      patch[key] = connectionText(newTitle, readLink(value).alias)
  }
  return patch
}
