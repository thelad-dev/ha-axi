import { installSessionStartHooks } from "axi-sdk-js";
import { parseFlags } from "../args.js";
import type { HaAxiContext } from "../context.js";
import {
  AxiError,
  rejectUnknownFlags,
  resolveFormat,
  renderPayload,
} from "../format.js";

export async function setupCommand(
  args: string[],
  _ctx: HaAxiContext | undefined,
): Promise<string | Record<string, unknown>> {
  const sub = args[0];
  if (sub !== "hooks") {
    throw new AxiError("setup requires subcommand hooks", "VALIDATION_ERROR", [
      "Run `ha-axi setup hooks`",
    ]);
  }
  const { flags } = parseFlags(args.slice(1), ["json", "help"]);
  rejectUnknownFlags(flags, ["format", "json"], "setup hooks");
  const format = resolveFormat(flags);

  installSessionStartHooks({
    marker: "ha-axi",
    binaryNames: ["ha-axi"],
    distEntrypoints: ["dist/bin/ha-axi.js"],
  });

  const payload: Record<string, unknown> = {
    setup: "hooks installed or already up to date",
    help: [
      "SessionStart hooks inject `ha-axi` home view for supported agents",
      "Skill alternative: npx skills add thelad-dev/ha-axi --skill ha-axi",
    ],
  };
  return format === "json" ? renderPayload(payload, "json") : payload;
}
