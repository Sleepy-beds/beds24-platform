# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-04-27

### Added
- `IdempotencyStore` interface and `InMemoryIdempotencyStore` for Stripe
  webhook deduplication. The default in-memory store can be replaced with a
  shared, persistent store (Redis, DynamoDB, etc.) via
  `BookingSDKConfig.idempotencyStore` for safe production use across
  serverless / multi-instance deployments.
- vitest test suite covering validation, pricing, cache, idempotency,
  checkout, and webhook handlers.
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) running
  typecheck, tests, and build on Node 18 / 20 / 22.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Issue and pull-request templates under `.github/`.
- `sideEffects: false` and `author` fields in `package.json`.
- Stable, locale-independent error codes (`ValidationErrorCode`,
  `CheckoutErrorCode`) on validation and checkout errors so consumers can
  localize messages without parsing English text.
- `BookingEmailTemplates` interface and `BookingSDKConfig.templates` /
  `WebhookHandlerConfig.templates` to inject custom (e.g. English)
  confirmation email templates in place of the built-in Japanese ones.

### Changed
- README and README.ja now document the production warning around webhook
  idempotency and how to inject a custom store.
- Build (`tsconfig.build.json`) now excludes `src/__tests__/**` from `dist/`.
- **Default messages are now English.** All SDK-internal user-facing strings
  — validation errors, checkout errors, log messages, the owner-side
  "guest email failed" alert, and the Beds24 booking notes labels — are now
  English by default. Japanese-language consumers should map error `code`s
  back to localized strings (see README "Error handling & localization").
- Stripe Checkout product `name` / `description` no longer hardcode Japanese
  unit suffixes (`泊` / `名`); they now read `N nights` / `N guests`.

### Migration notes (from 0.1.1)
- `ValidationError` and `CheckoutError` gained a required `code` field.
  Existing code that only reads `field` / `message` / `error` / `status` is
  unaffected; code that constructs these types manually must add `code`.
- All built-in user-visible strings are now English. If your UI displayed
  the SDK's `message` / `error` directly to Japanese-speaking users, switch
  to a code-based localization layer.

## [0.1.1] - 2025-04-10

- Initial public release.

[Unreleased]: https://github.com/WataruShirako/beds24-booking-sdk/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/WataruShirako/beds24-booking-sdk/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/WataruShirako/beds24-booking-sdk/releases/tag/v0.1.1
