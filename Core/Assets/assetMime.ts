// One list for main's asset protocol, the picker, and the adopter — so a file the dialog offers is always one the banner can show.

export const ASSET_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export const IMAGE_EXTS = Object.keys(ASSET_MIME).map((e) => e.slice(1))
