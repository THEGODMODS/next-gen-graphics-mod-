import { describe, expect, it } from "vitest";
import { resolveDeploymentPlan } from "../../src/main/module-engine/deployment";
import type { ModuleManifest } from "../../src/shared/module-types";

const base: ModuleManifest = {
  schemaVersion: 1, id: "studio.pitch-pack", name: "Pitch Pack", version: "1.0.0",
  description: "Test", category: "graphics",
  game: { title: "PES 2017", executable: ["PES2017.exe"], sider: ">=3.5.0 <4.0.0" },
  dependencies: [], conflicts: [],
  files: [{ source: "payload/pitch.dds", target: "LiveCPK/common/pitch.dds", sha256: "a".repeat(64) }],
  luaModules: [], license: { id: "test", redistributionAllowed: false }
};

describe("deployment adapters", () => {
  it("routes legacy LiveCPK and direct files without changing their targets", () => {
    const plan = resolveDeploymentPlan({ ...base, files: [
      ...base.files, { source: "payload/menu.bin", target: "content/menu.bin", sha256: "b".repeat(64) }
    ] });
    expect(plan.automatedEntries.map(item => item.adapter)).toEqual(["livecpk", "direct"]);
  });

  it("enforces the LiveCPK target boundary", () => {
    expect(() => resolveDeploymentPlan({ ...base, deployment: { strategy: "livecpk" },
      files: [{ source: "payload/a", target: "content/a", sha256: "a".repeat(64) }] }))
      .toThrow("requires targets under LiveCPK/");
  });

  it("maps Lua-only packages to the Sider modules directory", () => {
    const plan = resolveDeploymentPlan({ ...base, files: [], luaModules: [
      { source: "payload/module.lua", moduleName: "weather.lua", sha256: "a".repeat(64) }
    ], deployment: { strategy: "lua" } });
    expect(plan.automatedEntries[0]).toMatchObject({ target: "modules/weather.lua", adapter: "lua" });
  });

  it("keeps configuration templates out of automatic game writes", () => {
    const plan = resolveDeploymentPlan({ ...base, deployment: {
      strategy: "configuration", configFormat: "sider-ini", manualSteps: ["Review the generated settings before applying them."]
    } });
    expect(plan.automatedEntries).toEqual([]);
    expect(plan.manualEntries).toHaveLength(1);
  });

  it("rejects manual-assisted packages without instructions", () => {
    expect(() => resolveDeploymentPlan({ ...base, deployment: { strategy: "manual-assisted" } }))
      .toThrow("at least one explicit manual step");
  });
});
