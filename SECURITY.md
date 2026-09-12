# Security Policy

## Supported versions

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the project maintainer privately with:

- A description of the affected feature or endpoint
- Steps to reproduce the issue
- The potential impact
- Any suggested mitigation

Until a private contact address is configured for this repository, keep deployments limited to trusted users and do not publish sensitive reports publicly.

## Deployment expectations

- Run behind HTTPS.
- Keep the `data/` directory private and persistent.
- Do not expose the Node application port directly to the internet.
- Treat shared list access codes as bearer credentials.
- Use a single application instance with SQLite unless the persistence layer is replaced with a multi-instance database.
