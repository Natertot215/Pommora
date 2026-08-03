// THE math ranges for a doc — one derivation of the exclusion set (a `$$` line inside a fence or
// table region is content there, never a delimiter). Every layer that must agree on what block math
// is reads THIS: the block resolver, the list-item gesture, and the decoration pass's construct gate.
import { blockMathRanges, fencedCodeRanges } from '../detect'
import { tableRegions } from '../Tables/regions'

export function docMathRanges(doc: string): [number, number][] {
  return blockMathRanges(doc, [
    ...fencedCodeRanges(doc),
    ...tableRegions(doc).map((r): [number, number] => [r.from, r.to]),
  ])
}
