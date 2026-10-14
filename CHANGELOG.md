# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-11

Initial public release of `@dtrywets/ha-axi`.

### Added

- AXI CLI for Home Assistant with token-efficient TOON output (JSON via `--format json`)
- REST transport for states, services, and config; WebSocket for area and device registry
- Auth via `HA_URL` / `HA_TOKEN` (aliases `HASS_SERVER` / `HASS_URL` / `HASS_TOKEN`) or `~/.config/ha-axi/config.json`
- Commands: home view, `doctor`, `state list|get`, `entity search`, `service list|call`, `automation list|reload`, `config info|check`, `area list`, `device list`, `setup hooks`, `update`
- Confirmed-only mutations (TTY `y/N` or `--confirm`); stronger warnings for dangerous service classes
- Shipped agent skill at `skills/ha-axi`
- npm package published as `@dtrywets/ha-axi` (binary name `ha-axi`)

### Notes

- The unscoped npm name `ha-axi` belongs to a different project; use `@dtrywets/ha-axi`.

[0.1.0]: https://github.com/thelad-dev/ha-axi/releases/tag/v0.1.0
