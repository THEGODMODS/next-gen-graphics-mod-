import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JournalStore } from "../../src/main/module-engine/journal";
import { SiderConfigManager } from "../../src/main/module-engine/sider-config";

const roots: string[] = [];
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "nextgen-sider-"));
  roots.push(root);
  const state = path.join(root, "state");
  await fs.mkdir(path.join(root, "LiveCPK"), { recursive: true });
  await fs.writeFile(path.join(root, "sider.ini"), "; user config\nlua.enabled = 1\n", "utf8");
  return { root, state, ini: path.join(root, "sider.ini") };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });

describe("Sider configuration sync", () => {
  it("registers LiveCPK only when installed module files target that directory", async () => {
    const f = await fixture();
    const journal = new JournalStore(f.state);
    const data = await journal.read();
    data.modules.push({ id: "studio.pitch-pack", version: "1.0.0", installedAt: new Date().toISOString(),
      files: [{ target: "LiveCPK/common/pitch.dds", sha256: "a".repeat(64), backupPath: null, backupSha256: null }] });
    await journal.write(data);
    const result = await new SiderConfigManager(f.root, f.state).syncInstalledModules();
    const ini = await fs.readFile(f.ini, "utf8");
    expect(result.changed).toBe(true);
    expect(result.registeredRoots).toEqual([".\\LiveCPK"]);
    expect(ini).toContain('cpk.root = ".\\LiveCPK"');
    expect(ini).toContain("user config");
    expect(result.backupPath).not.toBeNull();
  });

  it("is idempotent and does not create a second backup for unchanged configuration", async () => {
    const f = await fixture();
    const journal = new JournalStore(f.state);
    const data = await journal.read();
    data.modules.push({ id: "studio.pitch-pack", version: "1.0.0", installedAt: new Date().toISOString(),
      files: [{ target: "LiveCPK/pitch.dds", sha256: "a".repeat(64), backupPath: null, backupSha256: null }] });
    await journal.write(data);
    const manager = new SiderConfigManager(f.root, f.state);
    await manager.syncInstalledModules();
    const second = await manager.syncInstalledModules();
    expect(second.changed).toBe(false);
    expect(second.backupPath).toBeNull();
  });

  it("removes only the manager block when no installed module needs LiveCPK", async () => {
    const f = await fixture();
    const manager = new SiderConfigManager(f.root, f.state);
    await manager.syncInstalledModules();
    const before = await fs.readFile(f.ini, "utf8");
    expect(before).toContain("user config");
    expect(before).not.toContain("NEXTGEN MANAGED CONFIG");
  });

  it.skipIf(process.platform === "win32")("refuses a symlinked sider.ini", async () => {
    const f = await fixture();
    await fs.rm(f.ini);
    await fs.symlink(path.join(f.root, "missing.ini"), f.ini);
    await expect(new SiderConfigManager(f.root, f.state).syncInstalledModules()).rejects.toThrow("regular file");
  });
  it("registers only installed Lua module files with Sider", async () => {
    const f = await fixture();
    const journal = new JournalStore(f.state);
    const data = await journal.read();
    data.modules.push({ id: "studio.weather", version: "1.0.0", installedAt: new Date().toISOString(),
      files: [{ target: "modules/nextgen-weather.lua", sha256: "b".repeat(64), backupPath: null, backupSha256: null }] });
    await journal.write(data);
    const result = await new SiderConfigManager(f.root, f.state).syncInstalledModules();
    const ini = await fs.readFile(f.ini, "utf8");
    expect(result.registeredLuaModules).toEqual(["nextgen-weather.lua"]);
    expect(ini).toContain("lua.enabled = 1");
    expect(ini).toContain('lua.module = "nextgen-weather.lua"');
    expect(ini).toContain("user config");
  });

  it("allows individual Lua modules to be disabled and re-enabled", async () => {
    const f = await fixture();
    const journal = new JournalStore(f.state);
    const data = await journal.read();
    data.modules.push({ id: "studio.lua-pack", version: "1.0.0", installedAt: new Date().toISOString(),
      files: [
        { target: "modules/weather.lua", sha256: "a".repeat(64), backupPath: null, backupSha256: null },
        { target: "modules/lighting.lua", sha256: "b".repeat(64), backupPath: null, backupSha256: null },
      ] });
    await journal.write(data);
    const manager = new SiderConfigManager(f.root, f.state);
    const initial = await manager.listLuaModules();
    expect(initial).toHaveLength(2);
    expect(initial.every(module => module.enabled)).toBe(true);
    await manager.syncInstalledModules();
    await manager.setLuaModuleEnabled("weather.lua", false);
    let ini = await fs.readFile(f.ini, "utf8");
    expect(ini).not.toContain('lua.module = "weather.lua"');
    expect(ini).toContain('lua.module = "lighting.lua"');
    expect((await manager.listLuaModules()).find(module => module.moduleName === "weather.lua")?.enabled).toBe(false);
    await manager.setLuaModuleEnabled("weather.lua", true);
    ini = await fs.readFile(f.ini, "utf8");
    expect(ini).toContain('lua.module = "weather.lua"');
  });

  it("refuses to toggle a Lua module not owned by the install journal", async () => {
    const f = await fixture();
    await expect(new SiderConfigManager(f.root, f.state).setLuaModuleEnabled("unmanaged.lua", false))
      .rejects.toThrow("not installed");
  });


  it("toggles every Lua file in one package as an atomic activation group", async () => {
    const f = await fixture();
    const journal = new JournalStore(f.state);
    const data = await journal.read();
    data.modules.push({ id: "studio.weather", version: "1.0.0", installedAt: new Date().toISOString(),
      files: [
        { target: "modules/weather.lua", sha256: "a".repeat(64), backupPath: null, backupSha256: null },
        { target: "modules/clouds.lua", sha256: "b".repeat(64), backupPath: null, backupSha256: null },
      ] });
    await journal.write(data);
    const manager = new SiderConfigManager(f.root, f.state);
    await manager.syncInstalledModules();
    const disabled = await manager.setLuaModulesEnabled(["weather.lua", "clouds.lua"], false);
    expect(disabled.registeredLuaModules).toEqual([]);
    const enabled = await manager.setLuaModulesEnabled(["weather.lua", "clouds.lua"], true);
    expect(enabled.registeredLuaModules).toEqual(["clouds.lua", "weather.lua"]);
  });

  it("rejects a Lua activation group containing an unmanaged module", async () => {
    const f = await fixture();
    await expect(new SiderConfigManager(f.root, f.state).setLuaModulesEnabled(["missing.lua"], false))
      .rejects.toThrow("not installed");
  });

});