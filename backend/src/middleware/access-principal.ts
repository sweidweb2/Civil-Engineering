/**
 * HTTP-facing re-exports of the auth-module principal cache/resolver.
 * Domain services should import from `modules/auth` — not this middleware file.
 */
export {
  clearAccessPrincipalCache,
  createDbAccessPrincipalResolver,
  invalidateAccessPrincipal,
  type AccessPrincipal,
  type ResolveAccessPrincipal,
} from '../modules/auth/access-principal.js'
