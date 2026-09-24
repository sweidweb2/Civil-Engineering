# Batch 6 — Financial & Calculation Engine

**Status:** LOCKED

Planned vs actual, quantities, unit prices, labor costs, equipment costs, waste, expenses, budget, revenue/profit, informational payment records.

**Marketplace correction — LOCKED:** Discover → View information → Contact externally. Inside a PM project: Plan → Assign/reference → Calculate → Record actual expenses. No orders, rentals, checkout, or role-to-role transactions on the platform.

Marketplace data is a **reference/input source**. It does not create transactions or automatically create financial obligations.

---

# BUSINESS LOGIC — LOCKED

## Core financial principle

The platform is essentially:

Plan resources
→ calculate expected cost
→ record actual resources/expenses
→ calculate actual cost
→ compare
→ track budget / revenue / profit

---

## 1. Project Cost Structure

Total project cost can include:

- Materials
- Workers
- Equipment
- Other Expenses

**Total Cost = Materials + Workers + Equipment + Other Expenses**

---

## 2. Planned vs Actual

Projects support both:

- **Planned cost** — optional
- **Actual cost** — recorded from real expenses/resources

The PM can compare planned vs actual.

---

## 3. Material Calculation

Material cost:

**Quantity × Unit Price = Total**

Example:

500 bags × $8 = $4,000

---

## 4. Units

Materials can use common or custom units:

- kg
- ton
- m³
- m²
- meter
- piece
- bag
- liter
- hour
- day
- custom unit

Units are optional depending on the resource.

---

## 5. Material Quantity Tracking

For materials:

**Remaining = Purchased − Used − Wasted**

Example:

1,000 purchased − 600 used − 50 wasted = 350 remaining

---

## 6. Actual Material Expenses

PM can manually record an actual material purchase/expense with:

- Material
- Quantity
- Unit price
- Total
- Date
- Supplier/provider name
- Notes
- Optional invoice/document

This can be completely independent of the marketplace.

---

## 7. Material Price Source

For planned calculations, PM can either:

- Manually enter a price
- Use a marketplace/provider listed price

Both are supported.

---

## 8. Marketplace Price Changes

Marketplace prices are informational.

If a provider changes a price, an existing project calculation does **not** automatically change.

The PM can manually update it.

The system may show a note indicating that the current marketplace price differs from the price previously used.

---

## 9. Worker Cost

Worker cost supports optional calculation methods:

- Hourly × hours
- Daily × days
- Weekly × weeks
- Monthly × months
- Fixed/project rate

The PM chooses the appropriate method.

---

## 10. Equipment Cost

Equipment supports similar calculation methods:

- Hourly
- Daily
- Weekly
- Monthly
- Fixed/project price

Example:

$300/day × 5 days = $1,500

---

## 11. Other Expenses

PM can create custom expenses.

Examples:

- Transportation
- Fuel
- Permits
- Utilities
- Accommodation
- Tools
- Insurance
- Government fees
- Miscellaneous

Expense can contain:

- Name
- Category
- Amount
- Date
- Notes
- Optional document

---

## 12. Project Currency

Each project has **one** base currency.

All project financial calculations use that currency.

---

## 13. No Multi-Currency Project Calculations

A project does not support multiple currencies for now.

This avoids exchange-rate complexity.

---

## 14. Project Budget

PM can optionally define a project budget.

The system can show:

- Budget
- Planned Cost
- Actual Cost
- Remaining Budget
- Over Budget

---

## 15. Project Revenue & Profit

The financial model can also record project revenue/contract value.

**Revenue − Actual Cost = Profit**

So the project can provide both cost and profitability information.

---

## 16. Payment Tracking

The platform does **not** process payments.

However, PM can manually record payments made outside the platform.

Example fields:

- Amount
- Recipient
- Date
- Payment method
- Reference/notes
- Optional proof/document

Payment records are informational/project records only.

---

## 17. Financial Documents

Expenses and payments can optionally have supporting documents:

- Invoices
- Receipts
- Payment proofs
- Contracts
- Other financial documents

---

## 18. Cost Breakdown

Project financial dashboard can break costs down into:

- Materials
- Workers
- Equipment
- Other expenses

Example:

Actual Cost: $52,000

- Materials — $25,000
- Workers — $15,000
- Equipment — $7,000
- Other — $5,000

Charts/percentages can visualize the breakdown.

---

## 19. Planned vs Actual Analysis

The system calculates variance:

**Actual − Planned = Variance**

Example:

Planned: $10,000
Actual: $12,000
Variance: +$2,000

The system can indicate whether the actual cost is above or below the planned amount.

---

## 20. Resource vs Financial Calculation

The system separates:

**Resource planning**

Need 500 m² of tiles.

from:

**Financial calculation**

500 m² × $12 = $6,000.

They are connected, but they remain separate concepts.

---

## Boundary (still locked)

The engine must not:

- Read or create marketplace orders (there are none)
- Charge, collect, or split payments
- Apply marketplace checkout discounts
- Reduce provider quantity when a cost line is added
- Treat a project line as a purchase, rental booking, or hire
- Create a financial relationship PM ↔ Provider or Client ↔ Provider
- Recalculate existing project lines when a marketplace price changes
