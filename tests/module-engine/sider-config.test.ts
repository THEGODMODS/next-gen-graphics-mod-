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
    const result = await new SiderConfigManager(f.root, f.state).syncInstalledLiveCpkRoots();
    const ini = await fs.readFile(f.ini, "utf8");
    expect(result.changed).toBe(true);
    expect(result.registeredRoots).toEqual([".\\\\LiveCPK"]);
    expect(ini).toContain('cpk.root = ".\\\\LiveCPK"');
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
    await manager.syncInstalledLiveCpkRoots();
    const second = await manager.syncInstalledLiveCpkRoots();
    expect(second.changed).toBe(false);
    expect(second.backupPath).toBeNull();
  });

  it("removes only the manager block when no installed module needs LiveCPK", async () => {
    const f = await fixture();
    const manager = new SiderConfigManager(f.root, f.state);
    await manager.syncInstalledLiveCpkRoots();
    const before = await fs.readFile(f.ini, "utf8");
    expect(before).toContain("user config");
    expect(before).not.toContain("NEXTGEN MANAGED CONFIG");
  });

  it("refuses a symlinked sider.ini", async () => {
    const f = await fixture();
    await fs.rm(f.ini);
    await fs.symlink(path.join(f.root, "missing.ini"), f.ini);
    await expect(new SiderConfigManager(f.root, f.state).syncInstalledLiveCpkRoots()).rejects.toThrow("regular file");
  });
});
