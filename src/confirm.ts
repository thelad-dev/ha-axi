import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { AxiError } from "./format.js";

export interface ConfirmOptions {
  /** Human-readable summary of the mutation. */
  summary: string;
  /** Extra danger notes (e.g. shell_command, WoL). */
  dangerNotes?: string[];
  /** True when --confirm was passed. */
  confirmFlag: boolean;
  /** Injected for tests. */
  isTty?: boolean;
  /** Injected prompt for tests; return true to proceed. */
  promptFn?: (question: string) => Promise<boolean>;
}

/**
 * Gate every mutation. Default-safe:
 * - With TTY: interactive y/N prompt (summary never includes secrets).
 * - Without TTY: refuse unless --confirm is set.
 */
export async function requireMutationConfirm(
  options: ConfirmOptions,
): Promise<void> {
  const isTty = options.isTty ?? Boolean(input.isTTY && output.isTTY);
  const notes =
    options.dangerNotes && options.dangerNotes.length > 0
      ? `\nwarning: ${options.dangerNotes.join("; ")}`
      : "";
  const summary = `${options.summary}${notes}`;

  if (options.confirmFlag) {
    return;
  }

  if (!isTty) {
    throw new AxiError(
      `mutation refused: non-interactive session without --confirm\n${summary}`,
      "CONFIRM_REQUIRED",
      [
        "Re-run with --confirm after reviewing the intended mutation",
        "Or run in a TTY to answer the interactive confirmation prompt",
      ],
    );
  }

  const question = `${summary}\nProceed? [y/N] `;
  const prompt =
    options.promptFn ??
    (async (q: string) => {
      const rl = createInterface({ input, output });
      try {
        const answer = (await rl.question(q)).trim().toLowerCase();
        return answer === "y" || answer === "yes";
      } finally {
        rl.close();
      }
    });

  const ok = await prompt(question);
  if (!ok) {
    throw new AxiError("mutation cancelled by user", "CONFIRM_CANCELLED", [
      "Re-run the command if you still want to apply the change",
    ]);
  }
}

/** Domains/services that warrant stronger danger notes (not a hard deny). */
export function dangerNotesForService(
  domain: string,
  service: string,
  entityId?: string | readonly string[],
): string[] {
  const notes: string[] = [];
  const d = domain.toLowerCase();
  const s = service.toLowerCase();
  const entities = (
    Array.isArray(entityId) ? entityId : entityId ? [entityId] : []
  ).filter((id): id is string => typeof id === "string" && id.length > 0);
  const key = `${d}.${s}`;

  if (
    d === "shell_command" ||
    d === "command_line" ||
    d === "python_script" ||
    key === "hassio.host_reboot" ||
    key === "hassio.host_shutdown" ||
    key === "homeassistant.restart" ||
    key === "homeassistant.stop" ||
    d === "wake_on_lan" ||
    s.includes("reboot") ||
    s.includes("shutdown")
  ) {
    notes.push(`dangerous service ${domain}.${service}`);
  }

  let zoneSwitchNote = false;
  for (const id of entities) {
    const e = id.toLowerCase();
    if (
      e.includes("dc_impulse") ||
      e.includes("ventil") ||
      e.includes("valve") ||
      e.includes("irrigation") ||
      e.includes("bewaesser") ||
      e.includes("bewasser")
    ) {
      notes.push(`entity looks like irrigation/valve (${id})`);
    }
    if (
      d === "switch" &&
      (s === "turn_on" || s === "toggle") &&
      e.includes("zone")
    ) {
      zoneSwitchNote = true;
    }
  }
  if (zoneSwitchNote) {
    notes.push("zone switch turn_on/toggle may open valves");
  }

  return notes;
}
