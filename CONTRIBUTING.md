# Contributing to ha-axi

Thanks for helping improve the Home Assistant AXI CLI.

## Development setup

- **Node.js 22+**
- Clone the repo, then:

```sh
npm install
npm test
npm run build
node dist/bin/ha-axi.js --version
```

Point a local Home Assistant instance with a Long-Lived Access Token at the CLI via `HA_URL` / `HA_TOKEN` or `~/.config/ha-axi/config.json` when you need live checks. Never commit tokens.

## Tests and style

- Run `npm test` (Vitest) and `npm run build` (`tsc`) before opening a PR.
- There is no eslint/prettier script; match existing TypeScript style in `src/` and `bin/`.
- Keep `src/version.ts` in sync with `package.json` `version` when bumping.
- Prefer small, focused diffs. Mutations and auth paths must keep confirmation and secret-redaction behavior intact (`src/confirm.ts`, `src/format.ts`).

## Pull requests

1. Branch from the default branch with a short, descriptive name.
2. Cover behavior with tests when you change CLI logic.
3. Update `README.md` / `CHANGELOG.md` when user-facing behavior or docs change.
4. Open a PR against the default branch. Describe what changed and how you tested it (commands run, HA version if relevant).
5. Do not publish to npm or create GitHub releases from a contributor PR — maintainers handle release.

Use the PR template. Keep discussion concrete: what changed, what was tested, what you need from review.

## Issues

- **Bugs:** use the bug report template — CLI version, Node version, HA version, sanitized steps, expected vs actual (no tokens).
- **Features:** use the feature request template — problem, proposed behavior, alternatives.

## Scope reminders

- This package is the HA AXI CLI. Zigbee2MQTT admin belongs in `z2m-axi`; ESP flash/OTA is out of scope.
- The published npm name is `@dtrywets/ha-axi` (binary `ha-axi`). Do not document the unrelated unscoped `ha-axi` package as this project.
