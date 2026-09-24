# Batch 1 — Business & Users

**Status:** LOCKED v1 (marketplace correction applied)

Who exists, what the platform is, relationships.

**Marketplace correction — LOCKED:** Discover → View information → Contact externally. Inside a PM project: Plan → Assign/reference → Calculate → Record actual expenses. No orders, rentals, checkout, or role-to-role transactions on the platform.

---

# BUSINESS LOGIC — LOCKED v1

## 1. Core Concept

A civil-engineering platform that combines:

1. Project management for civil engineers / project managers.
2. A provider/material/equipment/service **directory** (marketplace as discovery only).
3. Displayed prices and informational availability for planning/reference.
4. Worker/freelancer **directory**.
5. Client access to public provider/worker/material information.

The platform aims to bring several parts of the civil-engineering workflow into one ecosystem.

It does **not** execute purchasing, rental, hiring, payment, delivery, or negotiation.

---

## 2. Main Actors

### Platform Admin

- Civil engineer / platform owner.
- Manages and moderates the platform.
- Approves user registrations.
- Manages platform-level operations.

### Project Manager

- Independent civil engineer/project manager.
- Can register independently.
- Creates and manages their own projects.
- Can estimate project costs.
- Can browse provider offerings and use them for planning/reference.
- Can assign/reference resources **internally** inside a project (does not create a relationship with the provider).
- Can manually record actual expenses for materials, equipment, workers, etc.
- May use both mobile and web.

### Provider / Company

- Independent company supplying materials/services.
- Only **publishes/displays** goods, materials, equipment, services, prices, and relevant information.
- Owns its marketplace directory records.
- Does not receive orders, accept/reject orders, or run a transaction pipeline on the platform.

### Worker

- Individual professional.
- Has a profile/CV/portfolio.
- Publicly discoverable for contact outside the platform.
- May be assigned/referenced as a **project record** by a PM after a real-world agreement. That assignment does not hire, rent, or contract the worker on the platform.

### Client / Guest

- Person interested in a civil-engineering project/service/material/worker.
- Can browse/view provider offerings and worker profiles.
- Can contact the provider/worker directly or visit physically.
- Cannot create a technical or commercial relationship with a provider through browsing.
- "Guest" is not a project role; it is an external platform user.

---

## 3. Companies

The platform contains multiple independent entities.

Providers are companies.

Project managers can operate independently and are not necessarily employees
of a company.

A provider/company is connected to the platform through its published
directory listings only. Browsing those listings does not create a
relationship with a PM, client, or worker.

---

## 4. Projects

A project represents a real civil-engineering project.

A project can contain:

- Project information
- Project-specific engineering information
- Revit/model/image-related information
- Planned materials / equipment / workers (internal references)
- Planned costs
- Manually recorded actual expenses
- Other project-management information

A Project Manager owns/manages their projects.

Project resource rows are the PM's internal planning and cost-tracking data.
They are not orders, reservations, bookings, or provider relationships.

---

## 5. Material Workflow

A Project Manager may:

### Planning / Estimation

Add theoretical materials to a project to estimate requirements and costs.
May copy/reference displayed provider information as a planning aid.

### Discovery

Browse provider directory listings for materials, equipment, services, and prices.

### External procurement

Real-world purchasing, renting, negotiation, payment, and delivery happen
**outside** the platform. The PM then records actual expenses in the project.

There is no purchase, rental, checkout, or order flow on the platform.

---

## 6. Worker Workflow

Workers can create professional profiles containing:

- CV
- Portfolio
- Professional information

Project Managers and clients can discover workers and contact them externally.

A PM can later assign/reference a worker inside a project for planning and
cost tracking. That does not hire, rent, or create a platform contract.

Workers can therefore exist independently from a specific project.

---

## 7. Registration

Users may:

- Register themselves.
- Or potentially be created by Admin.

Admin approval is required for registered Project Managers, Providers,
and Workers before they become active.

Guests/visitors can browse without an account.

A newly registered provider stays invisible in the marketplace until
Admin approval. Unverified workers stay off the public marketplace
until verified. See Batch 7.

---

## 8. Platform Vision

The platform is intended to create a civil-engineering ecosystem where:

**Marketplace**

Discover → View information → Contact externally.

**PM project**

Plan → Assign/reference → Calculate → Record actual expenses.

Project Managers
→ manage projects
→ estimate materials
→ browse providers for reference
→ record actual expenses
→ find workers (directory) and contact them outside the platform

Providers
→ publish/display materials, equipment, services, prices, and information

Workers
→ build professional profiles
→ display CV/portfolio
→ be discoverable for freelance opportunities handled outside the platform

Clients/Guests
→ discover providers/services/materials/workers
→ contact the provider or visit physically

The long-term vision includes improving transparency around material
availability/pricing **as information**, without moving real-world deals
onto the platform.
