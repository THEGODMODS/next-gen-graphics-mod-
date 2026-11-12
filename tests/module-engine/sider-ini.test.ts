import { describe, expect, it } from "vitest";
import { buildManagedSiderBlock, removeManagedSiderBlock, upsertManagedSiderBlock } from "../../src/main/module-engine/sider-ini";

describe("manager-owned Sider INI block", () => {
  it("adds Lua and LiveCPK registrations without changing user lines", () => {
    const original = "; my Sider setup\nlua.module = \"my-custom.lua\"\n";
    const result = upsertManagedSiderBlock(original, {
      luaModules: ["nextgen-weather.lua"],
      liveCpkRoots: [".\\LiveCPK\\nextgen-base"],
    });
    expect(result).toContain('lua.module = "my-custom.lua"');
    expect(result).toContain('lua.module = "nextgen-weather.lua"');
    expect(result).toContain('cpk.root = ".\\LiveCPK\\nextgen-base"');
    expect(result.startsWith(original)).toBe(true);
  });

  it("is idempotent and replaces only its own block", () => {
    const first = upsertManagedSiderBlock("lua.enabled = 1\n", { luaModules: ["one.lua"], liveCpkRoots: [] });
    const second = upsertManagedSiderBlock(first, { luaModules: ["two.lua"], liveCpkRoots: [] });
    expect(second).not.toContain('lua.module = "one.lua"');
    expect(second.match(/NEXTGEN MANAGED CONFIG/g)).toHaveLength(2);
    expect(second).toContain('lua.module = "two.lua"');
    expect(second.startsWith("lua.enabled = 1\n")).toBe(true);
  });

  it("removes only the manager-owned block", () => {
    const original = "; keep this\ncpk.root = \"custom\"\n";
    const managed = upsertManagedSiderBlock(original, { luaModules: ["one.lua"], liveCpkRoots: [] });
    expect(removeManagedSiderBlock(managed)).toBe(original);
  });

  it("rejects unsafe module names and roots", () => {
    expect(() => buildManagedSiderBlock({ luaModules: ["../evil.lua"], liveCpkRoots: [] })).toThrow("Invalid Sider Lua");
    expect(() => buildManagedSiderBlock({ luaModules: [], liveCpkRoots: ["C:\\outside"] })).toThrow("Invalid relative");
  });

  it("refuses damaged or duplicate markers", () => {
    expect(() => upsertManagedSiderBlock("; >>> NEXTGEN MANAGED CONFIG >>>\n", { luaModules: ["a.lua"], liveCpkRoots: [] })).toThrow("damaged");
    const duplicated = upsertManagedSiderBlock("", { luaModules: ["a.lua"], liveCpkRoots: [] });
    expect(() => upsertManagedSiderBlock(duplicated + duplicated, { luaModules: ["b.lua"], liveCpkRoots: [] })).toThrow("damaged");
  });
});
