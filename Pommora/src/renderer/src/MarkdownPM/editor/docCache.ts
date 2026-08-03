// One string materialization + one whole-doc scan per doc VERSION, shared by every extension that runs per
// keystroke / caret move. CM's Text.toString() re-joins the rope on every call and each scan re-splits the
// result — with several extensions each doing both per transaction, this was the lag source. Keyed on the
// immutable Text via WeakMap, so old versions collect with the history.
import type { Text } from '@codemirror/state'
import { scanDoc, type DocScan } from '../decorations/intent'

const strings = new WeakMap<Text, string>()
export function docString(doc: Text): string {
  let s = strings.get(doc)
  if (s === undefined) {
    s = doc.toString()
    strings.set(doc, s)
  }
  return s
}

// The decoration pass's whole-doc scans (split + fences + callouts + fence ranges), one per doc
// VERSION — a caret move must never pay an O(doc) re-scan for line chrome that only the text defines.
const scans = new WeakMap<Text, DocScan>()
export function docScan(doc: Text): DocScan {
  let s = scans.get(doc)
  if (!s) {
    s = scanDoc(docString(doc))
    scans.set(doc, s)
  }
  return s
}
