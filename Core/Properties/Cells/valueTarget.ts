import type { ConnPage } from '../../Connections/pageIndex'
import { wholeLinkToken } from '../../MarkdownPM/Engine/tokens'
import {
  type ConnectionsApi,
  type MdTarget,
  tokenTarget,
} from '../../MarkdownPM/Links/connectionsApi'
import { heldTarget } from '../../MarkdownPM/Links/linkClicks'
import { cellTokens } from '../../MarkdownPM/Tables/cellStatic'
import { isValidLink } from '../../Paths/urlPath'

export function valueTarget(
  api: ConnectionsApi | undefined,
  raw: string,
  holder?: ConnPage,
): MdTarget {
  const text = raw.trim()
  const tk = wholeLinkToken(cellTokens(text), text)
  if (tk)
    return heldTarget(tokenTarget(api, text, tk), holder ? { kind: 'held', page: holder } : null)
  return isValidLink(text) ? { kind: 'url', url: text } : { kind: 'invalid' }
}
