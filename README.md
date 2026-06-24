# Beds24 Developer Platform

Make [Beds24](https://beds24.com) easy to use from a modern stack — Next.js, React,
WordPress, LINE, Supabase, and webhook automation.

This is a pnpm monorepo. The **core is a pure, dependency-free API client**
(`@sleepy-beds/sdk`); payments, email, LINE, and framework integrations are layered on
top of it — never baked in. Packages are named Hono-style: the `@sleepy-beds` scope is
the brand, and each package name is just its role.

## Packages

| Package | Path | Status | Description |
| ------- | ---- | ------ | ----------- |
| [`@sleepy-beds/sdk`](packages/sdk) | `packages/sdk` | ✅ core | Typed, zero-dependency Beds24 API v2 client with structured errors. |
| [`@sleepy-beds/booking`](packages/booking) | `packages/booking` | ✅ | All-in-one booking flow (Beds24 + Stripe + Resend) built on the core. |
| [`@sleepy-beds/line`](packages/line) | `packages/line` | ✅ | LINE notifications for booking events (new booking / cancellation / check-in reminder). |
| [`@sleepy-beds/nextjs`](packages/nextjs) | `packages/nextjs` | ✅ | Next.js App Router route handlers (availability / calendar / checkout / webhook). |
| `@sleepy-beds/wordpress` | _planned_ | ⬜ | WordPress plugin. |

## Apps & examples

| | Path | Description |
| --- | ---- | ----------- |
| [`reservation-site`](apps/reservation-site) | `apps/reservation-site` | Forkable booking-site template — Hono backend + React/Vite/Tailwind frontend. Runs in mock mode with zero setup. |
| [`examples/*`](examples) | `examples/` | Runnable examples (LINE check-in reminder). |
| [`docs`](docs) | `docs/` | Mintlify documentation site. |

## Roadmap

- [x] Extract a pure `@sleepy-beds/sdk` core (this restructure)
- [x] Structured `Beds24Error` with stable codes
- [x] Unit tests + CI (GitHub Actions, Node 18/20/22)
- [x] `@sleepy-beds/line` — LINE notifications for booking events _(the differentiator)_
- [x] `@sleepy-beds/nextjs` — App Router route handlers
- [x] `reservation-site` — forkable booking-site template (Hono + React)
- [x] Docs site (Mintlify scaffold in `docs/`)
- [x] Examples (`examples/line-checkin-reminder`)
- [ ] `@sleepy-beds/wordpress` plugin

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
(`@sleepy-beds/sdk`, `@sleepy-beds/booking`, `@sleepy-beds/line`,
`@sleepy-beds/nextjs`).
See **[PUBLISHING.md](PUBLISHING.md)** for the one-time npm-org setup and the
manual / CI release steps.

## License

[MIT](LICENSE)
