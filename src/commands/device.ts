import { expectPositionals, flagString, parseFlags, parseLimit } from "../args.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function deviceCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (sub !== "list") {
    throw new AxiError("device requires subcommand list", "VALIDATION_ERROR", [
      "Run `ha-axi device list`",
    ]);
  }
  return deviceList(args.slice(1), ctx);
}

async function deviceList(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(
    flags,
    ["limit", "area", "search", "format", "json"],
    "device list",
  );
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi device list [--area <id>] [--search <q>]`",
  });
  const format = resolveFormat(flags);
  const limit = parseLimit(flags.limit, 50, 500);
  const area = flagString(flags, "area");
  const search = (flagString(flags, "search") ?? "").toLowerCase();

  let devices = await ctx.client.listDevices();
  if (area) {
    devices = devices.filter((d) => d.area_id === area);
  }
  if (search) {
    devices = devices.filter((d) => {
      const name = String(d.name_by_user ?? d.name ?? "").toLowerCase();
      const manufacturer = String(d.manufacturer ?? "").toLowerCase();
      const model = String(d.model ?? "").toLowerCase();
      const id = String(d.id ?? "").toLowerCase();
      return (
        name.includes(search) ||
        manufacturer.includes(search) ||
        model.includes(search) ||
        id.includes(search)
      );
    });
  }
  devices.sort((a, b) =>
    String(a.name_by_user ?? a.name ?? a.id).localeCompare(
      String(b.name_by_user ?? b.name ?? b.id),
    ),
  );
  const total = devices.length;
  const page = devices.slice(0, limit).map((d) => ({
    id: d.id,
    name: d.name_by_user || d.name || "",
    manufacturer: d.manufacturer ?? "",
    model: d.model ?? "",
    area_id: d.area_id ?? null,
    disabled: Boolean(d.disabled_by),
  }));

  const payload: Record<string, unknown> = {
    count: `${page.length} of ${total} total`,
    devices: page.length === 0 ? "0 devices found" : page,
    help: [
      "Run `ha-axi area list` for area ids",
      total > limit
        ? `Run \`ha-axi device list --limit ${Math.min(total, 500)}\` for more`
        : undefined,
    ].filter(Boolean),
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}
