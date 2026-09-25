interface Window {
  claude?: {
    use(name: 'db'): Promise<{
      doc(path: string): {
        onSnapshot(next: (snap: { exists: boolean; data(): unknown }) => void): () => void
      }
    } | null>
  }
}
