# Contributing

## Local setup

Follow the [README](README.md#run-locally). Use Node.js 22+, locked dependencies from `npm ci`, and a local MongoDB replica set. Create your private `.env` from `.env.example`. Keep credentials, user data, build output, and test artifacts out of commits.

## Development workflow

1. Create a branch from `main` with a focused purpose.
2. Keep changes consistent with the existing React/Express structure and request validation.
3. Preserve owner/member authorization, HTTP-only sessions, and transaction boundaries when changing related features.
4. Update documentation and `.env.example` when behavior or configuration changes.
5. Run checks appropriate to the change and open a pull request with a clear description and validation results.

For application changes, start local MongoDB and run:

```bash
npm test
npm run build
```

For browser behavior, start `npm run dev` separately, seed local data, install Chromium, and run `npm run test:e2e`. Browser tests create records; run them against a disposable local database, never the public deployment. See [verification.md](docs/verification.md).

Use `npm run format` for application formatting. For documentation-only changes, check Markdown formatting, relative links, examples, and `git diff --check`; application tests are unnecessary unless executable behavior changes.

## Pull requests and issues

Use the issue and pull request templates. Explain the problem, the resulting behavior, and how you checked it. Include screenshots for visible changes when helpful. Remove secret values and personal data from screenshots and logs. Avoid unrelated refactors in a focused fix.

For a vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening a public bug report. Contributions are provided under the repository's [MIT License](LICENSE).
