# Decision — Formatting & Linting

**Status:** LOCKED (tooling to install next)  
**Date:** 2026-09-18  
**Applies to:** entire monorepo (`civil-web/`, `civil-mobile/`, `backend/`)

---

## Decision

Use one shared quality toolchain at the **repo root**:

| Tool                    | Role                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| **EditorConfig**        | Baseline editor settings (already at root)                             |
| **Prettier**            | Code formatting                                                        |
| **ESLint**              | Lint / static checks (per-app configs allowed, orchestrated from root) |
| **TypeScript `strict`** | Required in every app `tsconfig`                                       |
| **Husky**               | Git hooks                                                              |
| **lint-staged**         | Run format/lint only on staged files at commit                         |

Root scripts (to be added when installed):

```bash
npm run format      # Prettier write
npm run lint        # ESLint (all apps / workspaces)
npm run typecheck   # tsc -b / per-app typecheck
```

---

## Target layout

```text
Civil-Engineering-v1/
├── civil-web/
├── civil-mobile/
├── backend/
├── .editorconfig          # exists
├── .prettierrc            # TODO
├── .prettierignore        # TODO
├── eslint.config.js       # TODO (or eslint.config.mjs + app overrides)
├── package.json           # TODO root workspace scripts + husky/lint-staged
├── .husky/                # TODO
│   └── pre-commit
└── .vscode/
    └── settings.json      # TODO format-on-save for Cursor/VS Code
```

Apps keep their own `tsconfig` / local ESLint needs (Expo, Vite), but **Prettier + commit hooks + npm scripts live at root** so one command covers the monorepo.

---

## Commit gate (required for everyone using local hooks)

```text
git commit
    ↓
Husky pre-commit
    ↓
lint-staged
    ↓
Prettier (staged files)
    ↓
ESLint (staged files)
    ↓
commit allowed / blocked
```

- Bad formatting or lint errors on staged files → **commit blocked**.
- Typecheck / tests / build run in **CI on PRs** (see Git branch strategy decision), not necessarily on every local commit (keeps commits fast).

---

## Editor / Cursor setup

Root `.vscode/settings.json` (recommended):

- `editor.formatOnSave`: true
- Default formatter: Prettier
- ESLint validate: TypeScript / TSX
- Optional: `editor.codeActionsOnSave` → `source.fixAll.eslint`

Commit a shared `.vscode/extensions.json` recommending:

- Prettier
- ESLint

So Cursor/VS Code formats while developing; Husky catches misses at commit.

---

## Rules locked with this decision

1. Do not invent a second formatter (no competing style guides per app).
2. TypeScript **strict** stays on — do not weaken to silence errors.
3. Do not bypass Husky with `--no-verify` unless the **repo owner** explicitly allows an emergency exception.
4. Fix root cause of lint errors; do not mass-disable rules without discussion.
5. `format` / `lint` / `typecheck` must pass in CI before merge to `dev` or `main` (see branch strategy).

---

## Implementation checklist

- [ ] Root `package.json` (workspaces or script orchestration)
- [ ] Install Prettier + ESLint + Husky + lint-staged
- [ ] Add `.prettierrc` / `.prettierignore`
- [ ] Add root ESLint flat config + app overrides as needed
- [ ] Enable `strict` in all app `tsconfig`s
- [ ] Scripts: `format`, `lint`, `typecheck`
- [ ] Husky `pre-commit` → lint-staged
- [ ] `.vscode/settings.json` + `extensions.json`
- [ ] Document commands in root README / Contributing

---

## Related

- [Contributing](../[1]%20Main%20App/[3]%20Contributing.md)
- [Git Branch Strategy](./[2]%20Git%20Branch%20Strategy.md)
- Root `.editorconfig`
