import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markBody } from '@pommora/core/Assets/logoSvg'
import { MARK_BOX } from '@pommora/uix/Symbols/mark'

const DESKTOP = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOC = join(DESKTOP, 'build', 'Pommora.icon')
const CANVAS = 1024
const FRACTION = 0.76 // KNOB — the mark's share of the canvas; raise it to fill more of the tile

const scale = (CANVAS * FRACTION) / MARK_BOX
const inset = (CANVAS - CANVAS * FRACTION) / 2
mkdirSync(join(DOC, 'Assets'), { recursive: true })
writeFileSync(
  join(DOC, 'Assets', 'Mark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}"><g transform="translate(${inset} ${inset}) scale(${scale})">${markBody('logo', '#ffffff')}</g></svg>`,
)
console.log('Mark.svg painted from the mark')

if (process.platform !== 'darwin' || spawnSync('which', ['actool']).status !== 0) {
  console.log('actool unavailable — skipping the development render')
  process.exit(0)
}

// actool's flags match app-builder-lib/out/util/macosIconComposer.js, so development and a packaged
// build compile the same catalog from the same document.
const work = mkdtempSync(join(tmpdir(), 'pommora-icon-'))
const staged = join(work, 'Icon.icon')
const out = join(work, 'out')
cpSync(DOC, staged, { recursive: true })
mkdirSync(out, { recursive: true })
try {
  execFileSync('actool', [
    staged,
    '--compile',
    out,
    '--output-format',
    'human-readable-text',
    '--notices',
    '--warnings',
    '--output-partial-info-plist',
    join(out, 'partial.plist'),
    '--app-icon',
    'Icon',
    '--include-all-app-icons',
    '--accent-color',
    'AccentColor',
    '--enable-on-demand-resources',
    'NO',
    '--development-region',
    'en',
    '--target-device',
    'mac',
    '--minimum-deployment-target',
    '26.0',
    '--platform',
    'macosx',
  ])
  execFileSync('sips', [
    '-s',
    'format',
    'png',
    '--resampleHeightWidth',
    '1024',
    '1024',
    join(out, 'Icon.icns'),
    '--out',
    join(DESKTOP, 'build', 'icon.png'),
  ])
  console.log("icon.png rendered at Apple's icon grid")
} finally {
  rmSync(work, { recursive: true, force: true })
}
