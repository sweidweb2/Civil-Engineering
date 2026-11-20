# Civil Engineering mobile app: screen map per role

Hand this file to a design AI as the brief for a full UI/UX redesign. It lists every screen per role, how screens nest, and what each one must contain. It describes the app as it is today, not a final design.

## 0. App context

**What it is.** A construction/civil-engineering marketplace and project tracker. Providers list materials, equipment and services. Project managers (PMs) track construction projects through 5 stages and browse a directory. Workers keep a professional CV. Admins moderate everything.

**Tech constraints.** Expo 57 / React Native 0.86, Expo Router, Tailwind v4 via Uniwind, Reanimated 4, gesture-handler, lucide icons, Zustand. Designs must be buildable in React Native (no web-only effects).

**Languages.** English and Arabic, with full RTL. Layouts must work in both directions (mirror navigation and direction arrows, never logos, icons like search/close/plus, or numbers). Light and dark themes exist. Brand colour today is green (primary `#15803D`).

**Current navigation model.**

- A floating pill bottom tab bar, shown only on top-level screens. The active tab expands to icon + label.
- Pushed screens (details, forms, editors) hide the tab bar and show a back button, with a sticky action bar at the bottom for forms.
- The top of top-level screens has no title or header bar (a deliberate decision): content starts under the status bar.
- Tab switches replace the screen (no history stack growth).

**Shared patterns used on many screens.** Use these as the design vocabulary:

- _List screen:_ search field, optional filter chips, card list (leading thumbnail/avatar, title, status pill, subtitle, chevron), pull-to-refresh, paging (prev/next), floating "+ Add" button, empty state, skeleton loading.
- _Detail/form screen:_ compact top bar (back + name), scrolling body of titled sections (card with icon, title, fields), sticky footer with Save (and sometimes a destructive action in a "Danger zone" card).
- _Dashboard:_ stat tiles with animated numbers, a "needs attention" banner, quick-action tiles, a horizontal card carousel, a "recent" list.
- _Feedback:_ toasts (success/error), confirm dialogs (destructive ones in red), bottom sheets for pickers (searchable) and photo-source/image actions.
- _Fields:_ text, multiline, password with reveal, select (opens sheet), choice chips, toggle row, segmented tabs, date typed as `YYYY-MM-DD`.
- _Status pills_ (tone by meaning): Active/Approved/Completed = green, Pending/On hold = amber, Suspended/Rejected/Cancelled = red, In progress = brand, Planning = info/teal, Draft/Inactive/Hidden/Not started = neutral.

**Roles.** `SUPER`, `ADMIN`, `MANAGER` (PM), `PROVIDER`, `WORKER`, `CLIENT`. Each role lands in its own portal after login.

---

## 1. Shared, before login (all roles)

| Screen           | Route               | Nested?                       | Contents                                                                                                                                                                                                        |
| ---------------- | ------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch / router  | `/`                 | No UI                         | Splash/loader while the session restores, then redirects by role to the portal home, or to Login.                                                                                                               |
| Login            | `/login`            | Top-level                     | Brand mark, "Sign in" title and subtitle. Email and password (with reveal) fields, field-level errors, primary Sign-in button with busy state, link to Register. Pending accounts are sent to Pending approval. |
| Register         | `/register`         | Pushed from Login             | Create-account form: first name, last name, email, password, and a role choice (Client, Project Manager, Worker). A note that some roles need admin approval.                                                   |
| Pending approval | `/pending-approval` | Dead-end after register/login | Explains the account awaits admin approval; a button to go back / sign out.                                                                                                                                     |

The auth screens currently use a full-screen green layout with decorative circles. The designer may rethink it.

---

## 2. Account screen (reused by PM, Worker, and Admin)

Reached from the tab bar (PM: Account tab, Worker: Account tab) or from Admin → More. Provider's equivalent is the Profile screen (section 6).

| Section         | Contents                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Profile card    | Avatar (initials or photo), display name, role · email.                                            |
| Segmented tabs  | **Details** (first name, last name, display name, phone, save) and **Security** (change password). |
| Theme picker    | Light / dark / system.                                                                             |
| Language picker | English / العربية. Switching to Arabic needs an app restart; the app explains this.                |
| Log out         | Confirm dialog.                                                                                    |

---

## 3. SUPER portal: `/super`

**Tabs (5):** Home · Users · Activity · Errors · Settings.

Every screen here is a placeholder today: a title and a "Welcome, name. You are in the Super panel" message with a logout button. The web app has real equivalents, so these need real designs:

| Screen   | Intended contents                                                               |
| -------- | ------------------------------------------------------------------------------- |
| Home     | Platform health overview: user and project counts, recent activity, error rate. |
| Users    | All users with search and role/status filters, user detail.                     |
| Activity | Audit log: who did what and when, filterable, paged.                            |
| Errors   | Error log list with severity, timestamp and message, tap for detail.            |
| Settings | App/platform settings and log out.                                              |

---

## 4. ADMIN portal: `/admin`

**Tabs (5):** Home · Users · Providers · Projects · More.
**More** (a menu of 5 destinations plus the account card at the top and a log-out row).

### Top-level (tab) screens

| Screen           | Route              | Contents                                                                                                                                                                                          |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (dashboard) | `/admin`           | 4 stat tiles (users, providers, projects, listings, each tappable). Quick actions (new user, new provider, new project). Recent items lists with status pills and progress bars. Pull-to-refresh. |
| Users            | `/admin/users`     | List: avatar, name, email, status pill, role label. Search, "+ Add" button.                                                                                                                       |
| Providers        | `/admin/providers` | List: logo, company name, status pill, city/email/phone. Search, status filter chips, "+ Add".                                                                                                    |
| Projects         | `/admin/projects`  | List: thumbnail, name, status pill, progress bar. Search, status filter chips, "+ Add". (Same screen the PM uses.)                                                                                |
| More             | `/admin/more`      | Account card (avatar, name, role · email) that opens Account. List of destinations below with an icon, title and one-line description. Log out.                                                   |

### Screens under More (pushed, tab bar hidden except the More tab stays highlighted)

| Screen                | Route               | Contents                                                                                                                                                         |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration requests | `/admin/queue`      | Pending / Approved filter. Search. Each request shows the person and their role, with Approve / Unapprove and Remove (confirm) actions. Empty states per filter. |
| Directory             | `/admin/directory`  | Read-only browse of the active marketplace (providers/workers) with type filter chips and search.                                                                |
| Listings              | `/admin/listings`   | Every provider's listings, same list pattern as the provider's own screen.                                                                                       |
| Reviews               | `/admin/reviews`    | Moderation list with status filter chips. Per review: Approve, Reject, Hide, Delete (confirm).                                                                   |
| Categories            | `/admin/categories` | List with kind filter chips and search, "+ Add".                                                                                                                 |
| Account               | `/admin/account`    | See section 2.                                                                                                                                                   |

### Nested detail/form screens

| Screen          | Route                         | Nested under   | Contents                                                                                                                                                                                                                                        |
| --------------- | ----------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New user        | `/admin/users/new`            | Users          | Sections **Account** (email, password, role choice, "verified" toggle) and **Profile** (first/last/display name, phone). Sticky Create button.                                                                                                  |
| User detail     | `/admin/users/[id]`           | Users          | Sections **Access** (status choice, role choice, verified toggle), **Profile** (name fields, phone), and for workers a **Worker directory** toggle ("Show in public directory", independent of verification). Deactivate (destructive confirm). |
| New provider    | `/admin/providers/new`        | Providers      | Company form (see Provider detail).                                                                                                                                                                                                             |
| Provider detail | `/admin/providers/[id]`       | Providers      | Logo upload (with camera/library sheet), sections **Company** (name, description, status choice), **Contact** (email, phone, WhatsApp, website), **Location** (address, city, country). Save.                                                   |
| New project     | `/admin/projects/new`         | Projects       | See PM "New project".                                                                                                                                                                                                                           |
| Project detail  | `/admin/projects/[id]`        | Projects       | See PM "Project detail".                                                                                                                                                                                                                        |
| Project stages  | `/admin/projects/[id]/stages` | Project detail | See PM "Project stages".                                                                                                                                                                                                                        |
| New listing     | `/admin/listings/new`         | Listings       | See Provider "Listing editor"; admin also picks the provider.                                                                                                                                                                                   |
| Listing detail  | `/admin/listings/[id]`        | Listings       | See Provider "Listing detail".                                                                                                                                                                                                                  |
| Edit listing    | `/admin/listings/[id]/edit`   | Listing detail | Listing editor, in edit mode.                                                                                                                                                                                                                   |
| New category    | `/admin/categories/new`       | Categories     | Name, Arabic name, kind choice, sort order, active toggle.                                                                                                                                                                                      |
| Category editor | `/admin/categories/[id]`      | Categories     | Same form, with delete (confirm).                                                                                                                                                                                                               |

---

## 5. PM (project manager) portal: `/pm`

**Tabs (4):** Home · Projects · Directory · Account.

### Top-level (tab) screens

| Screen           | Route           | Contents                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (dashboard) | `/pm`           | 3 stat tiles: Active, On hold, Completed (tappable to Projects). An amber "needs attention" banner when projects are on hold. Quick-action tiles: New project, All projects, Directory. Horizontal snap carousel of active-project cards (name, code · city, big progress %, progress bar). "Recent" list with status pill and progress bar, "See all" link. First-use empty state with a "New project" button. |
| Projects         | `/pm/projects`  | List: thumbnail, name, status pill, progress bar. Search, status filter chips, "+ New".                                                                                                                                                                                                                                                                                                                         |
| Directory        | `/pm/directory` | Browse providers/workers: type filter chips, search, result count. Read-only.                                                                                                                                                                                                                                                                                                                                   |
| Account          | `/pm/account`   | See section 2.                                                                                                                                                                                                                                                                                                                                                                                                  |

### Nested screens

| Screen         | Route                      | Nested under   | Contents                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New project    | `/pm/projects/new`         | Projects       | Sections **Basics** (name, code, type choice, description), **Schedule** (start and end date), **Gallery** (photo upload, with main image). Sticky Create.                                                                                                                                                                                                                                                                 |
| Project detail | `/pm/projects/[id]`        | Projects       | Summary card (main photo, status pill, progress bar and %). A highlighted "Stages" entry row (opens stages). Sections **Gallery** (up to N images, set main, remove), **Basics**, **Location** (address, city, country, start and end dates), **Notes**. Sticky Save, then a **Danger zone** card with Archive (destructive confirm).                                                                                      |
| Project stages | `/pm/projects/[id]/stages` | Project detail | Horizontal stepper of 5 stages (Geotechnical, Design, Licensing, Materials, Maintenance), each showing number, name and Complete / In progress / Not started. One form per stage: status choice plus stage-specific fields (soil type, bearing capacity, permit number, supplier, cost, dates, etc.), notes, and **Documents** (file upload per field: reports, designs, permits, invoices). Footer: Save and Save & next. |

---

## 6. PROVIDER portal: `/provider`

**Tabs (3):** Home · Listings · Profile.

### Top-level (tab) screens

| Screen           | Route                | Contents                                                                                                                                                                                                                                 |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (dashboard) | `/provider`          | 3 stat tiles: Listings, Live, Hidden. Quick actions: New listing, My listings, Edit profile. Recent listings with status pills, "See all". Empty state ("Create your first listing").                                                    |
| Listings         | `/provider/listings` | List: image, name, status pill, price/category line. Search, "+ Add".                                                                                                                                                                    |
| Profile          | `/provider/profile`  | Company card (logo, name, status pill). Segmented tabs: **Company** (logo upload, company name, description, phone, WhatsApp, email, website, address, city, country, Save), **Account** (personal details) and **Security** (password). |

### Nested screens

| Screen         | Route                          | Nested under   | Contents                                                                                                                                    |
| -------------- | ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| New listing    | `/provider/listings/new`       | Listings       | Listing editor, create mode.                                                                                                                |
| Listing detail | `/provider/listings/[id]`      | Listings       | Read view: image gallery, name, status pill, price, quantity, brand, rental info, description. Actions: Edit, Delete (destructive confirm). |
| Edit listing   | `/provider/listings/[id]/edit` | Listing detail | Listing editor, edit mode.                                                                                                                  |

**Listing editor (create and edit).** Sections: **Details** (name, description, category picker, brand, status choice), **Pricing** (price, currency, unit, quantity, "For rent" toggle with rental price and rental unit), **Gallery** (photos with camera/library sheet, main image, remove). Sticky Save.

---

## 7. WORKER portal: `/worker`

**Tabs (3):** Home · My CV · Account.

### Top-level (tab) screens

| Screen           | Route             | Contents                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (dashboard) | `/worker`         | CV-completeness stat tiles (percent ready, jobs, skills). A verification banner (Verified and visible / Verification requested / Not verified yet) with a short explanation. A "Your CV" progress card ("N of 6 sections ready") with a Start/Continue button. Quick-action tiles: My CV, Add job, Skills, Account. Empty state when the CV is blank. |
| My CV            | `/worker/cv`      | Profile card (avatar, headline or name, trade · city, availability pill). A completeness card (progress bar and %, hint). Then one tappable row per section, each with an icon, title, an item count or "Ready / Add details" state and a chevron: Basics, Experience, Education, Certifications, Skills, Rates & visibility.                         |
| Account          | `/worker/account` | See section 2.                                                                                                                                                                                                                                                                                                                                        |

### Nested screens (all pushed from My CV)

| Screen               | Route                                          | Contents                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basics               | `/worker/cv/basics`                            | Sections **About you** (headline, bio), **Trade** (primary trade, years of experience), **Location** (city, country), **Languages** (comma-separated). Save.                                   |
| Skills               | `/worker/cv/skills`                            | List of current skills (trade + level pill) with remove. "Add a trade" section: trade picker (searchable), level choice (Basic / Intermediate / Expert), Add button. Empty state.              |
| Rates & visibility   | `/worker/cv/rates`                             | Sections **Rates** (hourly rate, daily rate, currency, availability choice: Available / Busy / Unavailable, external CV link) and **Visibility** ("Show in directory" toggle with hint). Save. |
| Experience list      | `/worker/cv/experience`                        | Cards of past jobs (role, company, dates) with chevrons, "+ Add" button, empty state.                                                                                                          |
| Experience editor    | `/worker/cv/experience/[index]` (`new` to add) | Role, company, project type, location, start date, end date (hidden when "I still work here" is on), description. Save, and Delete when editing (confirm).                                     |
| Education list       | `/worker/cv/education`                         | Cards (school, degree · field), "+ Add", empty state.                                                                                                                                          |
| Education editor     | `/worker/cv/education/[index]`                 | School, degree, field of study, start year, end year. Save / Delete.                                                                                                                           |
| Certifications list  | `/worker/cv/certifications`                    | Cards (name, issuer), "+ Add", empty state.                                                                                                                                                    |
| Certification editor | `/worker/cv/certifications/[index]`            | Certificate name, issuer, issued on, expires on, credential ID. Save / Delete.                                                                                                                 |

---

## 8. CLIENT portal: `/client`

**Tabs (1):** Home only.

A placeholder today: a welcome message and a logout button. Clients are the "guest/customer" role that can register freely. It needs a real design. Natural content would be browsing the directory/listings, a request or enquiry flow, and an account screen. That scope is a product decision, not something the code defines yet.

---

## 9. Quick reference: tab bars

| Role     | Tabs                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Super    | Home · Users · Activity · Errors · Settings                                                                             |
| Admin    | Home · Users · Providers · Projects · More (→ Registration requests, Directory, Listings, Reviews, Categories, Account) |
| PM       | Home · Projects · Directory · Account                                                                                   |
| Provider | Home · Listings · Profile                                                                                               |
| Worker   | Home · My CV · Account                                                                                                  |
| Client   | Home                                                                                                                    |

## 10. Redesign goals and constraints for the designer

- Keep every screen and field above. Change layout, hierarchy, visual language, motion and navigation feel freely.
- The top of main screens must stay free of big titles and avatars. The user asked to remove them.
- Design RTL and LTR together. Arabic text needs no letter-spacing and slightly more line height. Emails, phones and codes stay left-to-right inside Arabic text.
- Mobile-first, one-handed use, large tap targets (44 pt minimum), safe areas, keyboard-aware forms.
- Motion: purposeful and fast, spring or ease-out on enter, nothing heavy that hurts low-end Android. Respect "reduce motion".
- Provide empty, loading (skeleton), error and offline states for every list and form.
- Deliver light and dark themes with accessible contrast.
