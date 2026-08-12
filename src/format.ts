import { AxiError } from "axi-sdk-js";
import { encode } from "@toon-format/toon";

export { AxiError };

export type OutputFormat = "toon" | "json";

export function resolveFormat(
  flags: Record<string, string | boolean>,
): OutputFormat {
  if (flags.json === true || flags.json === "true") return "json";
  const fmt = flags.format;
  if (typeof fmt === "string") {
    const lower = fmt.toLowerCase();
    if (lower === "json") return "json";
    if (lower === "toon") return "toon";
    throw new AxiError(
      `unknown --format ${fmt} (use toon or json)`,
      "VALIDATION_ERROR",
      ["Run with --format toon or --format json"],
    );
  }
  return "toon";
}

/** Render structured output; used when a command returns a pre-rendered string. */
export function renderPayload(
  data: Record<string, unknown>,
  format: OutputFormat,
): string {
  if (format === "json") return JSON.stringify(data, null, 2);
  return encode(data);
}

export function rejectUnknownFlags(
  flags: Record<string, string | boolean>,
  known: string[],
  command: string,
): void {
  const allowed = new Set([...known, "help", "format", "json"]);
  const unknown = Object.keys(flags).filter((k) => !allowed.has(k));
  if (unknown.length === 0) return;
  throw new AxiError(
    `unknown flag --${unknown[0]} for \`${command}\``,
    "VALIDATION_ERROR",
    [
      `valid flags for \`${command}\`: ${[...new Set(known)].sort().map((k) => `--${k}`).join(", ")} (--help always allowed)`,
    ],
  );
}

export function truncate(
  value: string,
  max = 500,
): { text: string; truncated: boolean; total: number } {
  if (value.length <= max) {
    return { text: value, truncated: false, total: value.length };
  }
  return {
    text: `${value.slice(0, max).trimEnd()}…`,
    truncated: true,
    total: value.length,
  };
}

/** Redact anything that looks like a bearer token or long secret from messages. */
export function redactSecrets(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(
      /(access_token|refresh_token|token|password|secret|api_key)(["']?\s*[:=]\s*["']?)[^,\s"'}]+/gi,
      "$1[REDACTED]",
    );
}
