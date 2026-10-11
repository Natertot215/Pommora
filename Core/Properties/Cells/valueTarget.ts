import type { ConnPage } from '../../Connections/pageIndex'
import { wholeLinkToken } from '../../MarkdownPM/Engine/tokens'
import {
  type ConnectionsApi,
  type LinkMenuTarget,
  linkMenuTarget,
  type MdTarget,
  tokenTarget,
} from '../../MarkdownPM/Links/connectionsApi'
import { heldTarget } from '../../MarkdownPM/Links/linkClicks'
import { heldBy } from '../../MarkdownPM/api'
import { cellTokens } from '../../MarkdownPM/Tables/cellStatic'
import { isValidLink } from '../../Paths/urlPath'
import { holderOf, type ValueContext } from '../valueContext'
import type { ViewRow } from '../../Views/viewRow'

export function valueTarget(
  api: ConnectionsApi | undefined,
  raw: string,
  holder?: ConnPage,
): MdTarget {
  const text = raw.trim()
  const tk = wholeLinkToken(cellTokens(text), text)
  if (tk) return heldTarget(tokenTarget(api, text, tk), heldBy(holder))
  return isValidLink(text) ? { kind: 'url', url: text } : { kind: 'invalid' }
}

export const valueMenuTarget = (
  ctx: ValueContext,
  row: ViewRow,
  raw: string,
  hideable: boolean,
): LinkMenuTarget | null =>
  linkMenuTarget(valueTarget(ctx.connections?.(), raw, holderOf(row, ctx)), true, { hideable })
