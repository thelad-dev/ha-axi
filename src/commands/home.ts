import { collapseHome } from "../config.js";
import type { HaAxiContext } from "../context.js";
import type { HaState } from "../ha-client.js";
import { parseFlags } from "../args.js";
import {
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";
import { DESCRIPTION } from "../help.js";

function homeHeader(binPath: string): Record<string, unknown> {
  return {
    bin: collapseHome(binPath),
    description: DESCRIPTION,
  };
}

const PROBLEM_STATES = new Set([
  "unavailable",
  "unknown",
  "none",
]);

export async function homeCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const { flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(flags, ["format", "json"], "home");
  const format = resolveFormat(flags);

  const header = homeHeader(ctx.binPath);

  if (!ctx.client.tokenPresent()) {
    const payload = {
      ...header,
      ha: {
        url: ctx.config.url,
        auth: "missing_token",
      },
      help: [
        "Set HA_TOKEN (Long-Lived Access Token) or write ~/.config/ha-axi/config.json",
        "Run `ha-axi doctor` to verify connectivity",
        `Config path: ${collapseHome(ctx.config.configPath)}`,
      ],
    };
    return format === "json" ? renderPayload(payload, "json") : payload;
  }

  try {
    const [cfg, states] = await Promise.all([
      ctx.client.getConfig(),
      ctx.client.listStates(),
    ]);

    const domainCounts = countByDomain(states);
    const problems = states
      .filter((s) => PROBLEM_STATES.has(String(s.state).toLowerCase()))
      .slice(0, 8)
      .map((s) => ({
        entity_id: s.entity_id,
        state: s.state,
        name: friendlyName(s),
      }));

    const automations = states.filter((s) =>
      s.entity_id.startsWith("automation."),
    );
    const automationsOn = automations.filter((s) => s.state === "on").length;

    const payload: Record<string, unknown> = {
      ...header,
      ha: {
        url: ctx.config.url,
        version: cfg.version ?? null,
        location: cfg.location_name ?? null,
        time_zone: cfg.time_zone ?? null,
        state: cfg.state ?? null,
        entities: states.length,
        automations: `${automationsOn}/${automations.length} on`,
      },
      domains: topDomains(domainCounts, 8),
      problems:
        problems.length === 0
          ? "no unavailable/unknown entities in sample"
          : problems,
      problem_count: states.filter((s) =>
        PROBLEM_STATES.has(String(s.state).toLowerCase()),
      ).length,
      help: [
        "Run `ha-axi state list --domain <domain>` to inspect states",
        "Run `ha-axi entity search <query>` to find entities",
        "Run `ha-axi service list` to see callable services",
        "Mutations require TTY confirm or --confirm",
      ],
    };
    return format === "json" ? renderPayload(payload, "json") : payload;
  } catch (err) {
    // Surface structured auth/network errors via throw; home wraps soft failure.
    throw err;
  }
}

function friendlyName(state: HaState): string {
  const n = state.attributes?.friendly_name;
  return typeof n === "string" ? n : state.entity_id;
}

function countByDomain(states: HaState[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of states) {
    const domain = s.entity_id.split(".", 1)[0] ?? "unknown";
    map.set(domain, (map.get(domain) ?? 0) + 1);
  }
  return map;
}

function topDomains(
  counts: Map<string, number>,
  n: number,
): Array<{ domain: string; count: number }> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([domain, count]) => ({ domain, count }));
}
