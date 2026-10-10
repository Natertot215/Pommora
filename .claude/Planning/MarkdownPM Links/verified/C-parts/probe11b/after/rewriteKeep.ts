import {
  connectionText,
  expressibleHeading,
  pageEmbedPattern,
  pageEmbedText,
  pageLinkPattern,
  titleOf,
} from './connections'
import { normalizeTitle } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Paths/caseFold'
import {
  encodeLinkTarget,
  markdownLinkRegex,
  targetFragment,
  targetNamesTitle,
  targetTitle,
} from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/links'
import { wholeValueLink } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Connections/linkValue'
import { applyEdits, codeMask } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/markdownCode'
import { sectionRunsIn } from './scan'

type LinkGroups = { page: string; heading?: string; alias?: string }
const groupsOf = (args: unknown[]): LinkGroups => args[args.length - 1] as LinkGroups
const offsetOf = (args: unknown[]): number => args[args.length - 3] as number

const escapedPipe = (half: string, alias: string | undefined): string =>
  alias ? `${half.endsWith('\\') ? '\\|' : '|'}${alias}` : ''

export type RenameChange = { title: string } | { heading: string; to: string }

/** Code stays untouched — a page documenting `[[Old Title]]` in a fenced block is showing a sample. An alias and a markdown link's label ride through. */
export function rewriteConnections(body: string, oldTitle: string, newTitle: string): string {
  if (!body.includes('[[') && !body.includes('](')) return body
  const oldKey = normalizeTitle(oldTitle)
  const inCode = codeMask(body)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    if (inCode(offsetOf(args)) || normalizeTitle(titleOf(page)) !== oldKey) return match
    // A table cell's pipe-escape is re-emitted exactly as it arrived: dropping it would write a bare `|` into a cell and split the row into an extra column.
    const fragment = heading === undefined ? '' : `#${titleOf(heading)}`
    return `[[${newTitle}${fragment}${escapedPipe(heading ?? page, alias)}]]`
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

const HEADING_REFERENCE = /\[\[[^\r\n]*#|\]\([^\r\n]*#|§/

/** Rewrites every link and bare run that names `oldHeading` on the page titled `title`; a bare fragment counts only when `ownTitle` is that page, and a `§` run only when `outline` (the page's headings around the rename) is given, so a longer heading the run names keeps it. A heading the wikilink grammar can't write is never written into one. */
export function rewriteHeadingConnections(
  body: string,
  title: string,
  oldHeading: string,
  newHeading: string,
  ownTitle = '',
  outline?: readonly string[],
): string {
  if (!HEADING_REFERENCE.test(body)) return body
  const titleKey = normalizeTitle(title)
  const oldKey = normalizeTitle(oldHeading)
  const own = normalizeTitle(ownTitle) === titleKey
  const names = (page: string | null): boolean =>
    page === '' ? own : page !== null && normalizeTitle(page) === titleKey
  const inCode = codeMask(body)
  const wiki = expressibleHeading(newHeading)
  const afterLinks = body.replace(pageLinkPattern(), (match, ...args) => {
    const { page, heading, alias } = groupsOf(args)
    if (!wiki || heading === undefined || inCode(offsetOf(args))) return match
    if (!names(page) || normalizeTitle(titleOf(heading)) !== oldKey) return match
    return `[[${page}#${newHeading}${escapedPipe(heading, alias)}]]`
  })
  const inCodeEmbeds = codeMask(afterLinks)
  const afterEmbeds = afterLinks.replace(pageEmbedPattern(), (match, ...args) => {
    const { page, heading } = groupsOf(args)
    if (!wiki || heading === undefined || inCodeEmbeds(offsetOf(args))) return match
    if (!names(page) || normalizeTitle(heading) !== oldKey) return match
    return `![[${page}#${newHeading}]]`
  })
  const inCodeAfter = codeMask(afterEmbeds)
  const afterMd = afterEmbeds.replace(
    markdownLinkRegex(),
    (match, label: string, target: string, offset: number) => {
      if (inCodeAfter(offset) || !names(targetTitle(target))) return match
      if (normalizeTitle(targetFragment(target)) !== oldKey) return match
      return `[${label}](${target.slice(0, target.indexOf('#'))}#${encodeLinkTarget(newHeading)})`
    },
  )
  if (!own || !outline) return afterMd
  const inCodeFinal = codeMask(afterMd)
  return applyEdits(
    afterMd,
    sectionRunsIn(afterMd, [...outline, oldHeading], inCodeFinal)
      .filter((run) => normalizeTitle(run.heading) === oldKey)
      .map((run) => ({ from: run.from + 1, to: run.to, insert: newHeading })),
  )
}

/** Empty when the frontmatter names nothing — the cascade reads that as "no field write". */
export function rewriteFrontmatterConnections(
  values: Record<string, unknown>,
  title: string,
  change: RenameChange,
  ownTitle = '',
): Record<string, string> {
  if ('heading' in change && !expressibleHeading(change.to)) return {}
  const titleKey = normalizeTitle(title)
  const headingKey = 'heading' in change ? normalizeTitle(change.heading) : ''
  const patch: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    const link = wholeValueLink(value)
    if (link?.kind !== 'page' || normalizeTitle(link.title || ownTitle) !== titleKey) continue
    if ('heading' in change) {
      if (normalizeTitle(link.heading ?? '') === headingKey)
        patch[key] = connectionText(link.title, link.alias, change.to)
    } else if (link.title) patch[key] = connectionText(change.title, link.alias, link.heading)
  }
  return patch
}
