import { type LinkMenuTarget, linkMenuTarget } from '../../Actions/connectionMenu'
import { readLinkText, resolveLink } from '../../Connections/linkValue'
import { holderOf, type ValueContext } from '../valueContext'
import type { ViewRow } from '../../Views/viewRow'
import type { HideFrom } from '../../Actions/cellMenu'

export const valueMenuTarget = (
  ctx: ValueContext,
  row: ViewRow,
  raw: string,
  hideable?: HideFrom,
): LinkMenuTarget | null =>
  linkMenuTarget(
    resolveLink(readLinkText(raw), ctx.connections?.()?.index, holderOf(row, ctx)),
    true,
    {
      hideable,
    },
  )
