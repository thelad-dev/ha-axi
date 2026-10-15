# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Build & test

- `npm install && npm test && npm run build` (Node >=22; `tsc` is the static check — no eslint/prettier script)
- Entry: `bin/ha-axi.ts` → `dist/bin/ha-axi.js` (fast-path `--version` via `axi-sdk-js/fast-path`)
- Keep `src/version.ts` in sync with `package.json` `version` (fast-path leaf, no package.json import)
- Skill: `skills/ha-axi/SKILL.md` (shipped in npm package)

## Auth & safety

- Config resolution: `src/config.ts` (`HA_URL`/`HA_TOKEN`, aliases `HASS_SERVER`/`HASS_URL`/`HASS_TOKEN`, `~/.config/ha-axi/config.json`, default URL)
- Never echo tokens (see `src/format.ts` `redactSecrets`)
- Mutations: TTY y/N or `--confirm`; non-interactive without flag → `CONFIRM_REQUIRED` (`src/confirm.ts`)
- Two packages (`ha-axi` + separate `z2m-axi`); no static deny-only for danger

## Transport

- REST for states/services/config; WebSocket for area/device registry (`src/ha-client.ts`)
- Out of scope in this package: z2m admin, ESP flash/OTA

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
