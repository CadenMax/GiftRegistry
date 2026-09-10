# GiftRegistry

Personalised gift registry foundations for birthdays, Christmas, anniversaries, and other thoughtful occasions.

## What this repository now includes

- A Vite + React + TypeScript frontend foundation
- A mobile-first registry experience for two roles:
  - **Recipient**: manages and previews a wishlist without seeing claim data
  - **Gift giver**: uses an access code, browses gifts, and marks items as considering or claimed
- A privacy-first projection layer that keeps claim data out of recipient-facing responses
- Flexible gift data with category, priority, status, image, external link, price, and multi-item dependency support
- Sorting and filtering foundations designed to grow with a real backend later

## Privacy model

The key business rule is enforced structurally:

- `src/data/registry.ts` contains the full demo registry and claim records
- `src/lib/projections.ts` exposes separate projection builders
  - `createRecipientView(...)` strips all claim/purchase details
  - `createGiftGiverView(...)` includes gift-giver-only claim information

This mirrors the intended backend/API design: recipients should never receive private claim metadata in their response payloads.

## Assumptions captured in this foundation

- Recipients always use authenticated accounts
- Gift givers may continue as guests or save an account for convenience
- Access codes unlock a list-specific gift-giver view without exposing owner controls
- Dependency relationships can point to multiple prerequisite gifts

## Development

```bash
npm install
npm run lint
npm run build
```
