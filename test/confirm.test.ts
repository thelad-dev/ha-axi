import { describe, expect, it } from "vitest";
import { requireMutationConfirm } from "../src/confirm.js";
import { AxiError } from "../src/format.js";

describe("requireMutationConfirm", () => {
  it("allows --confirm without TTY", async () => {
    await expect(
      requireMutationConfirm({
        summary: "test op",
        confirmFlag: true,
        isTty: false,
      }),
    ).resolves.toBeUndefined();
  });

  it("refuses non-interactive without flag", async () => {
    await expect(
      requireMutationConfirm({
        summary: "test op",
        confirmFlag: false,
        isTty: false,
      }),
    ).rejects.toMatchObject({ code: "CONFIRM_REQUIRED" } satisfies Partial<AxiError>);
  });

  it("honors interactive yes/no", async () => {
    await expect(
      requireMutationConfirm({
        summary: "test op",
        confirmFlag: false,
        isTty: true,
        promptFn: async () => true,
      }),
    ).resolves.toBeUndefined();

    await expect(
      requireMutationConfirm({
        summary: "test op",
        confirmFlag: false,
        isTty: true,
        promptFn: async () => false,
      }),
    ).rejects.toMatchObject({ code: "CONFIRM_CANCELLED" });
  });
});
