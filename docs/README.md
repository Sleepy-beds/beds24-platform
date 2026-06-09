# Docs

[Mintlify](https://mintlify.com) documentation site for the Beds24 developer platform.

## Preview locally

```bash
npm i -g mintlify   # or: npx mintlify dev
cd docs
mintlify dev        # serves at http://localhost:3000
```

## Structure

- `docs.json` — site config & navigation
- `introduction.mdx`, `quickstart.mdx`, `authentication.mdx` — getting started
- `packages/*.mdx` — one page per package
- `guides/*.mdx` — error handling, LINE notifications

## Deploy

Connect this repo on the [Mintlify dashboard](https://dashboard.mintlify.com) and set the
docs directory to `docs/`. Pushes to `main` redeploy automatically.
