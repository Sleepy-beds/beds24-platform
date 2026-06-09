# Beds24 Developer Platform

Make [Beds24](https://beds24.com) easy to use from a modern stack — Next.js, React,
WordPress, LINE, Supabase, and webhook automation.

This is a pnpm monorepo. The **core is a pure, dependency-free API client** (`beds24-sdk`);
payments, email, LINE, and framework integrations are layered on top of it — never baked in.

## Packages

| Package | Path | Status | Description |
| ------- | ---- | ------ | ----------- |
| [`beds24-sdk`](packages/beds24-sdk) | `packages/beds24-sdk` | ✅ core | Typed, zero-dependency Beds24 API v2 client with structured errors. |
| [`beds24-booking-sdk`](packages/booking) | `packages/booking` | ✅ | All-in-one booking flow (Beds24 + Stripe + Resend) built on the core. |
| [`beds24-line`](packages/beds24-line) | `packages/beds24-line` | ✅ | LINE notifications for booking events (new booking / cancellation / check-in reminder). |
| [`beds24-nextjs`](packages/beds24-nextjs) | `packages/beds24-nextjs` | ✅ | Next.js App Router route handlers (availability / calendar / checkout / webhook). |
| `beds24-wordpress` | _planned_ | ⬜ | WordPress plugin. |
| [`examples/*`](examples) | `examples/` | ✅ | Runnable examples (LINE check-in reminder). |
| [`docs`](docs) | `docs/` | ✅ | Mintlify documentation site. |

## Roadmap

- [x] Extract a pure `beds24-sdk` core (this restructure)
- [x] Structured `Beds24Error` with stable codes
- [x] Unit tests + CI (GitHub Actions, Node 18/20/22)
- [x] `beds24-line` — LINE notifications for booking events _(the differentiator)_
- [x] `beds24-nextjs` — App Router route handlers
- [x] Docs site (Mintlify scaffold in `docs/`)
- [x] Examples (`examples/line-checkin-reminder`)
- [ ] `beds24-wordpress` plugin

## Development

```bash
pnpm install
pnpm -r build      # builds in topological order (core first)
pnpm -r typecheck
pnpm -r test
```

`pnpm ci` runs typecheck + build + test across the workspace.

## Publishing

All packages publish under the **`@sleepy-beds`** npm scope
(`@sleepy-beds/beds24-sdk`, `@sleepy-beds/beds24-booking-sdk`, `@sleepy-beds/beds24-line`,
`@sleepy-beds/beds24-nextjs`).
See **[PUBLISHING.md](PUBLISHING.md)** for the one-time npm-org setup and the
manual / CI release steps.

> The unscoped name `beds24-sdk` is taken on npm by an unrelated placeholder, which is why
> the scope is used.

## License

[MIT](LICENSE)
