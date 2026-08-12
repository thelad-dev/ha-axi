import {
  expectPositionals,
  flagBool,
  flagString,
  looksLikeEntityId,
  parseFlags,
  parseLimit,
} from "../args.js";
import {
  dangerNotesForService,
  requireMutationConfirm,
} from "../confirm.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function serviceCommand(
  args: string[],
  ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  if (!ctx) throw new Error("missing context");
  const sub = args[0];
  if (!sub || sub.startsWith("--")) {
    throw new AxiError(
      "service requires subcommand list or call",
      "VALIDATION_ERROR",
      [
        "Run `ha-axi service list`",
        "Run `ha-axi service call <domain> <service> --entity-id <id> --confirm`",
      ],
    );
  }
  if (sub === "list") return serviceList(args.slice(1), ctx);
  if (sub === "call") return serviceCall(args.slice(1), ctx);
  throw new AxiError(`unknown service subcommand: ${sub}`, "VALIDATION_ERROR", [
    "valid subcommands: list, call",
  ]);
}

async function serviceList(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, ["json", "help"]);
  rejectUnknownFlags(flags, ["domain", "limit", "format", "json"], "service list");
  expectPositionals(positionals, 0, {
    usage: "Run `ha-axi service list [--domain <domain>]`",
  });
  const format = resolveFormat(flags);
  const domainFilter = flagString(flags, "domain");
  const limit = parseLimit(flags.limit, 40, 500);

  let services = await ctx.client.listServices();
  if (domainFilter) {
    services = services.filter((d) => d.domain === domainFilter);
  }

  const rows: Array<{ domain: string; service: string; name: string }> = [];
  for (const d of services) {
    for (const [svc, meta] of Object.entries(d.services ?? {})) {
      rows.push({
        domain: d.domain,
        service: svc,
        name: typeof meta?.name === "string" ? meta.name : "",
      });
    }
  }
  rows.sort((a, b) =>
    `${a.domain}.${a.service}`.localeCompare(`${b.domain}.${b.service}`),
  );

  const total = rows.length;
  const page = rows.slice(0, limit);
  const payload: Record<string, unknown> = {
    count: `${page.length} of ${total} total`,
    services:
      page.length === 0
        ? domainFilter
          ? `0 services in domain ${domainFilter}`
          : "0 services found"
        : page,
    help: [
      "Run `ha-axi service call <domain> <service> --entity-id <id> --confirm` to call",
      total > limit
        ? `Run \`ha-axi service list --limit ${Math.min(total, 500)}\` for more`
        : undefined,
    ].filter(Boolean),
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

async function serviceCall(
  args: string[],
  ctx: HaAxiContext,
): Promise<string | Record<string, unknown>> {
  const { positionals, flags } = parseFlags(args, [
    "json",
    "confirm",
    "help",
  ]);
  rejectUnknownFlags(
    flags,
    ["entity-id", "entity_id", "data", "confirm", "format", "json"],
    "service call",
  );
  const format = resolveFormat(flags);
  const [domain, service] = expectPositionals(positionals, 2, {
    usage:
      "Run `ha-axi service call light turn_on --entity-id light.kitchen --confirm`",
    missingMessage: "service call requires <domain> <service>",
    extraHelp: (extras) =>
      extras.some(looksLikeEntityId)
        ? [
            "Pass targets with --entity-id <id> (or --data), not as extra positionals",
          ]
        : [],
  });

  const flagEntityId =
    flagString(flags, "entity-id") ?? flagString(flags, "entity_id");
  let data: Record<string, unknown> = {};
  const dataRaw = flagString(flags, "data");
  if (dataRaw) {
    try {
      const parsed = JSON.parse(dataRaw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      data = parsed as Record<string, unknown>;
    } catch {
      throw new AxiError(
        "--data must be a JSON object",
        "VALIDATION_ERROR",
        [`Example: --data '{"brightness": 120}'`],
      );
    }
  }
  if (flagEntityId) {
    data = { ...data, entity_id: flagEntityId };
  }

  const entityIds = entityIdsFromServiceData(data);
  if (serviceDataDeclaresEntityId(data) && entityIds.length === 0) {
    throw new AxiError(
      "entity_id is present but empty",
      "VALIDATION_ERROR",
      [
        "Provide a non-empty --entity-id <id> or --data entity_id / target.entity_id",
      ],
    );
  }
  const danger = dangerNotesForService(domain, service, entityIds);
  const summaryParts = [
    `Call Home Assistant service ${domain}.${service}`,
    entityIds.length > 0 ? `entity_id=${entityIds.join(",")}` : undefined,
    dataRaw ? `data keys: ${Object.keys(data).join(",")}` : undefined,
  ].filter(Boolean);

  await requireMutationConfirm({
    summary: summaryParts.join(" | "),
    dangerNotes: danger,
    confirmFlag: flagBool(flags, "confirm"),
  });

  const result = await ctx.client.callService(domain, service, data);
  const changed = Array.isArray(result) ? result.length : undefined;

  const payload: Record<string, unknown> = {
    ok: `called ${domain}.${service}`,
    domain,
    service,
    entity_id:
      entityIds.length === 0
        ? null
        : entityIds.length === 1
          ? entityIds[0]
          : entityIds,
    result_states: changed,
    danger: danger.length > 0 ? danger : undefined,
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}

/** True when merged service data declares entity_id at top level or under target. */
function serviceDataDeclaresEntityId(data: Record<string, unknown>): boolean {
  if (Object.prototype.hasOwnProperty.call(data, "entity_id")) return true;
  const target = data.target;
  if (target && typeof target === "object" && !Array.isArray(target)) {
    return Object.prototype.hasOwnProperty.call(target, "entity_id");
  }
  return false;
}

/** Resolve entity ids from merged service data / target (string or list). */
function entityIdsFromServiceData(data: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const collect = (raw: unknown): void => {
    if (typeof raw === "string") {
      const id = raw.trim();
      if (id.length > 0 && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
      return;
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item !== "string") continue;
        const id = item.trim();
        if (id.length > 0 && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
  };

  collect(data.entity_id);
  const target = data.target;
  if (target && typeof target === "object" && !Array.isArray(target)) {
    collect((target as Record<string, unknown>).entity_id);
  }
  return ids;
}
