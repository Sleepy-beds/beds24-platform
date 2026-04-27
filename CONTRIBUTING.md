# Contributing

Thanks for considering a contribution to `beds24-booking-sdk`!

## Development setup

```bash
git clone https://github.com/WataruShirako/beds24-booking-sdk.git
cd beds24-booking-sdk
npm install
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript type checking (no emit) |
| `npm test` | Run the vitest unit test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Compile to `dist/` (used by `prepublishOnly`) |

## Pull request checklist

Before opening a PR, please make sure:

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] New behavior is covered by a test
- [ ] Public API changes are reflected in `README.md` and `README.ja.md`
- [ ] User-visible changes are noted in `CHANGELOG.md` under `## [Unreleased]`

## Coding guidelines

- Keep public APIs small and explicit. Prefer named exports.
- Avoid introducing new runtime dependencies if a peer dependency or platform
  built-in will do.
- Error messages user code may surface in the UI are written in Japanese today;
  if you add new ones, follow the existing style or open an issue first if you
  want to internationalize.
- Webhook handlers and payment paths must remain idempotent. If you change
  `src/payment/webhook.ts`, add a test that covers the duplicate-delivery case.

## Reporting bugs / requesting features

Open an issue at <https://github.com/WataruShirako/beds24-booking-sdk/issues>
using one of the issue templates.

## Releasing (maintainers)

1. Update `CHANGELOG.md` — move `Unreleased` items under a new version heading.
2. Bump `package.json` `version`.
3. `git tag vX.Y.Z && git push --tags`.
4. `npm publish` (the `prepublishOnly` hook will rebuild `dist/`).

## License

By contributing you agree that your contributions will be licensed under the
project's MIT license.
