// compare.mjs <a> <b> — every differing sample of run <a> against run <b>, as results/<a>-vs-<b>.md; exits 1 on any difference.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const load = (l) => JSON.parse(fs.readFileSync(new URL(`./results/${l}.json`, import.meta.url), 'utf8')).surfaces

// Every leaf by its dotted path; hostState is diagnosis only.
function flatten(o, at = '', out = {}) {
  if (o === null || typeof o !== 'object') {
    out[at] = o
    return out
  }
  for (const [k, v] of Object.entries(o)) if (k !== 'hostState') flatten(v, at ? `${at}.${k}` : k, out)
  return out
}

// Opacity within 0.02, a reach within 10px; durations, pointer events, and flags exactly.
const same = (path, x, y) => {
  if (typeof x === 'number' && typeof y === 'number') return Math.abs(x - y) <= (path.endsWith('.vis') ? 0.02 : 10)
  return x === y
}

export function differences(a, b) {
  const A = flatten(load(a))
  const B = flatten(load(b))
  return [...new Set([...Object.keys(A), ...Object.keys(B)])]
    .filter((p) => !same(p, A[p], B[p]))
    .map((path) => ({ path, a: A[path], b: B[path], A, B }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [a, b] = process.argv.slice(2)
  const diffs = differences(a, b)
  const lines = [`### Reveal parity: ${a} vs ${b}`, '', `**Differing samples:** ${diffs.length}`, '']
  for (const d of diffs) lines.push(`- \`${d.path}\`: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`)
  fs.writeFileSync(new URL(`./results/${a}-vs-${b}.md`, import.meta.url), `${lines.join('\n')}\n`)
  console.log(`${diffs.length} differing samples → results/${a}-vs-${b}.md`)
  process.exit(diffs.length ? 1 : 0)
}
