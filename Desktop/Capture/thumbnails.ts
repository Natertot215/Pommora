// Written under the SYNCED thumbnails tree so a second machine gets real previews. Full-page capturePage then crop sidesteps the HiDPI rect-crop bug; JPEG has no alpha, dodging the transparent→black resize bug.

import { mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { nativeImage } from 'electron'
import type { BrowserWindow, NativeImage } from 'electron'
import { WINDOW_BG } from '@pommora/uix/Theme/colors'
import type { ThumbRect } from '@pommora/core/Interface/chrome'
import { ensureIdentity } from '@pommora/core/Nexus/identity'
import { atomicWriteBinary } from '@pommora/core/IO/atomicWrite'
import { thumbKey, thumbRel, thumbsRel } from '@pommora/core/Locations/nexusPaths'
import { assetUrl } from '@pommora/core/Platform/assetUrl'

const THUMB_WIDTH = 480

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Hides the toolbar chrome overlapping the top of the shot WITHOUT touching the live DOM, by overpainting the band in the captured bitmap. Over a full-bleed banner it back-fills by copying the block below the band up over the chrome. */
function maskTopBand(
  img: NativeImage,
  maskTopDip: number,
  fill: 'banner' | 'window',
  sf: number,
  width: number,
  height: number,
): NativeImage {
  const rows = Math.min(Math.round(maskTopDip * sf), height)
  if (rows < 1) return img
  const bmp = img.toBitmap() // B, G, R, A
  const rowBytes = width * 4
  if (fill === 'banner' && rows * 2 <= height) {
    bmp.copyWithin(0, rows * rowBytes, rows * 2 * rowBytes)
  } else {
    const [r, g, b] = hexToRgb(WINDOW_BG)
    for (let i = 0, end = rows * rowBytes; i < end; i += 4) {
      bmp[i] = b
      bmp[i + 1] = g
      bmp[i + 2] = r
      bmp[i + 3] = 255
    }
  }
  return nativeImage.createFromBitmap(bmp, { width, height, scaleFactor: sf })
}

const thumbsDir = (root: string, nexusId: string): string => join(root, thumbsRel(nexusId))

/** Null on a bad or blank capture. `capturePage(rect)` returns an empty image on HiDPI, so the whole page is grabbed and cropped in device pixels: `rect` is DIP, and `scaleFactor` maps it onto the captured image. */
export async function captureThumbnail(
  win: BrowserWindow,
  root: string,
  navKey: string,
  rect: ThumbRect,
  scaleFactor: number,
): Promise<string | null> {
  if (rect.width < 1 || rect.height < 1) return null
  const img = await win.webContents.capturePage()
  if (img.isEmpty()) return null
  const sf = scaleFactor > 0 ? scaleFactor : 1
  const { width: iw, height: ih } = img.getSize()
  const x = Math.max(0, Math.round(rect.x * sf))
  const y = Math.max(0, Math.round(rect.y * sf))
  const width = Math.min(Math.round(rect.width * sf), iw - x)
  const height = Math.min(Math.round(rect.height * sf), ih - y)
  if (width < 1 || height < 1) return null
  const cropped = img.crop({ x, y, width, height })
  if (cropped.isEmpty()) return null
  const masked = maskTopBand(
    cropped,
    rect.maskTop ?? 0,
    rect.maskFill ?? 'window',
    sf,
    width,
    height,
  )
  const buf = masked.resize({ width: THUMB_WIDTH, quality: 'good' }).toJPEG(78)
  const { id: nexusId } = await ensureIdentity(root)
  const key = thumbKey(navKey)
  const rel = thumbRel(nexusId, key)
  await mkdir(dirname(join(root, rel)), { recursive: true })
  await atomicWriteBinary(join(root, rel), buf)
  return assetUrl(rel)
}

/** The caller passes every navKey that still exists (∪ recents and pins as a fault guard), so only orphans are dropped, never a live cover. */
export async function evictThumbnails(root: string, liveKeys: string[]): Promise<void> {
  const { id: nexusId } = await ensureIdentity(root)
  const dir = thumbsDir(root, nexusId)
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return
  }
  const live = new Set(liveKeys.map(thumbKey))
  await Promise.all(
    names
      .filter((n) => n.endsWith('.jpg') && !live.has(n.slice(0, -4)))
      .map((n) => rm(join(dir, n), { force: true })),
  )
}
