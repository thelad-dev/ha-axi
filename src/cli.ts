import { AxiError, runAxiCli } from "axi-sdk-js";
import { encode } from "@toon-format/toon";
import { createContext, type HaAxiContext } from "./context.js";
import { DESCRIPTION, COMMAND_HELP, TOP_LEVEL_HELP } from "./help.js";
import { VERSION } from "./version.js";
import { redactSecrets } from "./format.js";
import { homeCommand } from "./commands/home.js";
import { doctorCommand } from "./commands/doctor.js";
import { stateCommand } from "./commands/state.js";
import { entityCommand } from "./commands/entity.js";
import { serviceCommand } from "./commands/service.js";
import { automationCommand } from "./commands/automation.js";
import { configCommand } from "./commands/config.js";
import { areaCommand } from "./commands/area.js";
import { deviceCommand } from "./commands/device.js";
import { setupCommand } from "./commands/setup.js";

const USAGE_CODES = new Set([
  "VALIDATION_ERROR",
  "AUTH_REQUIRED",
  "CONFIRM_REQUIRED",
  "CONFIRM_CANCELLED",
]);

export interface MainOptions {
  argv?: string[];
  stdout?: { write: (chunk: string) => unknown };
  context?: HaAxiContext;
  binPath?: string;
}

export async function main(options: MainOptions = {}): Promise<void> {
  const binPath = options.binPath ?? process.argv[1] ?? "ha-axi";
  await runAxiCli<HaAxiContext>({
    description: DESCRIPTION,
    version: VERSION,
    argv: options.argv ?? process.argv.slice(2),
    topLevelHelp: TOP_LEVEL_HELP,
    getCommandHelp: (command) => COMMAND_HELP[command] ?? null,
    ...(options.stdout ? { stdout: options.stdout } : {}),
    resolveContext: () => options.context ?? createContext({ binPath }),
    formatError: (error) => {
      if (error instanceof AxiError) {
        const out: Record<string, unknown> = {
          error: redactSecrets(error.message),
          code: error.code,
        };
        if (error.suggestions.length > 0) out.help = error.suggestions;
        return {
          output: `${encode(out)}\n`,
          exitCode: USAGE_CODES.has(error.code) ? 2 : 1,
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        output: `${encode({ error: redactSecrets(message), code: "UNKNOWN" })}\n`,
        exitCode: 1,
      };
    },
    home: (args, ctx) => homeCommand(args, ctx),
    commands: {
      doctor: (args, ctx) => doctorCommand(args, ctx),
      state: (args, ctx) => stateCommand(args, ctx),
      entity: (args, ctx) => entityCommand(args, ctx),
      service: (args, ctx) => serviceCommand(args, ctx),
      automation: (args, ctx) => automationCommand(args, ctx),
      config: (args, ctx) => configCommand(args, ctx),
      area: (args, ctx) => areaCommand(args, ctx),
      device: (args, ctx) => deviceCommand(args, ctx),
      setup: (args, ctx) => setupCommand(args, ctx),
    },
  });
}
