import {
  flagString,
  parseFlags,
  parseLimit,
} from "../args.js";
import type { HaAxiContext } from "../context.js";
import type { HaState } from "../ha-client.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function entityCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (sub !== "search") {
    throw new AxiError(
      "entity requires subcommand search",
      "VALIDATION_ERROR",
      ['Run `ha-axi entity search <query>`'],
    );
  }
  return entitySearch(args.slice(1), ctx);
}

async function entitySearch(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(
    flags,
    ["domain", "limit", "format", "json"],
    "entity search",
  );
  const format = resolveFormat(flags);
  const query = (positionals[0] ?? flagString(flags, "query") ?? "").trim();
  if (!query) {
    throw new AxiError("entity search requires <query>", "VALIDATION_ERROR", [
      'Run `ha-axi entity search kitchen`',
    ]);
  }
  const domain = flagString(flags, "domain");
  const limit = parseLimit(flags.limit, 30, 200);
  const q = query.toLowerCase();

  let states = await ctx.client.listStates();
  if (domain) {
    const prefix = `${domain}.`;
    states = states.filter((s) => s.entity_id.startsWith(prefix));
  }

  const scored = states
    .map((s) => ({ state: s, score: scoreMatch(s, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.state.entity_id.localeCompare(b.state.entity_id));

  const total = scored.length;
  const page = scored.slice(0, limit).map(({ state }) => ({
    entity_id: state.entity_id,
    state: state.state,
    name: friendlyName(state),
  }));

  const payload: Record<string, unknown> = {
    query,
    count: `${page.length} of ${total} total`,
    entities:
      page.length === 0 ? `0 entities matched ${JSON.stringify(query)}` : page,
    help:
      page.length === 0
        ? ["Try a shorter query or omit --domain"]
        : [
            "Run `ha-axi state get <entity_id>` for details",
            total > limit
              ? `Run \`ha-axi entity search ${query} --limit ${Math.min(total, 200)}\` for more`
              : undefined,
          ].filter(Boolean),
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

function friendlyName(state: HaState): string {
  const n = state.attributes?.friendly_name;
  return typeof n === "string" ? n : "";
}

function scoreMatch(s: HaState, q: string): number {
  const id = s.entity_id.toLowerCase();
  const name = friendlyName(s).toLowerCase();
  if (id === q || name === q) return 100;
  if (id.startsWith(q) || name.startsWith(q)) return 80;
  if (id.includes(q)) return 60;
  if (name.includes(q)) return 50;
  const attrs = s.attributes ?? {};
  for (const v of Object.values(attrs)) {
    if (typeof v === "string" && v.toLowerCase().includes(q)) return 20;
  }
  return 0;
}
