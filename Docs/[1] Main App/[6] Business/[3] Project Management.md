# Batch 3 — Project Management

**Status:** LOCKED v3 (marketplace correction applied)

Projects, tasks, resources, workers, expenses, documents, reporting.

**Marketplace correction — LOCKED:** Discover → View information → Contact externally. Inside a PM project: Plan → Assign/reference → Calculate → Record actual expenses. No orders, rentals, checkout, or role-to-role transactions on the platform.

---

# BUSINESS LOGIC — LOCKED v3

# Project Management Scope

## Project Structure

A project contains:

- Overview
- Team
- Tasks
- Materials (planned / referenced / tracked internally)
- Workers (assigned/referenced internally)
- Equipment (planned / referenced / tracked internally)
- Expenses (manually recorded actuals)
- Documents
- Progress
- Reports
- Photos / media

A project does **not** contain platform orders.

## Project Management Scope

The platform is NOT intended to fully control construction execution.

Its core purpose is:

> Help the PM understand what resources the project needs,
> calculate costs, find providers/workers in the directory,
> and maintain project records.

The PM manually manages project progress.

Project workflow:

Plan → Assign/reference → Calculate → Record actual expenses.

## Tasks

Projects support construction tasks and hierarchical work organization.

Tasks can represent construction activities such as:

- Foundation
- Excavation
- Reinforcement
- Formwork
- Concrete
- Masonry
- etc.

## Progress

Project progress is manually managed by the PM.

The UI can provide:

- Dynamic progress visualization
- Progress bar/line
- Statistics cards
- Other visual progress indicators

Progress is not automatically inferred from task completion.

## Materials

Materials support tracking of:

- Planned quantity
- Planned price
- Actual quantity (entered by the PM)
- Actual price (entered by the PM)
- Used quantity
- Remaining quantity
- Wasted quantity
- Optional provider/source **reference** (directory info, not a live link/order)

Materials can be:

- Manually added as project inputs
- Referenced from a provider directory listing for planning
- Tracked through their **project** lifecycle (not a marketplace transaction)

Referencing a listing does not create an order, reservation, booking,
or relationship with the provider.

Physical material consumption is tracked as PM-entered data.

Example:

Recorded purchased: 1,000
Used: 600
Wasted: 50
Remaining: 350

## Workers

A project can contain:

### Referenced directory workers

Workers the PM discovered in the directory and then assigned/referenced
as a project record after a real-world agreement. No hire/rent transaction
exists on the platform.

### Internal / External Employees

The PM can manually add workers who are not registered on the platform.

These workers exist as virtual project records and do not require
platform accounts.

Worker records can include:

- Role
- Start date
- End date
- Rate
- Hours/days
- Total cost
- Status

Attendance/time tracking is part of the potential worker-management scope.

Assigning a worker to a project does not hire, rent, or contract the worker
on the platform. **Platform worker invites** (accept/reject + limited task
access) are locked in
[Project Worker Invites & Tasks](../../[3]%20Decisions/[17]%20Project%20Worker%20Invites%20%26%20Tasks.md)
and supersede the older “reference-only / no worker access” rule for that flow only.

## Expenses

The PM can manually record actual expenses for materials, equipment,
workers, and other costs.

Expenses are not limited to materials and workers.

A project can contain arbitrary expense categories, including:

- Materials
- Workers
- Equipment
- Transportation
- Fuel
- Tools
- Permits
- Utilities
- Accommodation
- Miscellaneous
- etc.

Expenses are project records. They are not invoices, payments, or
provider settlements.

## Equipment

The platform supports equipment/resources such as:

- Excavators
- Cranes
- Scaffolding
- Generators
- Trucks
- Concrete mixers
- Other construction equipment

Inside a project, equipment is planned, referenced, and/or recorded as
an expense. Real-world purchase or rental happens outside the platform.

Directory listings may show sale/rental prices as information only.

## Documents

Projects can contain different types of documents/files, including:

- Revit files
- PDFs
- Drawings
- BOQ
- Contracts
- Invoices
- Photos
- Videos
- Reports
- Other project files

## Project Photos / Media

Projects support construction documentation through photos/media.

PMs can maintain a visual project history/progress record.

## Notifications

Notification business logic is currently FROZEN.

No notification workflow will be locked yet.

There are no order-status notifications because there are no orders.

## Reports

Projects provide financial/resource reporting.

Example:

Planned Cost
vs
Actual Cost

With breakdowns such as:

- Materials
- Workers
- Equipment
- Other expenses

Actuals come from PM-entered records, not from marketplace transactions.

Additional reports will be defined later.

## Product Boundary

The platform is NOT intended to become a full construction-execution
control system or a marketplace checkout system.

Its primary value is:

1. Resource planning
2. Cost calculation
3. Provider discovery (directory)
4. Worker discovery (directory)
5. Project records
6. Project resource/financial tracking
