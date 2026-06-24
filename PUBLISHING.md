# Publishing

All packages publish to npm under the **`@sleepy-beds`** scope:

| Package directory | npm name |
| ----------------- | -------- |
| `packages/sdk` | `@sleepy-beds/sdk` |
| `packages/booking` | `@sleepy-beds/booking` |
| `packages/line` | `@sleepy-beds/line` |
| `packages/nextjs` | `@sleepy-beds/nextjs` |

Each package sets `publishConfig.access = "public"` (scoped packages are private by
default) and ships its own `LICENSE`, `README.md`, and `dist/`.

## One-time setup

1. **Create the npm organization** named `sleepy-beds`:
   <https://www.npmjs.com/org/create> (Free plan is fine for public packages).
   The org name must match the scope exactly.
2. Make sure your npm account is a member with publish rights.

## Manual publish (from a clean main)

```bash
pnpm install
pnpm -r build          # topological: core first
pnpm -r test

npm login              # or: npm whoami  to confirm you're authenticated
pnpm -r publish --access public
```

- `pnpm -r publish` publishes in dependency order and **replaces `workspace:*`
  ranges with the real versions** in the published manifests automatically.
- Add `--dry-run` first to preview exactly what each tarball will contain.
- Bump versions before publishing (edit each `package.json` `version`, or adopt
  [Changesets](https://github.com/changesets/changesets) — see below).

## CI publish (recommended)

A workflow is provided at `.github/workflows/release.yml`. To use it:

1. Create an **npm automation token**: npm → Access Tokens → Generate → *Automation*.
2. Add it as a repo secret named **`NPM_TOKEN`**
   (`Settings → Secrets and variables → Actions`).
3. Bump versions, commit, then push a tag:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

   The workflow builds and runs `pnpm -r publish --access public`.

## Versioning (future)

For coordinated multi-package releases, adopt **Changesets**:

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

Then `pnpm changeset` per change, and `pnpm changeset version` + publish on release.

## Notes

- All packages publish under the **`@sleepy-beds`** scope; the package name is just the
  role (`sdk`, `booking`, `line`, `nextjs`). An earlier unscoped `beds24-booking-sdk`
  package on a personal account is superseded by `@sleepy-beds/booking`.
- npm **provenance** can be enabled later by adding `--provenance` to the publish step
  (the release workflow already grants `id-token: write`).
