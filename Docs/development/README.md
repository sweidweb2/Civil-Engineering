# Development

**Source of truth**

- Root [`README.md`](../../README.md) — how to run web / mobile / backend
- [`Docs/[1] Main App/[3] Contributing.md`](../../Docs/[1]%20Main%20App/[3]%20Contributing.md)
- [`Docs/[1] Main App/[4] Libraries.md`](../../Docs/[1]%20Main%20App/[4]%20Libraries.md)
- [`Docs/[1] Main App/[2] Bedrock Checklist.md`](../../Docs/[1]%20Main%20App/[2]%20Bedrock%20Checklist.md)
- Env examples: `backend/.env.example` (and app `.env` files — never commit secrets)

**Summary**

- Monorepo: `civil-web/`, `civil-mobile/`, `backend/`
- Public client env: `VITE_*` / `EXPO_PUBLIC_*`
- Prefer existing module/feature layout; ask before architecture changes
