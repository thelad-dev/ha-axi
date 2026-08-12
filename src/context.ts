import type { HaClient } from "./ha-client.js";
import { HaClient as HaClientImpl } from "./ha-client.js";
import type { ResolvedConfig } from "./config.js";
import { resolveConfig } from "./config.js";

export interface HaAxiContext {
  client: HaClient;
  config: ResolvedConfig;
  binPath: string;
}

export interface CreateContextOptions {
  binPath?: string;
  client?: HaClient;
  config?: ResolvedConfig;
  env?: NodeJS.ProcessEnv;
  home?: string;
}

export function createContext(
  options: CreateContextOptions = {},
): HaAxiContext {
  const config =
    options.config ??
    resolveConfig({
      env: options.env,
      home: options.home,
    });
  const client = options.client ?? new HaClientImpl({ config });
  return {
    client,
    config,
    binPath: options.binPath ?? process.argv[1] ?? "ha-axi",
  };
}
