// THE math ranges for a doc — the shared line scan's math half, kept as its own door for the
// callers that need nothing else: the block resolver, the list-item gesture, and the drag models.
import { docLineScan } from './embedRanges'

export function docMathRanges(doc: string): [number, number][] {
  return docLineScan(doc).maths
}
