import {
  flagBool,
  flagString,
  parseFlags,
  parseLimit,
} from "../args.js";
import { requireMutationConfirm } from "../confirm.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function automationCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (!sub || sub.startsWith("--")) {
    throw new AxiError(
      "automation requires subcommand list or reload",
      "VALIDATION_ERROR",
      [
        "Run `ha-axi automation list`",
        "Run `ha-axi automation reload --confirm`",
      ],
    );
  }
  if (sub === "list") return automationList(args.slice(1), ctx);
  if (sub === "reload") return automationReload(args.slice(1), ctx);
  throw new AxiError(
    `unknown automation subcommand: ${sub}`,
    "VALIDATION_ERROR",
    ["valid subcommands: list, reload"],
  );
}

async function automationList(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(
    flags,
    ["limit", "search", "format", "json"],
    "automation list",
  );
  const format = resolveFormat(flags);
  const limit = parseLimit(flags.limit, 50, 500);
  const search = (flagString(flags, "search") ?? "").toLowerCase();

  const states = await ctx.client.listStates();
  let autos = states.filter((s) => s.entity_id.startsWith("automation."));
  if (search) {
    autos = autos.filter((s) => {
      const name = String(s.attributes?.friendly_name ?? "").toLowerCase();
      return s.entity_id.toLowerCase().includes(search) || name.includes(search);
    });
  }
  autos.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  const total = autos.length;
  const page = autos.slice(0, limit).map((s) => ({
    entity_id: s.entity_id,
    state: s.state,
    name: typeof s.attributes?.friendly_name === "string"
      ? s.attributes.friendly_name
      : "",
  }));

  const payload: Record<string, unknown> = {
    count: `${page.length} of ${total} total`,
    automations:
      page.length === 0 ? "0 automations found" : page,
    help: [
      "Run `ha-axi state get <entity_id>` for details",
      "Run `ha-axi automation reload --confirm` after YAML deploy",
    ],
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

async function automationReload(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { flags } = parseFlags(args, ["json", "confirm", "help"]);
  rejectUnknownFlags(flags, ["confirm", "format", "json"], "automation reload");
  const format = resolveFormat(flags);

  await requireMutationConfirm({
    summary: "Reload all Home Assistant automations (automation.reload)",
    confirmFlag: flagBool(flags, "confirm"),
  });

  await ctx.client.callService("automation", "reload", {});
  const payload: Record<string, unknown> = {
    ok: "automation.reload called",
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}
