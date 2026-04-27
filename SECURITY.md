# Security Policy

## Supported versions

`beds24-booking-sdk` is in initial development (`0.x`). Only the latest minor
release receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

If you discover a security issue — especially anything affecting the payment,
webhook, or Beds24 booking paths — please report it privately:

- Use GitHub's [private vulnerability reporting][gh-report] for this repository, or
- Email the maintainer at the address listed on the GitHub profile of
  [@WataruShirako](https://github.com/WataruShirako).

Please include:

- A description of the issue and the impact
- Steps to reproduce (a minimal proof-of-concept is ideal)
- Affected version(s)
- Any suggested mitigation

We aim to acknowledge new reports within **72 hours** and to ship a fix or
mitigation within **14 days** for high-severity issues.

## Scope

In scope:

- Authentication / token handling for Beds24
- Stripe Checkout creation and webhook signature verification
- Webhook idempotency / duplicate-booking risks
- Input validation and sanitization in `src/payment/validation.ts`
- Email rendering / injection in templates

Out of scope:

- Issues in upstream services (Beds24, Stripe, Resend) — please report those
  directly to those vendors
- Issues that require a malicious server-side configuration (e.g. an attacker
  who already controls your `process.env`)

## Disclosure

We will coordinate disclosure with reporters. Once a fix is released, we
intend to publish a brief advisory on the GitHub Security tab.

[gh-report]: https://github.com/WataruShirako/beds24-booking-sdk/security/advisories/new
