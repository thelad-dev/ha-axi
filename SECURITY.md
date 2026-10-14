# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Handling Home Assistant tokens

ha-axi authenticates with a Home Assistant **Long-Lived Access Token**.

- Prefer environment variables (`HA_TOKEN` / `HASS_TOKEN`) or `~/.config/ha-axi/config.json` with mode `0600`.
- Never commit tokens, paste them into issues/PRs, or echo them in logs. The CLI reports tokens only as present/missing (`ha-axi doctor`).
- Rotate the token in Home Assistant (Profile → Security) if it may have leaked.
- Grant the token only the access you need for the account that created it.

## Mutations

Write operations require an interactive `y/N` confirmation or an explicit `--confirm` flag. Non-interactive sessions without `--confirm` are refused. Review the target entity and service before confirming.

## Reporting a vulnerability

Please **do not** open a public issue for security-sensitive reports.

Email the maintainer via the contact listed on the [GitHub profile for thelad-dev](https://github.com/thelad-dev), or open a **private** security advisory on the repository if available:

https://github.com/thelad-dev/ha-axi/security/advisories/new

Include:

- Affected package version (`@dtrywets/ha-axi`)
- Description and impact
- Reproduction steps **without** real tokens or private home data
- Optional fix suggestion

We will acknowledge reports as soon as practical and coordinate a fix before any public disclosure.
