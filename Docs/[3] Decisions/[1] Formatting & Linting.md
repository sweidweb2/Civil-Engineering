# Decision — Formatting & Linting

**Status:** LOCKED (installed)  
**Date:** 2026-09-20  
**Applies to:** entire monorepo (`civil-web/`, `civil-mobile/`, `backend/`)

---

## Decision

Use one shared quality toolchain at the **repo root**, with per-app ESLint/TypeScript configs:

| Tool                                 | Role                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| **EditorConfig**                     | Baseline editor settings (root `.editorconfig`)            |
| **Prettier**                         | Sole code formatter (root `.prettierrc`)                   |
| **ESLint**                           | Per-app flat configs; orchestrated via root `npm run lint` |
| **TypeScript `strict`**              | Required in every app `tsconfig`                           |
| **eslint-plugin-simple-import-sort** | Import / export organization                               |
| **Husky**                            | Git hooks                                                  |
| **lint-staged**                      | Format + lint staged files on commit                       |

Root scripts:

```bash
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run lint          # ESLint all apps
npm run typecheck     # tsc all apps
```

---

## Layout

```text
Civil-Engineering-v1/
├── package.json              # root scripts + husky/lint-staged deps
├── lint-staged.config.mjs
├── .prettierrc
├── .prettierignore
├── .editorconfig
├── .husky/pre-commit         # → lint-staged
├── .vscode/settings.json
├── .vscode/extensions.json
├── civil-web/eslint.config.js
├── civil-mobile/eslint.config.js
└── backend/eslint.config.js
```

---

## Import organization (locked)

`simple-import-sort` groups (all apps):

1. Side-effect imports
2. External packages (`node:`, `react`, `expo`, other `@?\\w`)
3. Internal alias (`@/…`) — web/mobile
4. Relative imports (`./`, `../`)

Exports are also sorted. Autofix via `eslint --fix`.

---

## TypeScript strict

| App                                                      | `strict` |
| -------------------------------------------------------- | -------- |
| `civil-web` (`tsconfig.app.json` / `tsconfig.node.json`) | `true`   |
| `civil-mobile`                                           | `true`   |
| `backend`                                                | `true`   |

Do not weaken strict to silence errors. Backend TypeScript is pinned to **~6.x** so `typescript-eslint` works (TS 7 not supported yet by the plugin).

Mobile typecheck excludes vendor `src/components/ui` (gluestack primitives) and Detox e2e specs.

---

## Commit gate

```text
git commit
    ↓
Husky pre-commit
    ↓
lint-staged (Prettier + app ESLint --fix on staged paths)
    ↓
commit allowed / blocked
```

Typecheck / tests / build remain in **CI** (not every local commit).

---

## Rules locked

1. One formatter: Prettier only.
2. TypeScript **strict** stays on.
3. Do not bypass Husky with `--no-verify` unless the **repo owner** allows an emergency exception.
4. Fix lint root causes; do not mass-disable rules without discussion.
5. `format:check` / `lint` / `typecheck` must pass in CI before merge to `dev` or `main` (same suite on both).

---

## Related

- [Contributing](../[1]%20Main%20App/[3]%20Contributing.md)
- [Git Branch Strategy](./[2]%20Git%20Branch%20Strategy.md)
- Root `.editorconfig`
