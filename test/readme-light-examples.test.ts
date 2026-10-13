import { describe, expect, it } from "vitest";
import { createTestContext, runCli } from "./test/helpers.js";

/** Core HA light services as used in README sample (no invented set_brightness). */
const CORE_LIGHT_SERVICES = [
  {
    domain: "light",
    services: {
      toggle: { name: "Toggle" },
      turn_off: { name: "Turn off" },
      turn_on: { name: "Turn on" },
    },
  },
];

describe("README light service examples (public launch)", () => {
  it("service list --domain light shows core turn_on/turn_off/toggle with names", async () => {
    const { ctx } = createTestContext({ services: CORE_LIGHT_SERVICES });
    const { stdout, exitCode } = await runCli(
      ["service", "list", "--domain", "light"],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toMatch(/count:\s*3/);
    expect(stdout).toContain("turn_on");
    expect(stdout).toContain("turn_off");
    expect(stdout).toContain("toggle");
    expect(stdout).toContain("Turn on");
    expect(stdout).not.toContain("set_brightness");
  });

  it("refuses brightness mutation without confirm", async () => {
    const { ctx, serviceCalls } = createTestContext({
      services: CORE_LIGHT_SERVICES,
    });
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "light",
        "turn_on",
        "--entity-id",
        "light.office_desk",
        "--data",
        '{"brightness": 120}',
      ],
      ctx,
    );
    expect(exitCode).not.toBe(0);
    expect(stdout).toMatch(/CONFIRM_REQUIRED|confirm/i);
    expect(serviceCalls).toHaveLength(0);
  });

  it("calls light.turn_on with brightness data when --confirm is set", async () => {
    const { ctx, serviceCalls } = createTestContext({
      services: CORE_LIGHT_SERVICES,
    });
    const { stdout, exitCode } = await runCli(
      [
        "service",
        "call",
        "light",
        "turn_on",
        "--entity-id",
        "light.office_desk",
        "--data",
        '{"brightness": 120}',
        "--confirm",
      ],
      ctx,
    );
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toMatch(/ok|called|turn_on/i);
    expect(serviceCalls).toEqual([
      {
        domain: "light",
        service: "turn_on",
        data: { entity_id: "light.office_desk", brightness: 120 },
      },
    ]);
  });

  it("service --help documents brightness via turn_on --data, not set_brightness", async () => {
    const { ctx } = createTestContext();
    const { stdout, exitCode } = await runCli(["service", "--help"], ctx);
    expect(exitCode ?? 0).toBe(0);
    expect(stdout).toContain("light turn_on");
    expect(stdout).toContain('{"brightness": 120}');
    expect(stdout).not.toContain("set_brightness");
  });
});
