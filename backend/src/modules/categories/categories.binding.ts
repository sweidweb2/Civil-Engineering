import { validationError } from '../../errors/app-error.js'
import type { CategoriesService } from './categories.service.js'

/**
 * Validates the categoryId binding for a step input: CATEGORY inputs require an existing
 * platform category; every other input type must not carry one. Returns the id to persist.
 */
export async function assertCategoryBinding(
  categories: Pick<CategoriesService, 'requirePlatformCategory'>,
  inputTypeCode: string,
  categoryId: string | null | undefined,
): Promise<string | null> {
  const isCategory = inputTypeCode.toUpperCase() === 'CATEGORY'
  if (isCategory) {
    if (!categoryId) {
      throw validationError('Category is required for CATEGORY inputs')
    }
    await categories.requirePlatformCategory(categoryId)
    return categoryId
  }
  if (categoryId) {
    throw validationError('categoryId is only allowed for CATEGORY inputs')
  }
  return null
}
