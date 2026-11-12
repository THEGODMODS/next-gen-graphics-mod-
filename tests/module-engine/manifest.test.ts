import { describe, expect, it } from "vitest";
import { parseModuleManifest, validateModuleManifest } from "../../src/main/module-engine/manifest";

const validManifest = {
  schemaVersion: 1,
  id: "studio.pitch-pack",
  name: "Pitch Pack",
  version: "1.0.0",
  description: "Test package",
  category: "graphics",
  game: { title: "PES 2017", executable: ["PES2017.exe"], sider: ">=3.5.0 <4.0.0" },
  dependencies: [],
  conflicts: [],
  files: [{ source: "payload/grass.dds", target: "LiveCPK/common/grass.dds", sha256: "a".repeat(64) }],
  luaModules: [],
  license: { id: "test-license", redistributionAllowed: false },
};

describe("module manifest validation", () => {
  it("accepts a well-formed schema v1 manifest", () => {
    expect(validateModuleManifest(validManifest).valid).toBe(true);
  });

  it("rejects duplicate targets regardless of case", () => {
    const duplicate = { ...validManifest, files: [
      ...validManifest.files,
      { source: "payload/other.dds", target: "livecpk/common/GRASS.dds", sha256: "b".repeat(64) },
    ] };
    expect(validateModuleManifest(duplicate).errors.join(" ")).toContain("Duplicate target");
  });

  it("rejects malformed JSON", () => {
    expect(parseModuleManifest("{bad").valid).toBe(false);
  });

  it("rejects traversal in a payload source", () => {
    const unsafe = { ...validManifest, files: [
      { source: "../outside.dll", target: "LiveCPK/outside.dll", sha256: "c".repeat(64) },
    ] };
    expect(validateModuleManifest(unsafe).valid).toBe(false);
  });
});
