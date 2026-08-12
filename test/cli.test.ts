import { describe, expect, it } from "vitest";
import { VERSION } from "../src/version.js";
import { createTestContext, runCli } from "./helpers.js";
import { resolveConfig, DEFAULT_HA_URL } from "../src/config.js";
import { dangerNotesForService } from "../src/confirm.js";
import { redactSecrets } from "../src/format.js";
import { tryFastPath } from "axi-sdk-js/fast-path";

describe("version fast path", () => {
  it("prints bare version for -v/--version/-V", () => {
    for (const flag of ["-v", "-V", "--version"]) {
      const chunks: string[] = [];
      const handled = tryFastPath([flag], {
        version: VERSION,
        stdout: { write: (c) => chunks.push(c) },
      });
      expect(handled).toBe(true);
      expect(chunks.join("")).toBe(`${VERSION}\n`);
    }
  });
});

describe("config resolution", () => {
  it("defaults URL and prefers env token without echoing it", () => {
    const cfg = resolveConfig({
      env: { HA_TOKEN: "secret-token-xyz" },
      home: "/tmp/ha-axi-home-empty",
      file: {},
    });
    expect(cfg.url).toBe(DEFAULT_HA_URL);
    expect(cfg.token).toBe("secret-token-xyz");
    expect(cfg.source.token).toBe("env");
  });

  it("accepts HASS_* aliases", () => {
    const cfg = resolveConfig({
      env: {
        HASS_SERVER: "http://192.168.1.10:8123/",
        HASS_TOKEN: "alias-token",
      },
      home: "/tmp/ha-axi-home-empty",
      file: {},
    });
    expect(cfg.url).toBe("http://192.168.1.10:8123");
    expect(cfg.token).toBe("alias-token");
  });
});

describe("redaction", () => {
  it("strips bearer tokens from messages", () => {
    const msg = redactSecrets("Authorization Bearer abc.def.ghi failed");
    expect(msg).not.toContain("abc.def.ghi");
    expect(msg).toContain("[REDACTED]");
  });
});

describe("danger notes", () => {
  it("flags shell_command and irrigation-like entities", () => {
    expect(
      dangerNotesForService("shell_command", "backup").length,
    ).toBeGreaterThan(0);
    expect(
      dangerNotesForService("switch", "turn_on", "switch.dc_impulse_zone_1")
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("ha-axi doctor", () => {
  it("reports auth ok without leaking token", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["doctor"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toMatch(/auth:\s*ok|auth: ok/);
    expect(stdout).toMatch(/token:\s*present|token: present/);
    expect(stdout).not.toContain("test-token-value");
    expect(stdout).toContain("2026.8.0");
  });

  it("reports missing token", async () => {
    const { ctx } = createTestContext({ token: "" });
    const { stdout, exitCode } = await runCli(["doctor"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toMatch(/missing/);
    expect(stdout).not.toMatch(/Bearer /);
  });

  it("supports --format json", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["doctor", "--format", "json"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    const parsed = JSON.parse(stdout) as { doctor: { auth: string } };
    expect(parsed.doctor.auth).toBe("ok");
  });
});

describe("ha-axi home", () => {
  it("shows aggregates and problems", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli([], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("2026.8.0");
    expect(stdout).toContain("sensor.broken");
    expect(stdout).not.toContain("test-token-value");
  });
});

describe("state / entity", () => {
  it("lists states filtered by domain", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "list", "--domain", "light"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("light.kitchen");
    expect(stdout).not.toContain("switch.desk");
  });

  it("gets one state", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "get", "light.kitchen"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("light.kitchen");
    expect(stdout).toContain("Kitchen Light");
  });

  it("searches entities", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["entity", "search", "motion"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("binary_sensor.motion_hall");
  });
});

describe("service call confirmation", () => {
  it("refuses mutation without TTY or --confirm", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_off",
        "--entity-id",
        "switch.desk",
      ],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/CONFIRM_REQUIRED|confirm/i);
    expect(stdout).toContain("switch.turn_off");
    expect(stdout).toContain("switch.desk");
    expect(serviceCalls).toHaveLength(0);
  });

  it("surfaces danger notes on CONFIRM_REQUIRED before --confirm", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "shell_command",
        "backup",
        "--data",
        JSON.stringify({
          target: { entity_id: "switch.dc_impulse_zone_1" },
        }),
      ],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/CONFIRM_REQUIRED/);
    expect(stdout).toMatch(/dangerous service shell_command\.backup/i);
    expect(stdout).toMatch(/irrigation|valve|zone/i);
    expect(stdout).toContain("switch.dc_impulse_zone_1");
    expect(serviceCalls).toHaveLength(0);
  });

  it("calls service with --confirm", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_off",
        "--entity-id",
        "switch.desk",
        "--confirm",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("switch.turn_off");
    expect(serviceCalls).toEqual([
      {
        domain: "switch",
        service: "turn_off",
        data: { entity_id: "switch.desk" },
      },
    ]);
  });

  it("resolves entity_id from --data for danger notes", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_on",
        "--data",
        JSON.stringify({ entity_id: "switch.dc_impulse_zone_1" }),
        "--confirm",
        "--format",
        "json",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    const parsed = JSON.parse(stdout) as {
      entity_id: string;
      danger?: string[];
    };
    expect(parsed.entity_id).toBe("switch.dc_impulse_zone_1");
    expect(parsed.danger?.some((n) => /irrigation|valve|zone/i.test(n))).toBe(
      true,
    );
    expect(serviceCalls).toEqual([
      {
        domain: "switch",
        service: "turn_on",
        data: { entity_id: "switch.dc_impulse_zone_1" },
      },
    ]);
  });

  it("resolves entity_id arrays from --data for danger notes", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_on",
        "--data",
        JSON.stringify({
          entity_id: ["switch.desk", "switch.dc_impulse_zone_1"],
        }),
        "--confirm",
        "--format",
        "json",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    const parsed = JSON.parse(stdout) as {
      entity_id: string[];
      danger?: string[];
    };
    expect(parsed.entity_id).toEqual([
      "switch.desk",
      "switch.dc_impulse_zone_1",
    ]);
    expect(parsed.danger?.some((n) => /irrigation|valve|zone/i.test(n))).toBe(
      true,
    );
    expect(serviceCalls).toEqual([
      {
        domain: "switch",
        service: "turn_on",
        data: {
          entity_id: ["switch.desk", "switch.dc_impulse_zone_1"],
        },
      },
    ]);
  });

  it("resolves target.entity_id from --data for danger notes", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_on",
        "--data",
        JSON.stringify({
          target: { entity_id: "switch.dc_impulse_zone_1" },
        }),
        "--confirm",
        "--format",
        "json",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    const parsed = JSON.parse(stdout) as {
      entity_id: string;
      danger?: string[];
    };
    expect(parsed.entity_id).toBe("switch.dc_impulse_zone_1");
    expect(parsed.danger?.some((n) => /irrigation|valve|zone/i.test(n))).toBe(
      true,
    );
    expect(serviceCalls).toEqual([
      {
        domain: "switch",
        service: "turn_on",
        data: { target: { entity_id: "switch.dc_impulse_zone_1" } },
      },
    ]);
  });

  it("resolves target.entity_id arrays from --data for danger notes", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_on",
        "--data",
        JSON.stringify({
          target: {
            entity_id: ["switch.desk", "switch.dc_impulse_zone_1"],
          },
        }),
        "--confirm",
        "--format",
        "json",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    const parsed = JSON.parse(stdout) as {
      entity_id: string[];
      danger?: string[];
    };
    expect(parsed.entity_id).toEqual([
      "switch.desk",
      "switch.dc_impulse_zone_1",
    ]);
    expect(parsed.danger?.some((n) => /irrigation|valve|zone/i.test(n))).toBe(
      true,
    );
    expect(serviceCalls).toEqual([
      {
        domain: "switch",
        service: "turn_on",
        data: {
          target: {
            entity_id: ["switch.desk", "switch.dc_impulse_zone_1"],
          },
        },
      },
    ]);
  });
});

describe("parseLimit validation", () => {
  it("rejects non-numeric --limit", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "list", "--limit", "abc"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|invalid --limit/i);
  });

  it("rejects out-of-range --limit 0", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "list", "--limit", "0"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|invalid --limit/i);
  });
});

describe("value flag validation", () => {
  it("rejects bare --domain without a value", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["state", "list", "--domain"], ctx);
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value/i);
  });

  it("rejects bare --data without a value", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["service", "call", "light", "turn_on", "--data", "--confirm"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value/i);
  });

  it("rejects bare --limit without a value", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["state", "list", "--limit"], ctx);
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|invalid --limit/i);
  });

  it("rejects bare --format without a value", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["doctor", "--format"], ctx);
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value|--format toon\|json/i);
  });

  it("rejects bare --format even when --json is also set", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["doctor", "--json", "--format"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value|--format toon\|json/i);
  });

  it("rejects unknown --fields values on state list", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "list", "--fields", "all"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|invalid --fields|--fields full/i);
  });

  it("rejects unknown --query on entity search", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["entity", "search", "--query", "kitchen"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|unknown flag --query/i);
  });
});

describe("positional arity validation", () => {
  it("rejects entity target as third service call positional", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["service", "call", "switch", "turn_off", "switch.desk", "--confirm"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|unexpected positional/i);
    expect(stdout).toMatch(/--entity-id/i);
    expect(serviceCalls).toEqual([]);
  });

  it("rejects empty --entity-id before confirm/network", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_off",
        "--entity-id",
        "",
        "--confirm",
      ],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value/i);
    expect(serviceCalls).toEqual([]);
  });

  it("rejects whitespace-only --entity-id before confirm/network", async () => {
    const { ctx, serviceCalls } = createTestContext();
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "switch",
        "turn_off",
        "--entity-id",
        "   ",
        "--confirm",
      ],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|requires a value/i);
    expect(serviceCalls).toEqual([]);
  });

  it("rejects extra positionals on state list", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["state", "list", "light"], ctx);
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|unexpected positional/i);
  });

  it("rejects extra positionals on state get", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "get", "light.kitchen", "light.other"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/VALIDATION_ERROR|unexpected positional/i);
  });
});

describe("automation / config / registry", () => {
  it("lists automations", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["automation", "list"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("automation.morning");
  });

  it("shows config info", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["config", "info"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("Europe/Berlin");
    expect(stdout).toContain("Home");
  });

  it("lists areas via websocket", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["area", "list"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("kitchen");
    expect(stdout).toContain("Living Room");
  });

  it("lists devices via websocket", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["device", "list", "--area", "kitchen"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("dev1");
    expect(stdout).not.toContain("dev2");
  });
});

describe("unknown flags", () => {
  it("fails loud on unknown flag", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(
      ["state", "list", "--stat", "x"],
      ctx,
    );
    expect(exitCode).toBe(2);
    expect(stdout).toMatch(/unknown flag/);
  });
});
