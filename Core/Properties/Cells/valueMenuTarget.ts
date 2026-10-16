import { type LinkMenuTarget, linkMenuTarget } from '../../Actions/connectionMenu'
import { readLinkText, resolveLink } from '../../Connections/linkValue'
import { holderOf, type ValueContext } from '../valueContext'
import type { ViewRow } from '../../Views/viewRow'

export const valueMenuTarget = (
  ctx: ValueContext,
  row: ViewRow,
  raw: string,
  hideable: boolean,
): LinkMenuTarget | null =>
  linkMenuTarget(
    resolveLink(readLinkText(raw), ctx.connections?.()?.index, holderOf(row, ctx)),
    true,
    {
      hideable,
    },
  )
