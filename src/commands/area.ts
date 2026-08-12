import { expectPositionals, flagString, parseFlags, parseLimit } from "../args.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function areaCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (sub !== "list") {
    throw new AxiError("area requires subcommand list", "VALIDATION_ERROR", [
      "Run `ha-axi area list`",
    ]);
  }
  return areaList(args.slice(1), ctx);
}

async function areaList(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(
    flags,
    ["limit", "search", "format", "json"],
    "area list",
  );
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi area list [--search <q>]`",
  });
  const format = resolveFormat(flags);
  const limit = parseLimit(flags.limit, 100, 500);
  const search = (flagString(flags, "search") ?? "").toLowerCase();

  let areas = await ctx.client.listAreas();
  if (search) {
    areas = areas.filter((a) => {
      const name = String(a.name ?? "").toLowerCase();
      const id = String(a.area_id ?? "").toLowerCase();
      return name.includes(search) || id.includes(search);
    });
  }
  areas.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const total = areas.length;
  const page = areas.slice(0, limit).map((a) => ({
    area_id: a.area_id,
    name: a.name,
    floor_id: a.floor_id ?? null,
  }));

  const payload: Record<string, unknown> = {
    count: `${page.length} of ${total} total`,
    areas: page.length === 0 ? "0 areas found" : page,
    help: ["Run `ha-axi device list --area <area_id>` to list devices in an area"],
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}
