/**
 * Provider settings reuse the shared account profile/password schemas.
 * Kept as a thin re-export so existing provider imports keep working.
 */
export {
  accountPasswordSchema as providerPasswordSchema,
  accountProfileSchema as providerProfileSchema,
  type AccountPasswordValues as ProviderPasswordValues,
  type AccountProfileValues as ProviderProfileValues,
} from '@/features/account/account.schema'
