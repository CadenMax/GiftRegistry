# GiftRegistry

Personalised gift registry foundations for birthdays, Christmas, anniversaries, and other thoughtful occasions.

## What this repository now includes

- A Vite + React + TypeScript frontend foundation
- A mobile-first, blank-canvas registry experience for two roles:
  - **Recipient**: manages and previews a wishlist without seeing claim data
  - **Gift giver**: uses an access code, browses gifts, and marks items as considering or claimed
- Recipient account creation and sign-in with SQL-backed persistence
- A privacy-first projection layer that keeps claim data out of recipient-facing responses
- Flexible gift data with category, priority, status, image, external link, price, and multi-item dependency support
- Sorting and filtering foundations designed to grow with a real backend later

## Privacy model

The key business rule is enforced structurally:

- `src/data/registry.ts` contains an empty starter registry and claim records are added only through the gift-giver flow
- `src/lib/projections.ts` exposes separate projection builders
  - `createRecipientView(...)` strips all claim/purchase details
  - `createGiftGiverView(...)` includes gift-giver-only claim information

This mirrors the intended backend/API design: recipients should never receive private claim metadata in their response payloads.

## Assumptions captured in this foundation

- Recipients always use authenticated accounts
- Gift givers may continue as guests or save an account for convenience
- Access codes unlock a list-specific gift-giver view without exposing owner controls
- Dependency relationships can point to multiple prerequisite gifts

The starter registry intentionally contains no gift items. Add a first gift from the recipient workspace, then share the generated access code with gift givers.

## SQL persistence

The frontend does not store accounts, sessions, passwords, or registries in browser `localStorage`. The Node server owns authentication and persistence:

- SQLite database: `data/kindlist.sqlite` (created automatically and ignored by Git)
- Passwords: salted `scrypt` hashes stored in SQL
- Sessions: random HttpOnly cookies backed by the `sessions` table
- Registries: account-scoped records in the `registries` table

## Sharing lists

The share control copies a link such as `https://your-domain.example/?list=ABC123`. Anyone with that link can open the giver view without creating an account. Guests enter their name each time, and their claims are stored with that name and a generated guest identity. Signed-in visitors are recognized through their session; their account name and avatar are stored with their claims automatically.

Node 22.5 or newer is required because the server uses Node's built-in `node:sqlite` module. For local development, run the API and Vite in separate terminals:

```bash
npm run server
npm run dev
```

For a single hosted process, build the frontend and start the server:

```bash
npm start
```

Set `PORT` when the host provides a port, and persist the `data/` directory or configure a managed SQL database before deploying multiple server instances. The current adapter uses SQLite; the API boundary can be moved to PostgreSQL or another hosted SQL provider without exposing database credentials to the browser.

## Development

```bash
npm install
npm run lint
npm run build
```
