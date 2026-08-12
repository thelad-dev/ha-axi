export const DESCRIPTION =
  "Operate Home Assistant through a token-efficient AXI CLI (REST + WebSocket)";

export const TOP_LEVEL_HELP = `usage: ha-axi <command> [args] [flags]

bin description:
  ${DESCRIPTION}

commands:
  (none)             Home view — HA version, counts, problem entities
  doctor             Check URL/token reachability (never prints secrets)
  state list|get     List or get entity states
  entity search      Search entities by id/name/attributes
  service list|call  List services or call one (mutation, confirmed)
  automation list|reload
  config info|check  HA config info or check_config (check mutates/validates)
  area list          Areas via WebSocket registry
  device list        Devices via WebSocket registry
  setup hooks        Install session-start hooks (explicit opt-in)
  update             Self-update via npm (SDK built-in)

global flags:
  --format toon|json   Output format (default: toon)
  --json               Shortcut for --format json
  -v, -V, --version    Print version
  --help               Command help

auth:
  HA_URL / HASS_SERVER   default http://homeassistant.local:8123
  HA_TOKEN / HASS_TOKEN  Long-Lived Access Token (never echoed)
  or ~/.config/ha-axi/config.json  { "url", "token" } mode 0600

mutations:
  Every write requires a TTY y/N confirmation, or explicit --confirm.
  Non-interactive sessions without --confirm are refused.

examples:
  ha-axi
  ha-axi doctor
  ha-axi state list --domain light --limit 20
  ha-axi state get light.kitchen
  ha-axi entity search motion
  ha-axi service call switch turn_off --entity-id switch.desk --confirm
  ha-axi area list
`;

export const COMMAND_HELP: Record<string, string> = {
  doctor: `usage: ha-axi doctor [--format toon|json]

Check Home Assistant URL reachability and token auth.
Never prints token values.

examples:
  ha-axi doctor
  ha-axi doctor --format json
`,
  state: `usage: ha-axi state <list|get> ...

ha-axi state list [--domain <domain>] [--search <q>] [--limit <n>] [--fields full]
  List states (default 50). Filter by domain and/or search substring.

ha-axi state get <entity_id> [--full]
  Show one entity state. Attributes truncated unless --full.

examples:
  ha-axi state list --domain switch --limit 20
  ha-axi state get light.kitchen
`,
  entity: `usage: ha-axi entity search <query> [--limit <n>] [--domain <domain>]

Search entity_id, friendly_name, and common attributes.
Default limit 30.

examples:
  ha-axi entity search kitchen
  ha-axi entity search motion --domain binary_sensor
`,
  service: `usage: ha-axi service <list|call> ...

ha-axi service list [--domain <domain>] [--limit <n>]
  List service domains (and service names).

ha-axi service call <domain> <service> [--entity-id <id>] [--data <json>] [--confirm]
  Call a HA service. Requires TTY confirmation or --confirm.
  Dangerous services (shell_command, WoL, host power, irrigation-like entities)
  get stronger warnings but are not hard-denied.

examples:
  ha-axi service list --domain light
  ha-axi service call light turn_on --entity-id light.kitchen --confirm
  ha-axi service call light turn_on --entity-id light.kitchen --data '{"brightness": 120}' --confirm
`,
  automation: `usage: ha-axi automation <list|reload> ...

ha-axi automation list [--limit <n>] [--search <q>]
  List automation.* entities with state and friendly name.

ha-axi automation reload [--confirm]
  Call automation.reload (mutation — confirmation required).

examples:
  ha-axi automation list --search light
  ha-axi automation reload --confirm
`,
  config: `usage: ha-axi config <info|check> ...

ha-axi config info
  Show HA version, location name, timezone, state.

ha-axi config check [--confirm]
  Run check_config via REST (mutation-class — confirmation required).

examples:
  ha-axi config info
  ha-axi config check --confirm
`,
  area: `usage: ha-axi area list [--limit <n>] [--search <q>]

List areas from the area registry (WebSocket).

examples:
  ha-axi area list
  ha-axi area list --search kitchen
`,
  device: `usage: ha-axi device list [--limit <n>] [--area <area_id>] [--search <q>]

List devices from the device registry (WebSocket).

examples:
  ha-axi device list --limit 40
  ha-axi device list --area living_room
`,
  setup: `usage: ha-axi setup hooks

Install SessionStart hooks for supported agents (Claude Code, Codex, OpenCode).
Explicit opt-in only; idempotent.

examples:
  ha-axi setup hooks
`,
};
