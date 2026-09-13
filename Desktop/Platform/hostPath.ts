export const isWindows = process.platform === 'win32'

export const posixPath = (p: string): string => (isWindows ? p.replaceAll('\\', '/') : p)

export const nativePath = (p: string): string => (isWindows ? p.replaceAll('/', '\\') : p)
