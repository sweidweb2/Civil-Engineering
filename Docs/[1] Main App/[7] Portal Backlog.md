# Four Portals Backlog — Super / Admin / PM / Provider

**Status:** Working backlog (not a locked business batch)  
**Portals:** `/super` · `/admin` · `/pm` · `/provider`  
**Source of truth for roles:** `Docs/[1] Main App/[6] Business/[9] Features by Role.md`

Use this list to finish the four portals: pages, operations, and APIs. Prefer **UI shells first** on empty portals (PM / Provider), then wire APIs. On Admin / Super, prefer **wiring existing pages** before inventing more screens.

---

## Already in good shape (do not rebuild)

| Area | Status |
| --- | --- |
| Auth login / register + JWT | Done |
| Panel shells + nav (4 portals) | Done |
| Super: activity / error logs | Done (API) |
| Admin / Super: users pages | Partial (users API exists; some UI still mock-ish) |
| Admin: providers create / edit | Done (API) |
| Admin: projects list / detail + gallery | Done (API) |
| Notifications inbox + Super manage | Done (API) |
| DB: users, providers, categories, listings, projects, images, notifications | Tables exist |

---

## Suggested build order

1. **UI-only:** PM portal pages (nav + empty / mock screens)
2. **UI-only:** Provider portal pages (company + listings shells)
3. **Small:** Wire remaining Admin mock pages where APIs already exist
4. **CRUD:** Categories → Listings → Variations / Offers (unlocks Provider + Admin directory)
5. **Medium:** Approvals + Worker verification
6. **CRUD:** PM project depth (team, plan refs, expenses)
7. **Public marketplace browse** (guest / client)
8. **Reviews / reports / analytics**

---

## Small tasks

- Wire Admin **Users** / **User details** fully off mock store → `/api/v1/users`
- Super home: real counters (users, errors, activity) instead of placeholder copy
- Admin dashboard: replace mock analytics with real aggregates (or honest empty states)
- Provider status actions on cards (Approve / Suspend) without leaving the list
- Notification unread badge in sidebar
- Settings pages: real form fields (even if save is TBD) — currencies, units, verification toggles
- Fix Admin route consistency: `/admin/notifications` manage vs inbox (today Super manages; Admin is inbox)
- Empty states + loading polish on every existing page
- Seed data for demo (providers, categories, 1–2 listings, 1 project)

---

## UI-only tasks (pages / screens first)

Best track to get familiar with the project step by step.

### PM portal (`/pm`)

- PM home dashboard (my projects, progress, alerts)
- Projects list + create / edit (reuse Admin project UI patterns)
- Project detail tabs: Overview · Team · Plan / refs · Expenses · Docs / media · Reports
- Marketplace browse (read-only directory) inside PM
- Favorites (UI)
- Profile / settings

### Provider portal (`/provider`)

- Provider home (company status, listing counts)
- Company profile edit
- Listings list + create / edit (material / equipment / service)
- Listing detail: variations, offers, images, Active / Inactive
- Provider categories (own scope)
- Invite company users (UI)
- Marketplace browse + reviews (UI)

### Admin (still mock UI)

- Approvals: real layout for pending PM / Provider / Worker
- Worker verification: keep flow UI; drop “UI only” when API lands
- Directory moderation UI (hide listing / worker)
- Reviews moderation UI (accept / reject / hide)
- Categories: platform tree UI (parent / child)
- Reports inbox UI

### Super

- Stronger home / ops overview
- Impersonation UI (gated, later)

### Public / Client (outside the 4 portals, still needed)

- Marketplace browse (guest)
- Listing + provider + worker public detail
- Client favorites / reviews UI

---

## Medium tasks (UI + light API / glue)

- Registration approval API + wire Approvals page
- Worker verification API (`isVerified` already on User) + wire Verification page
- Platform categories API (CRUD) + wire Manage Categories
- Provider categories API (scoped) + Provider UI
- Listings API (CRUD, status `ACTIVE` / `INACTIVE`) + Admin hide + Provider manage
- Listing variations + offers endpoints
- Listing images via `FileEntityType.LISTING`
- Directory search / filter API (providers, listings, workers)
- Reviews model + moderate API
- Reports model + Admin handle API
- Admin analytics real queries
- Activity log coverage for important mutations
- Authz: owner vs admin vs invited provider user

---

## CRUD / backend-heavy tasks

### Providers

- Invite provider users (membership table)
- Soft-remove / preserve history rules

### Listings marketplace

- Full listings + variations + offers + `specs` Json
- Soft hide (`INACTIVE`); no hard destroy when referenced

### Workers

- Worker profile model (CV, portfolio, rates, visibility)
- Public discoverability only when verified

### PM projects (beyond current Admin CRUD)

- Collaborators (add / remove PMs)
- Ownership transfer
- Archive / restore / reopen
- Project currency
- Planned materials / equipment / workers (internal refs + price snapshot)
- Material qty tracking (purchased / used / wasted / remaining)
- Virtual workers
- Actual expenses CRUD (module stub exists)
- Budget / revenue / profit + variance
- Documents & financial attachments
- Reports generation

### Expenses / materials modules

- Replace `notImplemented` stubs with real Prisma + services

### Files

- Finish `LISTING` / `PROJECT` authz for uploads
- Consistent WEBP path for listing images (project images already convert)

---

## Portal completeness checklist

### Super

- [ ] Home with live ops metrics
- [x] Users list / detail
- [x] Activity logs
- [x] Error logs
- [x] Notifications manage
- [ ] Settings (real persistence)
- [ ] Impersonation / support access (later)

### Admin

- [ ] Dashboard (real analytics)
- [ ] Approvals (API-backed)
- [x] Users
- [ ] Worker verification (API-backed)
- [x] Providers
- [x] Projects (+ gallery)
- [ ] Directory (API-backed moderation)
- [ ] Reviews (API-backed)
- [ ] Categories (API-backed)
- [x] Notifications (inbox; manage consistency TBD)
- [ ] Settings (real persistence)

### PM

- [ ] Home
- [ ] Projects CRUD (own)
- [ ] Project depth (team, plan, expenses, docs, reports)
- [ ] Marketplace browse / reference
- [x] Notifications inbox
- [ ] Profile / settings

### Provider

- [ ] Home
- [ ] Company profile
- [ ] Listings + variations + offers + images
- [ ] Provider categories
- [ ] Invite company users
- [x] Notifications inbox
- [ ] Profile / settings

---

## Notes

- Marketplace rule remains locked: Discover → View → Contact externally. No orders, checkout, rental booking, or hire on platform.
- Exact domain boundaries (e.g. invited provider membership) may still evolve — ask before locking new tables beyond what business docs already describe.
- Update this file as items ship; move done rows into “Already in good shape” when stable.
