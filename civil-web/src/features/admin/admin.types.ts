export type DirectoryKind = 'material' | 'equipment' | 'worker'

export type DirectoryItem = {
  id: string
  name: string
  kind: DirectoryKind
  category: string
  location: string
  source: string
  price: string
}
