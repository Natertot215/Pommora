import { scanDoc, chunksOver } from '/Users/nathantaichman/The Studio/Projects/Project Pommora/Core/MarkdownPM/Engine/docScan'
const parts: string[] = []
for (let k = 0; k < 6; k++) {
  for (let j = 0; j < 70; j++) parts.push('- item ' + j + ' [[L' + j + ']]', '  lazy continuation ' + j)
  parts.push('', '\x60\x60\x60', 'code [[C]]', 'more code', '\x60\x60\x60', '')
  for (let j = 0; j < 80; j++) parts.push('plain paragraph line ' + j + ' with [[P]]')
  parts.push('')
}
const text = parts.join('\n')
const s = scanDoc(text)
const n = s.lines.length
let mismatch = 0, total = 0
for (const [vf, vl] of [[0, 60], [37, 110], [100, 170], [130, 140], [141, 141], [200, 260], [255, 330], [400, 450], [500, 560], [700, 760]]) {
  const view = chunksOver(s, [[vf, vl]])
  for (let i = vf; i <= vl && i < n; i++) {
    const at = s.lineStarts[i]
    const vc = view.find(([a, b]) => at >= a && at <= b)
    const single = chunksOver(s, [[i, i]])
    const sc = single.find(([a, b]) => at >= a && at <= b)
    total++
    if (!vc || !sc || vc[0] !== sc[0] || vc[1] !== sc[1]) { mismatch++; if (mismatch < 6) console.log('line', i, 'view', JSON.stringify(vc), 'single', JSON.stringify(sc)) }
  }
}
console.log('lines', n, 'checked', total, 'mismatches', mismatch)
