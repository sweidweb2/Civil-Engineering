/**
 * Provider settings reuse the shared account profile/password schemas.
 * Kept as a thin re-export so existing provider imports keep working.
 */
export {
  accountPasswordSchema as providerPasswordSchema,
  type AccountPasswordValues as ProviderPasswordValues,
  accountProfileSchema as providerProfileSchema,
  type AccountProfileValues as ProviderProfileValues,
} from '@/features/account/account.schema'
