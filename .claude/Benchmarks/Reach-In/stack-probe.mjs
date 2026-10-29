// stack-probe.mjs <worktree> — profiling only: while globalThis.__benchIo.stacks is an object, each counted machine call tallies the call chain that made it.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const p = join(process.argv[2], 'Desktop/Platform/nodeMachine.ts')
const s = readFileSync(p, 'utf8')
const anchor = "    benchIo.calls[name] = (benchIo.calls[name] ?? 0) + 1\n"
if (!s.includes(anchor) || s.includes('benchIo.stacks')) throw new Error('anchor missing or already probed')
writeFileSync(p, s.replace(anchor, `${anchor}    const stacks = (benchIo as any).stacks
    if (stacks) {
      const chain = (new Error().stack ?? '').split('\\n').slice(2, 9).map((l) => l.trim().replace(/^at (async )?/, '').split(' ')[0]).join(' < ')
      const of = (stacks[name] ??= {})
      of[chain] = (of[chain] ?? 0) + 1
    }
`))
console.log('probed', p)
