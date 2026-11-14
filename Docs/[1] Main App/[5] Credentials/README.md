# Credentials (local only)

Private notes for accounts, API tokens, and cloud keys used by this project.

**Rules**

- Real secret files in this folder are **gitignored** — do not force-add them.
- Put runtime values in `backend/.env` (also gitignored). Keep `.env.example` as placeholders only.
- Prefer rotating any secret that was pasted into chat, email, or a ticket.

## Topics

| Topic                   | Local file (gitignored)                                    | Env (when wired)                             |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Storage — Cloudflare R2 | [`Storage - Cloudflare.md`](./Storage%20-%20Cloudflare.md) | `STORAGE_*`, optional `CLOUDFLARE_API_TOKEN` |

Create topic files next to this README as needed (same naming style: `Topic - Provider.md`).
