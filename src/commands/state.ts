import {
  expectPositionals,
  flagBool,
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
  truncate,
} from "../format.js";

export async function stateCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (!sub || sub.startsWith("--")) {
    throw new AxiError(
      "state requires subcommand list or get",
      "VALIDATION_ERROR",
      ["Run `ha-axi state list` or `ha-axi state get <entity_id>`"],
    );
  }
  if (sub === "list") return stateList(args.slice(1), ctx);
  if (sub === "get") return stateGet(args.slice(1), ctx);
  throw new AxiError(`unknown state subcommand: ${sub}`, "VALIDATION_ERROR", [
    "valid subcommands: list, get",
  ]);
}

async function stateList(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "full", "help"]);
  rejectUnknownFlags(
    flags,
    ["domain", "search", "limit", "fields", "format", "json", "full"],
    "state list",
  );
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi state list [--domain <domain>] [--search <q>]`",
  });
  const format = resolveFormat(flags);
  const domain = flagString(flags, "domain");
  const search = (flagString(flags, "search") ?? "").toLowerCase();
  const limit = parseLimit(flags.limit, 50, 500);
  const fullFields = flagString(flags, "fields") === "full" || flagBool(flags, "full");

  let states = await ctx.client.listStates();
  if (domain) {
    const prefix = `${domain}.`;
    states = states.filter((s) => s.entity_id.startsWith(prefix));
  }
  if (search) {
    states = states.filter((s) => matchesSearch(s, search));
  }

  const total = states.length;
  const page = states.slice(0, limit).map((s) => summarizeState(s, fullFields));

  const payload: Record<string, unknown> = {
    count: `${page.length} of ${total} total`,
    states: page.length === 0 ? `0 states found` : page,
    help:
      page.length === 0
        ? ["Try a broader --search or omit --domain"]
        : [
            "Run `ha-axi state get <entity_id>` for full attributes",
            total > limit
              ? `Run \`ha-axi state list --limit ${Math.min(total, 500)}\` to see more`
              : undefined,
          ].filter(Boolean),
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

async function stateGet(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "full", "help"]);
  rejectUnknownFlags(flags, ["format", "json", "full"], "state get");
  const format = resolveFormat(flags);
  const [entityId] = expectPositionals(positionals, 1, {
    usage: "Run `ha-axi state get light.kitchen`",
    missingMessage: "state get requires <entity_id>",
  });
  const full = flagBool(flags, "full");
  const state = await ctx.client.getState(entityId);
  const attrs = formatAttributes(state.attributes ?? {}, full);

  const payload: Record<string, unknown> = {
    state: {
      entity_id: state.entity_id,
      state: state.state,
      friendly_name: friendlyName(state),
      last_changed: state.last_changed,
      last_updated: state.last_updated,
      attributes: attrs.value,
      attributes_truncated: attrs.truncated || undefined,
      attributes_chars: attrs.truncated ? attrs.total : undefined,
    },
    help: attrs.truncated
      ? [`Run \`ha-axi state get ${entityId} --full\` for complete attributes`]
      : undefined,
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

function summarizeState(s: HaState, full: boolean): Record<string, unknown> {
  const row: Record<string, unknown> = {
    entity_id: s.entity_id,
    state: s.state,
    name: friendlyName(s),
  };
  if (full) {
    row.domain = s.entity_id.split(".", 1)[0];
    row.last_changed = s.last_changed;
  }
  return row;
}

function friendlyName(state: HaState): string {
  const n = state.attributes?.friendly_name;
  return typeof n === "string" ? n : "";
}

function matchesSearch(s: HaState, q: string): boolean {
  if (s.entity_id.toLowerCase().includes(q)) return true;
  if (friendlyName(s).toLowerCase().includes(q)) return true;
  const attrs = s.attributes ?? {};
  for (const key of ["device_class", "unit_of_measurement", "icon"]) {
    const v = attrs[key];
    if (typeof v === "string" && v.toLowerCase().includes(q)) return true;
  }
  return false;
}

function formatAttributes(
  attrs: Record<string, unknown>,
  full: boolean,
): { value: unknown; truncated: boolean; total: number } {
  const json = JSON.stringify(attrs);
  if (full || json.length <= 800) {
    return { value: attrs, truncated: false, total: json.length };
  }
  // Keep a small subset of common keys plus truncation notice.
  const prefer = [
    "friendly_name",
    "device_class",
    "unit_of_measurement",
    "icon",
    "supported_features",
    "brightness",
    "color_mode",
  ];
  const slim: Record<string, unknown> = {};
  for (const k of prefer) {
    if (k in attrs) slim[k] = attrs[k];
  }
  const restKeys = Object.keys(attrs).filter((k) => !(k in slim));
  if (restKeys.length > 0) {
    const t = truncate(`+${restKeys.length} more keys: ${restKeys.join(",")}`, 200);
    slim._more = t.text;
  }
  return { value: slim, truncated: true, total: json.length };
}
