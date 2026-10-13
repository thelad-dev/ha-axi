# ha-axi

[![npm version](https://img.shields.io/npm/v/%40dtrywets%2Fha-axi.svg)](https://www.npmjs.com/package/@dtrywets/ha-axi)
[![CI](https://github.com/thelad-dev/ha-axi/actions/workflows/ci.yml/badge.svg)](https://github.com/thelad-dev/ha-axi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/thelad-dev/ha-axi)](LICENSE)
[![Node.js](https://img.shields.io/node/v/%40dtrywets%2Fha-axi.svg)](https://www.npmjs.com/package/@dtrywets/ha-axi)

**ha-axi** is an Agent eXperience Interface (AXI) CLI for [Home Assistant](https://www.home-assistant.io/) — built for people and AI agents who need a fast, token-efficient way to inspect and safely act on a home.

Home Assistant’s REST and WebSocket APIs return large JSON payloads. Agents burn tokens re-asking the same orientation questions. ha-axi answers with compact [TOON](https://toonformat.dev/) output, one tool surface instead of many round-trips, and **confirmed-only mutations** so writes never slip through silently.

> **Package name:** install **`@dtrywets/ha-axi`**. The unscoped npm package [`ha-axi`](https://www.npmjs.com/package/ha-axi) is a **different, unrelated project**. The binary name after install is still `ha-axi`.

## Quick start

**Requirements:** Node.js **22+**, a Home Assistant **Long-Lived Access Token** (Profile → Security).

```sh
npm install -g @dtrywets/ha-axi
# or one-shot:
npx -y @dtrywets/ha-axi doctor
```

Configure once (env or config file — never commit the token):

```sh
export HA_URL=http://homeassistant.local:8123
export HA_TOKEN=YOUR_LONG_LIVED_TOKEN   # do not echo or commit
```

Or write `~/.config/ha-axi/config.json` (mode `0600`):

```json
{ "url": "http://homeassistant.local:8123", "token": "YOUR_LONG_LIVED_TOKEN" }
```

First read command:

```sh
ha-axi doctor
```

Example output (illustrative — your URL, version, and counts will differ):

```text
doctor:
  url: "http://homeassistant.local:8123"
  url_source: env
  token: present
  token_source: env
  http_reachable: true
  http_status: 200
  auth: ok
  ha_message: API running.
  version: 2026.10.1
  location: Home
  config_path: ~/.config/ha-axi/config.json
```

If `auth` is not `ok`, fix URL/token first — see [Troubleshooting](#troubleshooting).

## When to use ha-axi vs the Home Assistant MCP server

| Need | Prefer |
|---|---|
| Compact CLI output for shells, scripts, or agent skills | **ha-axi** |
| Confirmed mutations from a terminal or non-interactive agent with an explicit `--confirm` | **ha-axi** |
| Deep IDE/chat tool calling with rich MCP schemas inside a single assistant session | **Home Assistant MCP server** |
| Browsing every HA integration surface as first-class MCP tools | **Home Assistant MCP server** |

They are complementary: ha-axi is a small, installable CLI with TOON-first output; the MCP server is better when your assistant already speaks MCP and you want in-session tool discovery.

## Auth

Never print tokens to stdout or logs.

| Source | Keys |
|---|---|
| Environment | `HA_URL` (default `http://homeassistant.local:8123`), `HA_TOKEN` |
| Env aliases | `HASS_SERVER` / `HASS_URL`, `HASS_TOKEN` (hass-cli compatible) |
| Config file | `~/.config/ha-axi/config.json` → `{ "url", "token" }` (mode `0600`) |

Create a **Long-Lived Access Token** in Home Assistant: **Profile → Security**. Treat it like a password: store it only in env or the config file, rotate it if it leaks, and never paste it into issues or chat logs.

## Commands

| Command | Purpose |
|---|---|
| `ha-axi` | Home view — version, entity counts, problem sample, next steps |
| `ha-axi doctor` | Reachability + auth check (token shown only as present/missing) |
| `ha-axi state list` | List states (`--domain`, `--search`, `--limit`, `--fields full`) |
| `ha-axi state get <id>` | One entity (`--full` for complete attributes) |
| `ha-axi entity search <q>` | Search entity id, friendly name, attributes |
| `ha-axi service list` | List services (`--domain`) |
| `ha-axi service call <domain> <service>` | Call service (**confirm**; `--entity-id`, `--data`) |
| `ha-axi automation list` | List `automation.*` |
| `ha-axi automation reload` | Reload automations (**confirm**) |
| `ha-axi config info` | Version, location, timezone |
| `ha-axi config check` | `check_config` (**confirm**) |
| `ha-axi area list` | Area registry (WebSocket) |
| `ha-axi device list` | Device registry (WebSocket) |
| `ha-axi setup hooks` | Install SessionStart hooks |
| `ha-axi update` | Self-update via npm (`--check` dry-run) |

Global: `--format toon|json` (default TOON), `--json`, `-v` / `--version`, `--help`.  
Mutating commands also accept `--confirm`. Per-command help: `ha-axi <command> --help`.

## Example outputs

Illustrative TOON snippets — invented names and counts, same shape as a live run.

### Home view

```sh
ha-axi
```

```text
bin: ~/.local/bin/ha-axi
description: Operate Home Assistant through a token-efficient AXI CLI (REST + WebSocket)
ha:
  url: "http://homeassistant.local:8123"
  version: 2026.10.1
  location: Home
  time_zone: Europe/Berlin
  state: RUNNING
  entities: 842
  automations: 12/18 on
domains[6]{domain,count}:
  sensor,410
  binary_sensor,95
  light,48
  switch,37
  climate,9
  media_player,6
```

### States

```sh
ha-axi state list --domain light --limit 5
```

```text
count: 5 of 48 total
states[5]{entity_id,state,name}:
  light.kitchen_ceiling,on,Kitchen Ceiling
  light.living_room_lamp,off,Living Room Lamp
  light.hallway,off,Hallway
  light.office_desk,on,Office Desk
  light.porch,unavailable,Porch
```

```sh
ha-axi state get light.kitchen_ceiling
```

```text
state:
  entity_id: light.kitchen_ceiling
  state: on
  friendly_name: Kitchen Ceiling
  last_changed: "2026-10-13T18:02:11.000000+00:00"
  last_updated: "2026-10-13T18:02:11.000000+00:00"
  attributes:
    supported_color_modes[1]: brightness
    brightness: 180
    friendly_name: Kitchen Ceiling
    supported_features: 4
```

### Entity search

```sh
ha-axi entity search motion --limit 5
```

```text
query: motion
count: 5 of 14 total
entities[5]{entity_id,state,name}:
  binary_sensor.hallway_motion,off,Hallway Motion
  binary_sensor.garage_motion,on,Garage Motion
  binary_sensor.yard_motion,off,Yard Motion
  binary_sensor.office_motion,off,Office Motion
  binary_sensor.basement_motion,unavailable,Basement Motion
```

### Areas and devices

```sh
ha-axi area list
```

```text
count: 6 of 6 total
areas[6]{area_id,name,floor_id}:
  kitchen,Kitchen,ground
  living_room,Living Room,ground
  office,Office,ground
  bedroom,Bedroom,upper
  garage,Garage,ground
  yard,Yard,null
```

```sh
ha-axi device list --limit 5
```

```text
count: 5 of 64 total
devices[5]{id,name,manufacturer,model,area_id,disabled}:
  a1b2c3d4e5f60718293a4b5c6d7e8f90,Kitchen Ceiling,Philips,Hue white,kitchen,false
  11223344556677889900aabbccddeeff,Living Room Lamp,IKEA,TRÅDFRI,living_room,false
  0f1e2d3c4b5a69788796a5b4c3d2e1f0,Hallway Motion,Aqara,RTCGQ11LM,kitchen,false
  99887766554433221100ffeeddccbbaa,Office Desk Plug,TP-Link,HS110,office,false
  deadbeefcafebabe0123456789abcdef,Yard Cam,Generic,rtsp,yard,false
```

### Automations

```sh
ha-axi automation list --limit 5
```

```text
count: 5 of 18 total
automations[5]{entity_id,state,name}:
  automation.sunset_living_room,on,Sunset living room
  automation.hallway_motion_light,on,Hallway motion light
  automation.garage_door_alert,off,Garage door alert
  automation.guest_mode,off,Guest mode
  automation.vacuum_weekday,on,Vacuum weekdays
```

### Services

```sh
ha-axi service list --domain light
```

```text
count: 4 of 4 total
services[4]{domain,service,name}:
  light,toggle,""
  light,turn_off,""
  light,turn_on,""
  light,set_brightness,Set brightness
```

```sh
# mutation — refused without TTY y/N or --confirm
ha-axi service call light turn_off --entity-id light.office_desk --confirm
```

## Mutations and safety

Every write requires either:

1. an interactive TTY `y/N` confirmation, or
2. an explicit `--confirm` flag (for non-interactive agents that already reviewed the action).

Without a TTY and without `--confirm`, mutations are **refused** (`CONFIRM_REQUIRED`).

Dangerous classes (`shell_command`, `wake_on_lan`, host power/restart, irrigation/valve-like entity ids) produce stronger warnings. There is no silent static deny-only gate — confirmation is always required.

## Agent skill

On-demand skill shipped with the package (`skills/ha-axi`):

```sh
npx skills add thelad-dev/ha-axi --skill ha-axi
```

Optional ambient SessionStart hooks:

```sh
ha-axi setup hooks
```

Prefer the skill for on-demand agent use; hooks are an explicit opt-in for ambient home context.

## Troubleshooting

```sh
ha-axi doctor
```

| Symptom | What to check |
|---|---|
| `http_reachable: false` | URL, network, HA running, TLS/HTTP scheme |
| `token: missing` | `HA_TOKEN` / `HASS_TOKEN` or config file |
| `auth` not `ok` | Token revoked/expired; recreate Long-Lived Access Token |
| Wrong host | Env overrides config; `url_source` / `token_source` in doctor output |

Default output is TOON; use `--format json` when a consumer needs JSON.

## Out of scope

- Zigbee2MQTT admin → separate `z2m-axi`
- ESP / ESPHome flash & OTA
- Direct `.storage` or YAML edits on the HA host

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Short path:

```sh
npm install
npm test
npm run build
node dist/bin/ha-axi.js doctor
```

## Security

Token handling and vulnerability reporting: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
