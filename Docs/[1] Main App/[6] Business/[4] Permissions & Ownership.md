# Batch 4 — Permissions & Ownership

**Status:** LOCKED v4 (marketplace correction applied)

Who can see / create / edit / delete / approve everything.

This will be extremely important because you have Admin, PMs, Providers, Workers, Clients, project collaborators, and virtual employees.

**Marketplace correction — LOCKED:** Discover → View information → Contact externally. Inside a PM project: Plan → Assign/reference → Calculate → Record actual expenses. No orders, rentals, checkout, or role-to-role transactions on the platform.

---

# BUSINESS LOGIC — LOCKED v4

# Permissions & Ownership

## 1. General Permission Philosophy

The platform uses a SIMPLE OWNERSHIP model.

Default rule:

> The owner controls their entity.

Admin has full platform permissions.

Additional permissions are only introduced where the business explicitly
requires them.

The system should NOT create unnecessary fine-grained permissions.

Browsing marketplace records does not grant ownership, collaboration,
or a commercial relationship.

---

## 2. Admin

Admin has full permissions across the platform.

Admin can:

- View everything
- Create/edit/delete/manage platform entities
- Manage users
- Manage projects
- Manage providers
- Manage workers
- Manage marketplace directory data
- Manage platform operations

Admin can also impersonate/access a user's account when needed for support,
troubleshooting, or management.

---

## 3. Project Ownership

The PM who creates a project is the:

> Project Owner

Other PMs can be added as:

> Collaborators

The owner can:

- Manage the project
- Add/remove collaborators
- Transfer ownership
- Delete the project

Project Owner and PM collaborators have access to the same complete
project data. There is no feature-level permission system.

The owner can add/remove collaborators at any time and can transfer
ownership to another PM. See Batch 8.

---

## 4. Project Workers

Workers do **not** get project access. There is no project card/cover
visibility.

Their project relationship is an internal PM/project record, not a
user permission relationship.

Workers cannot access:

- Project information
- Costs
- Expenses
- Materials
- Documents
- Other workers
- Tasks
- Project management features

Assignment is not a hire, rent, or contract on the platform.

See Batch 8.

---

## 5. Internal / Virtual Workers

A PM can add workers who do not have platform accounts.

These are virtual project records.

They have no platform permissions or authentication relationship.

They exist only for project management, costing, and records.

---

## 6. Provider / Company Model

A Provider is an independent company/supplier entity.

The platform does NOT model a complex hierarchy of provider roles.

There is one company owner.

The provider receives:

- Marketplace presence
- Directory listing management (goods, materials, equipment, services, prices, information)

The provider does **not** receive order management.

The company owner can invite other users into their organization.
Only the owner can invite. Invited provider users cannot invite others.

Invited organization users have broad/full access to the provider's
company data. No fine-grained provider permissions are currently required.

---

## 7. Provider Ownership

Each provider owns its own:

- Company profile
- Marketplace directory listings
- Displayed prices
- Informational quantity/availability
- Provider data

Marketplace items remain directory records owned by the provider.

Other providers cannot modify another provider's data.

PMs and clients cannot modify provider listings.

---

## 8. No Provider Orders

There are no provider orders on the platform.

There is no accept/reject workflow.

There is no historical order object to lock after acceptance.

Provider listing changes do not create or rewrite a commercial history
with a PM or client, because no commercial relationship exists on the platform.

---

## 9. Material Listing Ownership

Each material listing belongs to its provider.

Provider controls:

- Listing
- Price
- Informational quantity/availability
- Active / inactive visibility

PMs and other users cannot modify provider listings.

---

## 10. Price History / Project Records

Provider prices can change normally.

Changing the current listing price does not change a PM's internal
planned or actual project records.

Example:

Current listing price: $6

PM planned/expense line entered earlier: $5

The project line remains $5. It is the PM's record, not an order snapshot.

---

## 11. Project Material Relationship

A PM can assign/reference a provider listing inside their own project
for planning and cost tracking.

This does **not** create:

- An order
- A reservation
- A booking
- Inventory movement
- A technical or commercial relationship with the provider

Quantity/availability on the listing is informational only.

---

## 12. Worker Ownership

Workers own and control their own professional profiles.

Workers can:

- Edit their profile
- Edit CV
- Edit portfolio
- Edit professional information
- Change visibility
- Hide/unpublish their profile

PMs and providers do not own or directly edit a worker's personal profile.

Admin has platform-level management permissions.

---

## 13. Worker Multi-Project Membership

A worker can be referenced on multiple projects simultaneously
(as PM-owned project records).

The system can therefore represent:

Worker (directory profile)
→ referenced on Project A
→ referenced on Project B
→ referenced on Project C

Availability/conflict management is not currently a mandatory business rule.
Referencing a worker does not reserve them.

---

## 14. Public Access

Unauthenticated visitors can browse public marketplace/directory content,
including:

- Workers
- Providers
- Materials
- Equipment
- Services
- Prices
- Portfolios
- Company profiles
- Search results

Public users do not need an account merely to browse.

Browse/view does not create a relationship with the listing owner.

---

## 15. Authenticated Actions

Certain actions require an account.

Examples:

- Creating a project
- Editing a provider listing (provider owner)
- Editing a worker profile (worker owner)
- Recording project expenses
- Favoriting directory items (if enabled)

The following are **not** platform actions:

- Ordering materials
- Renting/hiring a worker on-platform
- Checkout / payment
- Accepting/rejecting an order

The platform does not currently provide an internal chat system.

Users contact providers/workers externally using information shown
on the directory, or visit physically.

---

## 16. Client Project Creation

A normal Client cannot create a project.

Project creation is restricted to:

- PM
- Admin

A person who wants to construct/renovate a home can use the platform's
public marketplace/directory to discover workers, providers, materials,
etc., then contact them outside the platform. They do not become a
project owner through browsing.

---

## 17. Project Deletion

Project deletion is permanent.

The Project Owner can delete their project according to the project's state.
Admin can also manage/delete projects.

Important historical records that must legally/business-wise remain
preserved are handled separately. See Batch 8.

---

## 18. Project Child Records

PM can delete ordinary project records such as:

- Planned materials
- Worker references
- Expenses
- Other editable project inputs

These are internal planning/cost records, not completed marketplace
transactions.

---

## 19. Provider Listings

Providers can remove their current listings by making them:

> INACTIVE

rather than destroying the listing record if a PM still holds an
internal reference for planning history.

An inactive listing is no longer presented as an available directory item.

A PM's copied/entered project line is not rewritten when the listing
changes or becomes inactive.

---

## 20. Worker Profile Deletion

Workers can delete their profile.

Historical PM project references/records should remain preserved where
required for project history. That history is the PM's record, not a
hire contract.

---

## 21. Permission Architecture Principle

The platform intentionally avoids excessive RBAC complexity.

Core model:

Admin
→ Full platform control

Entity Owner
→ Full control over owned entity
(provider owns listings; PM owns project records; worker owns profile)

Collaborator
→ Broad access granted by owner

Other users
→ Read-only directory access or no access depending on business context

No unnecessary per-feature permission matrix unless a future business
requirement explicitly requires it.

No marketplace browsing permission creates a transaction or relationship
between roles.
