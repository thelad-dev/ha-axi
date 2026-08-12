import { EventEmitter } from "node:events";
import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  HaConfigInfo,
  HaServiceDomain,
  HaState,
} from "../src/ha-client.js";
import { HaClient } from "../src/ha-client.js";
import type { ResolvedConfig } from "../src/config.js";
import { createContext, type HaAxiContext } from "../src/context.js";
import { main } from "../src/cli.js";

export const SAMPLE_STATES: HaState[] = [
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: { friendly_name: "Kitchen Light", brightness: 200 },
    last_changed: "2026-08-12T10:00:00+00:00",
    last_updated: "2026-08-12T10:00:00+00:00",
  },
  {
    entity_id: "switch.desk",
    state: "off",
    attributes: { friendly_name: "Desk" },
  },
  {
    entity_id: "switch.dc_impulse_zone_1",
    state: "off",
    attributes: { friendly_name: "Zone 1" },
  },
  {
    entity_id: "binary_sensor.motion_hall",
    state: "off",
    attributes: { friendly_name: "Hall Motion", device_class: "motion" },
  },
  {
    entity_id: "sensor.broken",
    state: "unavailable",
    attributes: { friendly_name: "Broken" },
  },
  {
    entity_id: "automation.morning",
    state: "on",
    attributes: { friendly_name: "Morning" },
  },
];

export const SAMPLE_SERVICES: HaServiceDomain[] = [
  {
    domain: "light",
    services: {
      turn_on: { name: "Turn on" },
      turn_off: { name: "Turn off" },
    },
  },
  {
    domain: "switch",
    services: {
      turn_on: { name: "Turn on" },
      turn_off: { name: "Turn off" },
    },
  },
  {
    domain: "shell_command",
    services: {
      backup: { name: "Backup" },
    },
  },
  {
    domain: "automation",
    services: {
      reload: { name: "Reload" },
    },
  },
];

export const SAMPLE_CONFIG: HaConfigInfo = {
  version: "2026.8.0",
  location_name: "Home",
  time_zone: "Europe/Berlin",
  state: "RUNNING",
  language: "de",
  currency: "EUR",
  unit_system: { length: "km", mass: "g", temperature: "°C", volume: "L" },
};

export const SAMPLE_AREAS: AreaRegistryEntry[] = [
  { area_id: "kitchen", name: "Kitchen" },
  { area_id: "living_room", name: "Living Room", floor_id: "ground" },
];

export const SAMPLE_DEVICES: DeviceRegistryEntry[] = [
  {
    id: "dev1",
    name: "Bulb",
    manufacturer: "Philips",
    model: "Hue",
    area_id: "kitchen",
  },
  {
    id: "dev2",
    name: "Plug",
    name_by_user: "Desk Plug",
    manufacturer: "Shelly",
    model: "1PM",
    area_id: "living_room",
  },
];

export interface MockHaOptions {
  token?: string | undefined;
  url?: string;
  states?: HaState[];
  services?: HaServiceDomain[];
  config?: HaConfigInfo;
  areas?: AreaRegistryEntry[];
  devices?: DeviceRegistryEntry[];
  failAuth?: boolean;
  unreachable?: boolean;
  serviceCalls?: Array<{ domain: string; service: string; data: unknown }>;
}

export function createMockClient(options: MockHaOptions = {}): {
  client: HaClient;
  serviceCalls: Array<{ domain: string; service: string; data: unknown }>;
  config: ResolvedConfig;
} {
  const url = options.url ?? "http://homeassistant.local:8123";
  const token = options.token === undefined ? "test-token-value" : options.token;
  const serviceCalls =
    options.serviceCalls ??
    ([] as Array<{ domain: string; service: string; data: unknown }>);
  const states = options.states ?? SAMPLE_STATES;
  const services = options.services ?? SAMPLE_SERVICES;
  const haConfig = options.config ?? SAMPLE_CONFIG;
  const areas = options.areas ?? SAMPLE_AREAS;
  const devices = options.devices ?? SAMPLE_DEVICES;

  const resolved: ResolvedConfig = {
    url,
    token: token || undefined,
    source: {
      url: "env",
      token: token ? "env" : "missing",
    },
    configPath: "/tmp/ha-axi-test/config.json",
    configDir: "/tmp/ha-axi-test",
  };

  const fetchImpl: typeof fetch = async (input, init) => {
    if (options.unreachable) {
      throw new TypeError("fetch failed");
    }
    const href = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const path = new URL(href).pathname;

    if (path === "/" || path === "") {
      return jsonResponse({ message: "API running." }, 200);
    }
    if (options.failAuth) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }
    if (!token) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    if (path === "/api/" && method === "GET") {
      return jsonResponse({ message: "API running." });
    }
    if (path === "/api/states" && method === "GET") {
      return jsonResponse(states);
    }
    if (path.startsWith("/api/states/") && method === "GET") {
      const id = decodeURIComponent(path.slice("/api/states/".length));
      const found = states.find((s) => s.entity_id === id);
      if (!found) return jsonResponse({ message: "not found" }, 404);
      return jsonResponse(found);
    }
    if (path === "/api/services" && method === "GET") {
      return jsonResponse(services);
    }
    if (path.startsWith("/api/services/") && method === "POST") {
      const parts = path.split("/").filter(Boolean); // api, services, domain, service
      const domain = parts[2]!;
      const service = parts[3]!;
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      serviceCalls.push({ domain, service, data: body });
      return jsonResponse([]);
    }
    if (path === "/api/config" && method === "GET") {
      return jsonResponse(haConfig);
    }
    if (path === "/api/config/core/check_config" && method === "POST") {
      return jsonResponse({ result: "valid", errors: null });
    }
    return jsonResponse({ message: `unmocked ${method} ${path}` }, 500);
  };

  const webSocketFactory = (wsUrl: string) => {
    void wsUrl;
    return createMockWebSocket({
      failAuth: options.failAuth,
      areas,
      devices,
      unreachable: options.unreachable,
    }) as unknown as WebSocket;
  };

  const client = new HaClient({
    config: resolved,
    fetchImpl,
    webSocketFactory,
  });

  return { client, serviceCalls, config: resolved };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createMockWebSocket(options: {
  failAuth?: boolean;
  areas: AreaRegistryEntry[];
  devices: DeviceRegistryEntry[];
  unreachable?: boolean;
}): EventEmitter & {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: string, fn: (ev: { data?: string }) => void) => void;
} {
  const ee = new EventEmitter() as EventEmitter & {
    send: (data: string) => void;
    close: () => void;
    addEventListener: (
      type: string,
      fn: (ev: { data?: string }) => void,
    ) => void;
  };

  ee.addEventListener = (type, fn) => {
    ee.on(type, fn);
  };

  ee.close = () => {
    ee.emit("close");
  };

  ee.send = (raw: string) => {
    const msg = JSON.parse(raw) as Record<string, unknown>;
    if (msg.type === "auth") {
      if (options.failAuth) {
        queueMessage(ee, { type: "auth_invalid", message: "Invalid" });
        return;
      }
      queueMessage(ee, { type: "auth_ok" });
      return;
    }
    if (msg.type === "config/area_registry/list") {
      queueMessage(ee, {
        id: msg.id,
        type: "result",
        success: true,
        result: options.areas,
      });
      return;
    }
    if (msg.type === "config/device_registry/list") {
      queueMessage(ee, {
        id: msg.id,
        type: "result",
        success: true,
        result: options.devices,
      });
      return;
    }
    queueMessage(ee, {
      id: msg.id,
      type: "result",
      success: false,
      error: { message: `unmocked ws ${String(msg.type)}` },
    });
  };

  queueMicrotask(() => {
    if (options.unreachable) {
      ee.emit("error", new Error("ws fail"));
      ee.emit("close");
      return;
    }
    queueMessage(ee, { type: "auth_required", ha_version: "2026.8.0" });
  });

  return ee;
}

function queueMessage(
  ee: EventEmitter,
  msg: Record<string, unknown>,
): void {
  queueMicrotask(() => {
    ee.emit("message", { data: JSON.stringify(msg) });
  });
}

export function createTestContext(
  options: MockHaOptions = {},
): {
  ctx: HaAxiContext;
  serviceCalls: Array<{ domain: string; service: string; data: unknown }>;
} {
  const { client, serviceCalls, config } = createMockClient(options);
  const ctx = createContext({
    client,
    config,
    binPath: "/tmp/ha-axi",
  });
  return { ctx, serviceCalls };
}

export async function runCli(
  argv: string[],
  ctx: HaAxiContext,
): Promise<{ stdout: string; exitCode: number | undefined }> {
  const chunks: string[] = [];
  const prev = process.exitCode;
  process.exitCode = undefined;
  await main({
    argv,
    context: ctx,
    binPath: "/tmp/ha-axi",
    stdout: {
      write: (c) => {
        chunks.push(c);
        return true;
      },
    },
  });
  const exitCode = process.exitCode;
  process.exitCode = prev;
  return { stdout: chunks.join(""), exitCode };
}
