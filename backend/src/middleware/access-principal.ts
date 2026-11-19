/**
 * HTTP-facing re-exports of the auth-module principal cache/resolver.
 * Domain services should import from `modules/auth` — not this middleware file.
 */
export {
  type AccessPrincipal,
  clearAccessPrincipalCache,
  createDbAccessPrincipalResolver,
  invalidateAccessPrincipal,
  type ResolveAccessPrincipal,
} from '../modules/auth/access-principal.js'
