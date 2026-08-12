import { AxiError } from "axi-sdk-js";

/**
 * Minimal flag parser. Supports `--key value`, `--key=value`, boolean `--flag`.
 * Names in `booleans` are always boolean even when followed by a non-flag token.
 */
export function parseFlags(
  args: string[],
  booleans: string[] = [],
): { positionals: string[]; flags: Record<string, string | boolean> } {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const token = args[i]!;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = args[i + 1];
    if (
      next !== undefined &&
      !next.startsWith("--") &&
      !booleans.includes(body)
    ) {
      flags[body] = next;
      i++;
    } else {
      flags[body] = true;
    }
  }
  return { positionals, flags };
}

/** Parse a decimal `--limit` flag into a clamped positive integer. */
export function parseLimit(
  value: string | boolean | undefined,
  fallback: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AxiError(
      `invalid --limit ${String(value)} (expected integer 1..${max})`,
      "VALIDATION_ERROR",
      [`Run with --limit <n> where n is between 1 and ${max}`],
    );
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new AxiError(
      `invalid --limit ${value} (expected integer 1..${max})`,
      "VALIDATION_ERROR",
      [`Run with --limit <n> where n is between 1 and ${max}`],
    );
  }
  return Math.min(parsed, max);
}

export function flagString(
  flags: Record<string, string | boolean>,
  name: string,
): string | undefined {
  const v = flags[name];
  if (v === undefined) return undefined;
  if (typeof v !== "string") {
    throw new AxiError(
      `flag --${name} requires a value`,
      "VALIDATION_ERROR",
      [`Provide --${name} <value>`],
    );
  }
  return v;
}

export function flagBool(
  flags: Record<string, string | boolean>,
  name: string,
): boolean {
  return flags[name] === true || flags[name] === "true";
}
