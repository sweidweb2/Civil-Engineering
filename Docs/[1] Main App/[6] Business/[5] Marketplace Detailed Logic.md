# Batch 5 — Marketplace Detailed Logic

**Status:** LOCKED v5 (marketplace correction applied)

Provider listings, materials, equipment, worker profiles, search, filters, informational availability. Directory only — no order or rental lifecycle.

**Marketplace correction — LOCKED:** Discover → View information → Contact externally. Inside a PM project: Plan → Assign/reference → Calculate → Record actual expenses. No orders, rentals, checkout, or role-to-role transactions on the platform.

---

# BUSINESS LOGIC — LOCKED v5

# Marketplace Detailed Logic

## 1. Marketplace Scope

The marketplace can contain:

- Materials
- Equipment
- Services
- Workers
- Provider/company profiles

Providers only **publish/display** goods, materials, equipment, services,
prices, and relevant information.

The marketplace is a:

- Discovery layer
- Information layer
- Comparison layer

It is **not** a transaction, payment, rental, booking, or logistics platform.

**Core principle**

Discover → View information → Contact externally.

---

## 2. Providers

Providers are independent companies/suppliers.

A provider can display:

- Company information
- Materials
- Equipment
- Services
- Workers they can advertise/display
- Prices and relevant information

Providers manage their own marketplace information.

Provider listings can be:

- Active
- Inactive

Providers do not receive orders or manage an order inbox.

---

## 3. Categories

Two levels (see Batch 7):

- **Platform categories** — created/managed by Admin; available globally
- **Provider categories** — custom categories created by providers where appropriate

Examples include cement, steel, wood, glass, roofing, equipment, etc.

---

## 4. Material Listings

A material listing can contain information such as:

- Name
- Category
- Description
- Images
- Price
- Unit
- Specifications
- Variations
- Offers
- Brand
- Other relevant provider-defined information

The platform should focus on the main/general information rather than
forcing excessive specification/location/technical fields.

Listings are directory records owned by the provider.

---

## 5. Material Variations

Providers can represent variations through their listing information.

Example:

Cement 50kg
Cement 100kg

or:

Steel 8mm
Steel 10mm
Steel 12mm

The exact representation can be decided during implementation.

---

## 6. Material Pricing

Providers control their own displayed prices.

Supported concepts include:

- Fixed price
- Different prices for different variations
- Promotional offers
- Discounts (shown as information)

Providers can choose whether to use these.

The platform does not calculate checkout totals, apply coupons at
purchase, or require automatic discount engines. There is no checkout.

---

## 7. Currency

Providers can choose the currency used for their listings.

Multi-currency support is therefore part of the marketplace concept.

Exact supported currencies will be defined later.

---

## 8. Quantity / Availability

IMPORTANT:

Provider quantity/availability is informational only.

The platform does not guarantee stock and does not transact against it.

A provider can display quantity/availability where useful.
The provider is responsible for the real-world stock.

The platform never decreases marketplace quantity because of a user action,
because there are no orders.

---

## 9. No Orders

There are **no orders** on the platform.

There is no:

- Order record between PM and Provider
- Accept/reject order workflow
- Order status stepper
- Checkout
- Payment
- Delivery tracking
- Transaction pipeline PM ↔ Provider or Client ↔ Provider

If a visitor wants the goods, they contact the provider directly or
visit physically.

---

## 10. No Inventory Transaction Behavior

Quantity on a listing is an optional displayed number.

The provider can manually edit that displayed number.

The system does not:

- Reserve quantity
- Reduce quantity on "order"
- Block a user with a backorder workflow
- Accept/reject a commercial request

---

## 11. No Order Cancellation

There is nothing to cancel. Communication and deals happen outside
the platform.

---

## 12. No Provider Order Workflow

Provider operational workflow for real-world deals is outside the platform.

The provider's only on-platform job for the marketplace is to keep
directory information current.

---

## 13. Equipment Marketplace

Equipment is a marketplace listing type.

Examples:

- Excavators
- Cranes
- Generators
- Trucks
- Concrete mixers
- Scaffolding
- Other construction equipment

Equipment listings can contain:

- Description
- Images
- Specifications
- Sale price
- Rental price / rental unit (informational)
- Availability (informational)
- Other relevant information

Displayed "for sale" or "for rent" is catalog language only.
There is no equipment rental transaction on the platform.

---

## 14. Equipment Rates (not rental bookings)

A listing may show:

- Rental rate
- Rental unit (hourly, daily, weekly, monthly, or provider-defined)
- Informational availability

The platform does not book date ranges, lock overlapping rentals,
or create a rental contract.

Real-world rental happens outside the platform.
A PM may copy rates into a project plan or record an actual expense later.

---

## 15. Services

Providers can also display services.

Examples:

- Construction work
- Excavation
- Transportation
- Welding
- Other civil-engineering related services

Exact service structure remains flexible.

Viewing a service does not create a job, booking, or relationship.

---

## 16. Worker Marketplace

Workers have public professional profiles.

Profiles can contain:

- Name
- Profile photo
- Profession
- Skills
- Bio
- CV
- Portfolio
- Experience
- Location
- Languages
- Rates
- Availability
- Other professional information

---

## 17. Worker Categories

Workers can be categorized by professional trade/skill.

Examples:

- Carpentry
- Masonry
- Glazing
- Welding
- Roofing
- Plumbing
- Electrical
- Painting
- HVAC
- etc.

The category system can support platform defaults and future expansion.

---

## 18. Worker Search

Marketplace users can search/filter workers by relevant attributes such as:

- Profession
- Skills
- Location
- Price
- Experience
- Availability
- Verification
- Other useful profile attributes

The marketplace is global but location can be used as a search/filter
dimension.

---

## 19. Worker Verification

Workers can request verification.

Flow: Unverified → Verification Requested → Verified.

Admin controls the decision.

Unverified workers are not displayed in the public marketplace until
verified. No special verification badge is required — verification
itself controls visibility.

There are no verification fees in the current business model.

See Batch 7.

---

## 20. Worker Contact (not hiring)

The platform does NOT implement a worker-hiring or rental transaction.

There is no:

- Hiring request
- Worker acceptance / rejection
- Negotiation workflow
- In-app hiring payment
- Hiring contract
- Booking / reservation

Instead:

PM/client discovers worker
→ views information
→ contacts the worker externally
→ handles the real-world agreement outside the platform
→ PM may later assign/reference the worker inside a project for
  planning and cost tracking

That project assignment does not create a relationship or contract
on the platform.

---

## 21. Provider-Displayed Workers

A provider can display workers/services they can provide.

Workers are NOT employees/accounts belonging to providers inside
the platform's identity/permission model.

A provider may advertise/display available workers.

Workers remain independent professional entities.

Displaying a worker on a provider page does not hire them or bind a PM.

---

## 22. Ratings & Feedback

Any registered account can leave reviews/ratings.

There is no requirement for a platform-recorded transaction.

Admin can hide/remove reviews that violate platform rules.

See Batch 7.

---

## 23. Favorites

Users can save/favorite marketplace entities such as:

- Providers
- Workers
- Materials
- Equipment

This is a discovery/convenience feature. It is not a reservation.

---

## 24. Listing Visibility

Providers control whether their listings are:

- Active
- Inactive

Inactive listings are no longer presented as available directory items.
A PM's internal project reference/copied values can remain as history.

---

## 25. Worker Visibility

Workers control whether their profiles are publicly visible.

A worker can:

- Publish profile
- Hide profile

Unverified workers are not shown in the public marketplace.

Verification controls visibility. No special badge is required.

---

## 26. Public Marketplace

The marketplace is publicly discoverable.

Visitors can search/discover:

- Providers
- Workers
- Materials
- Equipment
- Services
- Prices/information

They can contact the provider directly or visit physically.

Authentication is required for actions that modify owned records
(listings, profiles, projects). Browsing does not require an account.

---

## 27. Core Marketplace Philosophy

The marketplace must not become an e-commerce, booking, or checkout system.

Its purpose is:

> Let civil-engineering professionals and normal users discover,
> compare, and contact resources. Real-world purchasing, renting,
> hiring, negotiation, payment, delivery, and communication happen
> outside the platform.

No technical or commercial relationship is created between roles
through marketplace browsing.
