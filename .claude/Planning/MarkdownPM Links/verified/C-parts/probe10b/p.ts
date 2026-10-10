const R = '/Users/nathantaichman/The Studio/Projects/Project Pommora'
import { cellToSource } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/Tables/codec'
import { scanDoc } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/docScan'
import { cellCommitChange } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Tables/sync'
import { applyEdits } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/markdownCode'
import { changesTo } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/Pages/merge3'
import { ChangeSet, Text } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/node_modules/@codemirror/state/dist/index.js'
void R
const doc = '| a | b |\n| - | - |\n| x | y |\n'
// (b) mapping formula against sync's actual write shape
const cases: [string, string][] = [
  ['pre [d.co](https://d.co) post', '[d.co](https://d.co)'],
  ['a|b [d.co](https://d.co|x) c', '[d.co](https://d.co|x)'],
  ['line1\nline2 [d.co](https://d.co)', '[d.co](https://d.co)'],
  ['back\\ [d.co](https://d.co)', '[d.co](https://d.co)'],
  ['x\\\\[d.co](https://d.co)', '[d.co](https://d.co)'],
]
for (const [display, link] of cases) {
  const scan = scanDoc(doc)
  const ch = cellCommitChange(scan, 0, 1, 1, display)!
  const after = applyEdits(doc, [ch])
  const seg = scan.tables[0].rows[1].segments[1]
  const p = display.indexOf(link)
  const from = seg[0] + 1 + cellToSource(display.slice(0, p)).length
  const to = seg[0] + 1 + cellToSource(display.slice(0, p + link.length)).length
  console.log(JSON.stringify(display), 'slice ok:', after.slice(from, to) === cellToSource(link), JSON.stringify(after.slice(from, to)))
}
// additivity of escapeCell at an arbitrary cut
const t = 'a\\|b'
console.log('additive at cut 2?', cellToSource(t.slice(0, 2)) + cellToSource(t.slice(2)) === cellToSource(t), JSON.stringify(cellToSource(t.slice(0, 2))), JSON.stringify(cellToSource(t)))
// whole-segment replace vs minimal diff: does a pending span survive a keystroke elsewhere in the cell?
const before = '| a | b |\n| - | - |\n| x | pre [d.co](https://d.co) |\n'
const sc = scanDoc(before)
const seg = sc.tables[0].rows[1].segments[1]
const pFrom = before.indexOf('[d.co]'), pTo = pFrom + '[d.co](https://d.co)'.length
const whole = cellCommitChange(sc, 0, 1, 1, 'pree [d.co](https://d.co)')!
const csWhole = ChangeSet.of([whole], before.length)
console.log('whole replace maps entry to', csWhole.mapPos(pFrom, 1), csWhole.mapPos(pTo, -1), '(dropped if to<=from)')
const segText = before.slice(seg[0], seg[1])
const minimal = changesTo(segText, ` ${cellToSource('pree [d.co](https://d.co)')} `).map((c) => ({ ...c, from: c.from + seg[0], to: c.to + seg[0] }))
const csMin = ChangeSet.of(minimal, before.length)
const after2 = csMin.apply(Text.of(before.split('\n'))).toString()
const f2 = csMin.mapPos(pFrom, 1), t2 = csMin.mapPos(pTo, -1)
console.log('minimal diff', JSON.stringify(minimal), 'maps entry to', f2, t2, 'text kept:', after2.slice(f2, t2) === '[d.co](https://d.co)')
console.log('same result as whole replace:', after2 === applyEdits(before, [whole]))
// identical text: a second sweep's commit rewrites nothing under the minimal diff, while today's write is a non-empty change
const same = ' pre [d.co](https://d.co) '
console.log('changesTo identical:', JSON.stringify(changesTo(same, same)))
const idem = cellCommitChange(sc, 0, 1, 1, 'pre [d.co](https://d.co)')!
console.log('today identical commit is a change:', JSON.stringify(idem), 'empty?', ChangeSet.of([idem], before.length).empty)
// ragged row: no segment for the padded column
const ragged = '| a | b |\n| - | - |\n| x |\n'
const rs = scanDoc(ragged)
console.log('ragged segments:', JSON.stringify(rs.tables[0].rows[1].segments), 'commit:', JSON.stringify(cellCommitChange(rs, 0, 1, 1, '[d.co](https://d.co)')))
