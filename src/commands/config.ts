import { expectPositionals, flagBool, parseFlags } from "../args.js";
import { requireMutationConfirm } from "../confirm.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function configCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0] ?? "info";
  if (sub.startsWith("--")) {
    return configInfo(args, ctx);
  }
  if (sub === "info") return configInfo(args.slice(1), ctx);
  if (sub === "check") return configCheck(args.slice(1), ctx);
  throw new AxiError(`unknown config subcommand: ${sub}`, "VALIDATION_ERROR", [
    "valid subcommands: info, check",
  ]);
}

async function configInfo(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(flags, ["format", "json"], "config info");
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi config info`",
  });
  const format = resolveFormat(flags);
  const cfg = await ctx.client.getConfig();
  const payload: Record<string, unknown> = {
    config: {
      version: cfg.version ?? null,
      location_name: cfg.location_name ?? null,
      time_zone: cfg.time_zone ?? null,
      state: cfg.state ?? null,
      language: cfg.language ?? null,
      country: cfg.country ?? null,
      currency: cfg.currency ?? null,
      external_url: cfg.external_url ?? null,
      internal_url: cfg.internal_url ?? null,
      unit_system: cfg.unit_system ?? null,
    },
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

async function configCheck(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "confirm", "help"]);
  rejectUnknownFlags(flags, ["confirm", "format", "json"], "config check");
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi config check --confirm`",
  });
  const format = resolveFormat(flags);

  await requireMutationConfirm({
    summary: "Run Home Assistant check_config",
    confirmFlag: flagBool(flags, "confirm"),
  });

  const result = await ctx.client.checkConfig();
  const payload: Record<string, unknown> = {
    ok: "check_config completed",
    result,
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}
