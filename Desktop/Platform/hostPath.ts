const windows = process.platform === 'win32'

export const posixPath = (p: string): string => (windows ? p.replaceAll('\\', '/') : p)

export const nativePath = (p: string): string => (windows ? p.replaceAll('/', '\\') : p)
