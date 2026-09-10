# GiftRegistry

Personalised gift registry foundations for birthdays, Christmas, anniversaries, and other thoughtful occasions.

## What this repository now includes

- A Vite + React + TypeScript frontend foundation
- A mobile-first, blank-canvas registry experience for two roles:
  - **Recipient**: manages and previews a wishlist without seeing claim data
  - **Gift giver**: uses an access code, browses gifts, and marks items as considering or claimed
- Recipient account creation and sign-in foundation with account-scoped local persistence
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

## Account foundation

The current frontend prototype stores recipient accounts, sessions, and registries in browser `localStorage` so registry changes are associated with the signed-in account. Passwords are hashed with the browser Web Crypto API before local storage. This is intentionally a replaceable prototype boundary, not production authentication; a backend should own account records, password hashing, sessions, and authorisation before deployment.

## Development

```bash
npm install
npm run lint
npm run build
```
