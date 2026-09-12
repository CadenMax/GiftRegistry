# Contributing

## Development setup

1. Install Node.js 22.5 or newer.
2. Run `npm install`.
3. Start the API with `npm run server`.
4. Start the Vite client in a second terminal with `npm run dev`.

## Checks before submitting changes

Run:

```bash
npm run lint
npm run build
npm test
node --check server/index.mjs
node --check server/authRoutes.mjs
node --check server/sharedRoutes.mjs
```

Keep recipient and gift-giver projections separate. Never add claim or purchase data to recipient-facing responses. Changes to authentication, shared-list access, claims, messages, or persistence should include a focused regression test or a documented manual verification path.
