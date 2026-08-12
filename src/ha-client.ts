import {
  normalizeUrl,
  requireToken,
  resolveConfig,
  type ResolvedConfig,
  wsUrlFromHttp,
} from "./config.js";
import { AxiError, redactSecrets } from "./format.js";

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: { id?: string; parent_id?: string | null; user_id?: string | null };
}

export interface HaServiceDomain {
  domain: string;
  services: Record<
    string,
    {
      name?: string;
      description?: string;
      fields?: Record<string, unknown>;
      target?: unknown;
    }
  >;
}

export interface HaConfigInfo {
  location_name?: string;
  time_zone?: string;
  version?: string;
  state?: string;
  external_url?: string | null;
  internal_url?: string | null;
  unit_system?: Record<string, string>;
  currency?: string;
  country?: string | null;
  language?: string;
  [key: string]: unknown;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  aliases?: string[];
  icon?: string | null;
  floor_id?: string | null;
  [key: string]: unknown;
}

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  area_id?: string | null;
  disabled_by?: string | null;
  identifiers?: unknown[];
  [key: string]: unknown;
}

export interface EntityRegistryEntry {
  entity_id: string;
  name?: string | null;
  original_name?: string | null;
  platform?: string;
  device_id?: string | null;
  area_id?: string | null;
  disabled_by?: string | null;
  hidden_by?: string | null;
  [key: string]: unknown;
}

export type FetchLike = typeof fetch;
export type WebSocketFactory = (url: string) => WebSocket;

export interface HaClientOptions {
  config?: ResolvedConfig;
  fetchImpl?: FetchLike;
  webSocketFactory?: WebSocketFactory;
  /** Override request timeout ms */
  timeoutMs?: number;
}

export class HaClient {
  readonly config: ResolvedConfig;
  private readonly fetchImpl: FetchLike;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly timeoutMs: number;

  constructor(options: HaClientOptions = {}) {
    this.config = options.config ?? resolveConfig();
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.webSocketFactory =
      options.webSocketFactory ?? ((url) => new WebSocket(url));
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  get url(): string {
    return this.config.url;
  }

  tokenPresent(): boolean {
    return Boolean(this.config.token);
  }

  private authHeaders(): Record<string, string> {
    const token = requireToken(this.config);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getJson<T>(path: string): Promise<T> {
    const url = `${normalizeUrl(this.config.url)}${path.startsWith("/") ? path : `/${path}`}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw translateNetworkError(err, this.config.url);
    }
    return parseResponse<T>(res);
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const url = `${normalizeUrl(this.config.url)}${path.startsWith("/") ? path : `/${path}`}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw translateNetworkError(err, this.config.url);
    }
    return parseResponse<T>(res);
  }

  /** Unauthenticated reachability probe for doctor (never sends token). */
  async probeRoot(): Promise<{ ok: boolean; status: number }> {
    const url = `${normalizeUrl(this.config.url)}/`;
    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return { ok: res.status > 0 && res.status < 500, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  async apiRoot(): Promise<{ message?: string }> {
    return this.getJson<{ message?: string }>("/api/");
  }

  async listStates(): Promise<HaState[]> {
    return this.getJson<HaState[]>("/api/states");
  }

  async getState(entityId: string): Promise<HaState> {
    return this.getJson<HaState>(
      `/api/states/${encodeURIComponent(entityId)}`,
    );
  }

  async listServices(): Promise<HaServiceDomain[]> {
    return this.getJson<HaServiceDomain[]>("/api/services");
  }

  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this.postJson(
      `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      serviceData,
    );
  }

  async getConfig(): Promise<HaConfigInfo> {
    return this.getJson<HaConfigInfo>("/api/config");
  }

  async checkConfig(): Promise<unknown> {
    return this.postJson("/api/config/core/check_config", {});
  }

  async wsCall<T = unknown>(
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    requireToken(this.config);
    const wsUrl = wsUrlFromHttp(this.config.url);
    const factory = this.webSocketFactory;
    const token = this.config.token!;
    const timeoutMs = this.timeoutMs;

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      let msgId = 1;
      let ws: WebSocket;
      try {
        ws = factory(wsUrl);
      } catch (err) {
        reject(translateNetworkError(err, this.config.url));
        return;
      }

      const timer = setTimeout(() => {
        fail(
          new AxiError(
            `WebSocket timeout talking to ${this.config.url}`,
            "NETWORK_ERROR",
            ["Check HA_URL and that the HA WebSocket API is reachable"],
          ),
        );
      }, timeoutMs);

      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const ok = (value: T) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve(value);
      };

      ws.addEventListener("error", () => {
        fail(
          new AxiError(
            `WebSocket error talking to ${this.config.url}`,
            "NETWORK_ERROR",
            ["Check HA_URL and network reachability"],
          ),
        );
      });

      ws.addEventListener("message", (event) => {
        let msg: Record<string, unknown>;
        try {
          const data =
            typeof event.data === "string"
              ? event.data
              : Buffer.from(event.data as ArrayBuffer).toString("utf8");
          msg = JSON.parse(data) as Record<string, unknown>;
        } catch {
          fail(
            new AxiError("invalid WebSocket JSON from Home Assistant", "HA_ERROR"),
          );
          return;
        }

        if (msg.type === "auth_required") {
          ws.send(JSON.stringify({ type: "auth", access_token: token }));
          return;
        }
        if (msg.type === "auth_invalid") {
          fail(
            new AxiError(
              "Home Assistant rejected the access token",
              "AUTH_FAILED",
              [
                "Create a fresh Long-Lived Access Token in HA Profile → Security",
                "Update HA_TOKEN or ~/.config/ha-axi/config.json (never commit the token)",
              ],
            ),
          );
          return;
        }
        if (msg.type === "auth_ok") {
          const id = msgId++;
          ws.send(JSON.stringify({ id, type, ...payload }));
          return;
        }
        if (msg.type === "result") {
          if (msg.success === false) {
            const errObj = msg.error as
              | { message?: string; code?: string }
              | undefined;
            fail(
              new AxiError(
                redactSecrets(
                  errObj?.message ?? "Home Assistant WebSocket call failed",
                ),
                "HA_ERROR",
                ["Check the entity/service exists and the token has access"],
              ),
            );
            return;
          }
          ok(msg.result as T);
        }
      });

      ws.addEventListener("close", () => {
        if (!settled) {
          fail(
            new AxiError(
              "WebSocket closed before result",
              "NETWORK_ERROR",
              ["Retry; check HA is running and token is valid"],
            ),
          );
        }
      });
    });
  }

  listAreas(): Promise<AreaRegistryEntry[]> {
    return this.wsCall<AreaRegistryEntry[]>("config/area_registry/list");
  }

  listDevices(): Promise<DeviceRegistryEntry[]> {
    return this.wsCall<DeviceRegistryEntry[]>("config/device_registry/list");
  }

  listEntityRegistry(): Promise<EntityRegistryEntry[]> {
    return this.wsCall<EntityRegistryEntry[]>("config/entity_registry/list");
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new AxiError(
      "Home Assistant authentication failed",
      "AUTH_FAILED",
      [
        "Check HA_TOKEN / HASS_TOKEN or ~/.config/ha-axi/config.json",
        "Create a Long-Lived Access Token in HA Profile → Security",
      ],
    );
  }
  if (res.status === 404) {
    throw new AxiError(
      "Home Assistant resource not found",
      "NOT_FOUND",
      ["Verify the entity_id or path exists"],
    );
  }
  if (!res.ok) {
    throw new AxiError(
      redactSecrets(
        `Home Assistant HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      ),
      "HA_ERROR",
      ["Check HA_URL and server logs"],
    );
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AxiError(
      "Home Assistant returned non-JSON body",
      "HA_ERROR",
    );
  }
}

function translateNetworkError(err: unknown, url: string): AxiError {
  const message = err instanceof Error ? err.message : String(err);
  return new AxiError(
    redactSecrets(`cannot reach Home Assistant at ${url}: ${message}`),
    "NETWORK_ERROR",
    [
      "Set HA_URL if the default homeassistant.local is wrong",
      "Check that HA is running and reachable from this host",
    ],
  );
}
