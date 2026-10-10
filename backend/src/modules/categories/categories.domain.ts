import type { DomainDefinition } from '../_shared/domain-definition.js'

export const categoriesDomain = {
  name: 'categories',
  responsibility:
    'Owns the two-level category tree. Platform categories are admin-managed and global. Provider categories stay on the same model for a later provider flow.',
  entities: [
    {
      name: 'Category',
      description:
        'Named catalog node with kind, slug, optional parent, and active flag. Platform rows have no provider.',
    },
  ],
  valueObjects: [
    {
      name: 'CategoryKind',
      description: 'MATERIAL | EQUIPMENT | SERVICE | WORKER.',
    },
    {
      name: 'CategoryScope',
      description: 'PLATFORM | PROVIDER. This API writes PLATFORM only.',
    },
  ],
  useCases: ['listCategories', 'getCategoryById', 'createCategory', 'updateCategory', 'deleteCategory'],
  relationships: [
    'Category.parentId → Category, one level only.',
    'Listing.categoryId → Category.',
    'Provider categories will use Category.providerId later.',
  ],
  externalAccessRules: [
    'Other modules read categories only through the public categories service.',
    'Creating, editing, and deleting platform categories is admin-only.',
    'A category with subcategories or listings cannot be deleted.',
  ],
} as const satisfies DomainDefinition
