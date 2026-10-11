---
name: ha-axi
description: >
  Operate Home Assistant via the ha-axi CLI — list/get states, search entities,
  list/call services (confirmed mutations), automations, areas/devices registry,
  and doctor/auth checks with token-efficient TOON output.
---

# ha-axi

Use `ha-axi` when a task needs live Home Assistant state, entity search, service
calls, automation status, or area/device registry data.

## Auth (never print tokens)

- Env: `HA_URL` (default `http://homeassistant.local:8123`), `HA_TOKEN`
- Aliases: `HASS_SERVER` / `HASS_URL`, `HASS_TOKEN`
- File: `~/.config/ha-axi/config.json` `{ "url", "token" }` mode `0600`
- Long-Lived Access Token: HA Profile → Security
- Requires Node.js 22+

## Install

```sh
npm install -g @dtrywets/ha-axi
# or
npx -y @dtrywets/ha-axi doctor
```

The unscoped npm package `ha-axi` is a different project; use `@dtrywets/ha-axi` (binary name remains `ha-axi`).

## Core commands

```sh
npx -y @dtrywets/ha-axi
npx -y @dtrywets/ha-axi doctor
npx -y @dtrywets/ha-axi state list --domain light --limit 20
npx -y @dtrywets/ha-axi state get light.kitchen
npx -y @dtrywets/ha-axi entity search motion
npx -y @dtrywets/ha-axi service list --domain switch
npx -y @dtrywets/ha-axi service call light turn_on --entity-id light.kitchen --confirm
npx -y @dtrywets/ha-axi automation list
npx -y @dtrywets/ha-axi config info
npx -y @dtrywets/ha-axi area list
npx -y @dtrywets/ha-axi device list --area living_room
```

## Safety

- Every mutation needs a TTY `y/N` prompt **or** explicit `--confirm`
- Non-interactive sessions without `--confirm` are refused
- Dangerous classes (shell_command, WoL, host power, irrigation-like entities) get stronger warnings — not a silent hard-deny alone
- Default output is TOON; use `--format json` when needed
- Out of scope: Zigbee2MQTT admin (`z2m-axi`), ESP flash/OTA

## Session hook (optional)

```sh
npx -y @dtrywets/ha-axi setup hooks
```

Prefer the hook for ambient home context; this skill is the on-demand path.
