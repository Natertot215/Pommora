// compare.mjs <a> <b> — every rendered line, screenshot, behavior, and latency of run <a> against run <b>, as results/<a>-vs-<b>.md.
import fs from 'node:fs'
import zlib from 'node:zlib'

const [a, b] = process.argv.slice(2)
const load = (l) => JSON.parse(fs.readFileSync(new URL(`./results/${l}.json`, import.meta.url), 'utf8'))
const A = load(a)
const B = load(b)

// CDP writes 8-bit RGBA or RGB PNGs, non-interlaced: inflate the IDAT stream and undo each row's filter.
function pixels(file) {
  const buf = fs.readFileSync(new URL(file, import.meta.url))
  let at = 8
  let width = 0
  let height = 0
  let channels = 4
  const idat = []
  while (at < buf.length) {
    const len = buf.readUInt32BE(at)
    const kind = buf.toString('latin1', at + 4, at + 8)
    const data = buf.subarray(at + 8, at + 8 + len)
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      channels = data[9] === 6 ? 4 : 3
    }
    if (kind === 'IDAT') idat.push(data)
    at += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]
      const left = x >= channels ? out[y * stride + x - channels] : 0
      const up = y > 0 ? out[(y - 1) * stride + x] : 0
      const ul = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0
      const p = left + up - ul
      const pa = Math.abs(p - left)
      const pb = Math.abs(p - up)
      const pc = Math.abs(p - ul)
      const paeth = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul
      out[y * stride + x] = (v + [0, left, up, (left + up) >> 1, paeth][f]) & 255
    }
  }
  return { width, height, channels, out }
}

function pixelDiff(fa, fb) {
  const x = pixels(fa)
  const y = pixels(fb)
  if (x.width !== y.width || x.height !== y.height) return { differing: -1, size: [x.width, x.height, y.width, y.height] }
  let differing = 0
  const box = [Infinity, Infinity, -1, -1]
  for (let i = 0; i < x.out.length; i += x.channels)
    for (let k = 0; k < 3; k++)
      if (x.out[i + k] !== y.out[i + k]) {
        differing++
        const px = (i / x.channels) % x.width
        const py = Math.floor(i / x.channels / x.width)
        box[0] = Math.min(box[0], px)
        box[1] = Math.min(box[1], py)
        box[2] = Math.max(box[2], px)
        box[3] = Math.max(box[3], py)
        break
      }
  return { differing, total: x.width * x.height, box: differing ? box : undefined }
}

const lines = []
const say = (s = '') => lines.push(s)
say(`### Parity: ${a} vs ${b}`)
say()
let renderDiffs = 0
for (const page of Object.keys(A.pages)) {
  const pa = A.pages[page]
  const pb = B.pages[page]
  const keys = [...new Set([...Object.keys(pa.lines), ...Object.keys(pb?.lines ?? {})])].sort((x, y) => x - y)
  const diffs = keys.filter((k) => JSON.stringify(pa.lines[k]) !== JSON.stringify(pb?.lines[k]))
  renderDiffs += diffs.length
  say(`#### ${page}: ${diffs.length} of ${keys.length} lines differ`)
  for (const k of diffs.slice(0, 40)) {
    say(`- line at ${k}`)
    say(`  - ${a}: \`${JSON.stringify(pa.lines[k])}\``)
    say(`  - ${b}: \`${JSON.stringify(pb?.lines[k])}\``)
  }
  for (const shot of pa.shots) {
    const other = pb?.shots.includes(shot)
    const d = other ? pixelDiff(`./results/${a}/${shot}`, `./results/${b}/${shot}`) : { differing: 'missing' }
    say(`- screenshot \`${shot}\`: ${d.differing} differing pixels${d.total ? ` of ${d.total}` : ''}${d.box ? ` in [${d.box.join(', ')}]` : ''}`)
  }
  say()
}
say('#### Behaviors')
for (const name of Object.keys(A.behaviors)) {
  const same = JSON.stringify(A.behaviors[name]) === JSON.stringify(B.behaviors[name])
  say(`- **${name}** — ${same ? 'same' : 'DIFFERENT'}`)
  say(`  - ${a}: \`${JSON.stringify(A.behaviors[name])}\``)
  if (!same) say(`  - ${b}: \`${JSON.stringify(B.behaviors[name])}\``)
}
say()
say('#### Latency (median / p90 ms per keystroke)')
for (const page of Object.keys(A.latency))
  say(`- ${page}: ${a} ${A.latency[page].median} / ${A.latency[page].p90} · ${b} ${B.latency[page]?.median} / ${B.latency[page]?.p90}`)
say()
say(`**Rendered lines differing:** ${renderDiffs}`)
fs.writeFileSync(new URL(`./results/${a}-vs-${b}.md`, import.meta.url), lines.join('\n'))
console.log(lines.slice(-1)[0])
