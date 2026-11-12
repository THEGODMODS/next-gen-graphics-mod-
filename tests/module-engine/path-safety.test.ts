import { describe, expect, it } from "vitest";
import path from "node:path";
import { normalizeSafeRelativePath, resolveInsideRoot } from "../../src/main/module-engine/path-safety";

describe("module path safety", () => {
  it("accepts canonical relative paths", () => {
    expect(normalizeSafeRelativePath("LiveCPK/common/pitch/grass.dds")).toBe("LiveCPK/common/pitch/grass.dds");
  });

  it.each(["../outside.dll", "LiveCPK/../../outside.dll", "/root/file", "C:/Windows/file", "LiveCPK/file:stream", "LiveCPK//file", "LiveCPK/./file", "LiveCPK\\\\file"])(
    "rejects unsafe path %s", (value) => {
      expect(() => normalizeSafeRelativePath(value)).toThrow();
    },
  );

  it("resolves targets under the selected root", () => {
    expect(resolveInsideRoot("/game/LiveCPK", "common/grass.dds")).toBe(path.join("/game/LiveCPK", "common", "grass.dds"));
  });
});
