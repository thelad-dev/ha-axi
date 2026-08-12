# ha-axi

Agent eXperience Interface (AXI) CLI for [Home Assistant](https://www.home-assistant.io/).

Token-efficient [TOON](https://toonformat.dev/) output, REST + WebSocket transport,
local auth, and **confirmed** mutations so agents can orient and act safely.

## Install

```sh
npm install -g ha-axi
# or
npx -y ha-axi doctor
```

Agent Skill (on-demand):

```sh
npx skills add thelad-dev/ha-axi --skill ha-axi
```

Session hooks (ambient home view — explicit opt-in):

```sh
ha-axi setup hooks
```

## Auth

Never print tokens to stdout or logs.

| Source | Keys |
|---|---|
| Environment | `HA_URL` (default `http://homeassistant.local:8123`), `HA_TOKEN` |
| Env aliases | `HASS_SERVER`, `HASS_TOKEN` (hass-cli compatible) |
| Config file | `~/.config/ha-axi/config.json` → `{ "url": "...", "token": "..." }` (mode `0600`) |

Create a **Long-Lived Access Token** in Home Assistant: **Profile → Security**.

```sh
export HA_URL=http://homeassistant.local:8123
export HA_TOKEN=...   # do not commit or echo
ha-axi doctor
```

## Commands

| Command | Purpose |
|---|---|
| `ha-axi` | Home view — version, entity counts, problem sample, next steps |
| `ha-axi doctor` | Reachability + auth check (token shown only as present/missing) |
| `ha-axi state list` | List states (`--domain`, `--search`, `--limit`) |
| `ha-axi state get <id>` | One entity (`--full` for complete attributes) |
| `ha-axi entity search <q>` | Search entity id / friendly name |
| `ha-axi service list` | List services (`--domain`) |
| `ha-axi service call <domain> <service>` | Call service (**confirm**) |
| `ha-axi automation list` | List `automation.*` |
| `ha-axi automation reload` | Reload automations (**confirm**) |
| `ha-axi config info` | Version, location, timezone |
| `ha-axi config check` | `check_config` (**confirm**) |
| `ha-axi area list` | Area registry (WebSocket) |
| `ha-axi device list` | Device registry (WebSocket) |
| `ha-axi setup hooks` | Install SessionStart hooks |

Global: `--format toon|json` (default TOON), `--json`, `-v` / `--version`, `--help`.

## Mutations and safety

Every write requires either:

1. an interactive TTY `y/N` confirmation, or
2. an explicit `--confirm` flag (for non-interactive agents that already reviewed the action).

Without a TTY and without `--confirm`, mutations are **refused**.

Dangerous classes (`shell_command`, `wake_on_lan`, host power/restart, irrigation/valve-like entity ids) produce stronger warnings. There is no silent static deny-only gate — confirmation is always required.

### Examples

```sh
ha-axi
ha-axi doctor
ha-axi state list --domain light --limit 20
ha-axi state get light.kitchen
ha-axi entity search motion
ha-axi service list --domain switch
ha-axi service call switch turn_off --entity-id switch.desk --confirm
ha-axi area list
ha-axi device list --search zigbee --limit 30
ha-axi doctor --format json
```

## Out of scope

- Zigbee2MQTT admin → separate `z2m-axi`
- ESP / ESPHome flash & OTA
- Direct `.storage` or YAML edits on the HA host

## Development

```sh
npm install
npm test
npm run build
node dist/bin/ha-axi.js doctor
```

## License

MIT
