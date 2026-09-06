// One definition so a non-Electron host (mobile WebView) can swap the scheme in a single place. Encoded per segment, not `encodeURI` over the whole path: that helper leaves `#` and `?` alone, so a file named `Draft #2.png` would truncate at the fragment and 404.

export const assetUrl = (rel: string): string =>
  `nexus-asset://nexus/${rel.split('/').map(encodeURIComponent).join('/')}`
