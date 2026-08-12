import {
  flagBool,
  flagString,
  parseFlags,
} from "../args.js";
import { collapseHome } from "../config.js";
import type { HaAxiContext } from "../context.js";
import {
  rejectUnknownFlags,
  resolveFormat,
  type OutputFormat,
  renderPayload,
} from "../format.js";

export async function doctorCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const { flags } = parseFlags(args, ["json", "confirm", "full", "help"]);
  rejectUnknownFlags(flags, ["format", "json"], "doctor");
  const format = resolveFormat(flags);

  const { client, config } = ctx;
  const probe = await client.probeRoot();

  let auth: "ok" | "failed" | "skipped" | "unreachable" = "skipped";
  let haMessage: string | undefined;
  let version: string | undefined;
  let location: string | undefined;

  if (!probe.ok) {
    auth = "unreachable";
  } else if (!client.tokenPresent()) {
    auth = "skipped";
  } else {
    try {
      const root = await client.apiRoot();
      haMessage = root.message;
      auth = "ok";
      try {
        const cfg = await client.getConfig();
        version = typeof cfg.version === "string" ? cfg.version : undefined;
        location =
          typeof cfg.location_name === "string" ? cfg.location_name : undefined;
      } catch {
        /* config optional for doctor */
      }
    } catch {
      auth = "failed";
    }
  }

  const payload: Record<string, unknown> = {
    doctor: {
      url: config.url,
      url_source: config.source.url,
      token: config.source.token === "missing" ? "missing" : "present",
      token_source:
        config.source.token === "missing" ? "missing" : config.source.token,
      http_reachable: probe.ok,
      http_status: probe.status || undefined,
      auth,
      ha_message: haMessage,
      version,
      location,
      config_path: collapseHome(config.configPath),
    },
    help: doctorHelp(auth, config.source.token === "missing"),
  };

  return maybeRender(payload, format, flagBool(flags, "json"), flagString(flags, "format"));
}

function doctorHelp(auth: string, tokenMissing: boolean): string[] {
  const help: string[] = [];
  if (tokenMissing) {
    help.push("Set HA_TOKEN or write token to ~/.config/ha-axi/config.json");
  }
  if (auth === "failed") {
    help.push("Token rejected — create a new Long-Lived Access Token in HA");
  }
  if (auth === "unreachable") {
    help.push("Set HA_URL to your Home Assistant base URL");
  }
  if (auth === "ok") {
    help.push("Run `ha-axi` for the home view");
    help.push("Run `ha-axi state list --domain light` to inspect states");
  }
  return help;
}

function maybeRender(
  payload: Record<string, unknown>,
  format: OutputFormat,
  _jsonFlag: boolean,
  _formatFlag: string | undefined,
): string | Record<string, unknown> {
  // runAxiCli auto-encodes objects as TOON; for json we must pre-render string.
  if (format === "json") return renderPayload(payload, "json");
  return payload;
}
