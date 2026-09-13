// @fontsource-variable/inter ships CSS only, so the side-effect import is declared here.
declare module '@fontsource-variable/inter'

interface Window {
  claude?: {
    use(name: 'db'): Promise<{
      doc(path: string): {
        onSnapshot(next: (snap: { exists: boolean; data(): unknown }) => void): () => void
      }
    } | null>
  }
}
