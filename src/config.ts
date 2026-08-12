import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AxiError } from "./format.js";

export const DEFAULT_HA_URL = "http://homeassistant.local:8123";
export const CONFIG_DIR_NAME = "ha-axi";
export const CONFIG_FILE_NAME = "config.json";

export interface HaConfigFile {
  url?: string;
  token?: string;
}

export interface ResolvedConfig {
  url: string;
  token: string | undefined;
  source: {
    url: "env" | "config" | "default";
    token: "env" | "config" | "missing";
  };
  configPath: string;
  configDir: string;
}

export function configDir(home = homedir()): string {
  return join(home, ".config", CONFIG_DIR_NAME);
}

export function configPath(home = homedir()): string {
  return join(configDir(home), CONFIG_FILE_NAME);
}

export function readConfigFile(path = configPath()): HaConfigFile {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const obj = parsed as Record<string, unknown>;
    return {
      url: typeof obj.url === "string" ? obj.url : undefined,
      token: typeof obj.token === "string" ? obj.token : undefined,
    };
  } catch {
    throw new AxiError(
      `failed to parse config at ${collapseHome(path)}`,
      "CONFIG_ERROR",
      [`Fix JSON in ${collapseHome(path)} or delete the file and re-run auth`],
    );
  }
}

export function writeConfigFile(
  data: HaConfigFile,
  path = configPath(),
  home = homedir(),
): void {
  const dir = configDir(home);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

/**
 * Resolve URL/token from env (preferred) then config file then defaults.
 * Never logs the token.
 */
export function resolveConfig(options: {
  env?: NodeJS.ProcessEnv;
  home?: string;
  file?: HaConfigFile;
} = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const home = options.home ?? homedir();
  const path = configPath(home);
  const file = options.file ?? readConfigFile(path);

  const envUrl = firstNonEmpty(env.HA_URL, env.HASS_SERVER, env.HASS_URL);
  const envToken = firstNonEmpty(env.HA_TOKEN, env.HASS_TOKEN);

  let url: string;
  let urlSource: ResolvedConfig["source"]["url"];
  if (envUrl) {
    url = envUrl;
    urlSource = "env";
  } else if (file.url) {
    url = file.url;
    urlSource = "config";
  } else {
    url = DEFAULT_HA_URL;
    urlSource = "default";
  }

  let token: string | undefined;
  let tokenSource: ResolvedConfig["source"]["token"];
  if (envToken) {
    token = envToken;
    tokenSource = "env";
  } else if (file.token) {
    token = file.token;
    tokenSource = "config";
  } else {
    token = undefined;
    tokenSource = "missing";
  }

  return {
    url: normalizeUrl(url),
    token,
    source: { url: urlSource, token: tokenSource },
    configPath: path,
    configDir: configDir(home),
  };
}

export function requireToken(config: ResolvedConfig): string {
  if (config.token) return config.token;
  throw new AxiError(
    "HA token missing",
    "AUTH_REQUIRED",
    [
      "Set HA_TOKEN (or HASS_TOKEN) in the environment",
      `Or write token to ${collapseHome(config.configPath)} (mode 0600)`,
      "Create a Long-Lived Access Token in HA: Profile → Security",
    ],
  );
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function wsUrlFromHttp(url: string): string {
  const u = new URL(normalizeUrl(url));
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = `${u.pathname.replace(/\/$/, "")}/api/websocket`;
  u.search = "";
  u.hash = "";
  return u.toString();
}

function firstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export function collapseHome(path: string, home = homedir()): string {
  if (path === home) return "~";
  if (path.startsWith(`${home}/`) || path.startsWith(`${home}\\`)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
}
