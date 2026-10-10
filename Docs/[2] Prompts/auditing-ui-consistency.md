What to specify each time
Fill the three slots at the top of the prompt before you send it.

Scope. Name the folders or the change set. Example: “uncommitted work in backend/src/modules/listings and the admin, PM, and notification screens that use it.” If you want the whole app, say that, and still name the modules so the agent does not wander.
Comparison. Name one module or page that is already correct. This audit used projects for money fields, the categories module for catalog rules, and listing-delete plus project-archive for confirmation dialogs.
Rules. Point at the docs that decide right and wrong: listings.domain.ts, the portal backlog line about soft-hide, and .cursor/rules/project-core.mdc. If a screen is allowed to stay on mock data, say so. This audit treated an unlabeled mock catalog on a live nav item as a finding, and skipped the dashboard because its header already says the figures are mock.
Then tell the agent to read the code and confirm every finding. A first pass that is not re-checked will report bugs that are already fixed.

Prompt

Audit this code for consistency and correctness. Report only confirmed findings, grouped by severity. If a check is clean, omit it.
Scope:

- [folders, routes, or “uncommitted changes in …”]
- Also check the screens and modules that share this data (navigation, header, detail pages, seed).
  Judge against:
- Existing pattern: [one correct module or page, and what to copy from it]
- Domain and product rules: [domain file, backlog, .cursor/rules/project-core.mdc]
- Allowed exceptions: [screens that may stay mock or UI-only, and how the UI must label them]
  How to audit:

1. Read the scope and the comparison code. Do not report from memory or from a first guess.
2. Check layering (Route → Controller → Service → Repository → Prisma), Zod at the HTTP edge, authz, pagination, and that clients call services/ only.
3. Check that live navigation, headers, and detail pages use the same source of truth. Mock data on a live route is a finding when the screen does not say it is sample data.
4. Check destructive actions, counts, and money. Totals must use the API total. Page rows must not be presented as platform totals. Money must match the decimal-string pattern used by the comparison module. Deletes must not leave dangling references.
5. Check domain rules in code. If a domain file says other modules must not query this table, a direct Prisma read is a finding.
6. Re-read every candidate finding in the file. Drop it if the code already handles it, if the UI already discloses the limitation, or if you cannot point to the file.
   Severity:

- High: the control does not do what it shows, displayed numbers are wrong beyond the current page, or a write leaves orphaned records.
- Medium: a live screen or API accepts data the owning module rejects, two surfaces show different sources for the same thing, or a destructive action skips the confirmation used by its siblings.
- Low: validation shape differs but the service still enforces the rule, dead unrouted copies remain, or a control overclaims while a toast admits it is local only.
  Output:
- Counts: high, medium, low.
- For each finding: severity, file path, and one or two sentences on what is wrong and why it breaks the rule above.
- No fix list, no “what passed” section, no invented issues.
