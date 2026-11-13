import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { ModuleInstaller } from "../../src/main/module-engine/installer";
import type { ModuleManifest } from "../../src/shared/module-types";

const roots: string[] = [];
async function fixture() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "nextgen-engine-"));
  roots.push(base);
  const game = path.join(base, "game");
  const state = path.join(base, "manager-state");
  const pkg = path.join(base, "package");
  await Promise.all([fs.mkdir(game), fs.mkdir(state), fs.mkdir(path.join(pkg, "payload"), { recursive: true })]);
  const bytes = Buffer.from("new grass asset");
  await fs.writeFile(path.join(pkg, "payload", "grass.dds"), bytes);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const manifest: ModuleManifest = {
    schemaVersion: 1,
    id: "studio.pitch-pack",
    name: "Pitch Pack",
    version: "1.0.0",
    description: "Test module",
    category: "graphics",
    game: { title: "PES 2017", executable: ["PES2017.exe"], sider: ">=3.5.0 <4.0.0" },
    dependencies: [],
    conflicts: [],
    files: [{ source: "payload/grass.dds", target: "LiveCPK/common/grass.dds", sha256: hash }],
    luaModules: [],
    license: { id: "test-only", redistributionAllowed: false },
  };
  return { base, game, state, pkg, manifest };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));

});

describe("transactional module installer", () => {
  it("installs verified files and records ownership", async () => {
    const f = await fixture();
    const result = await new ModuleInstaller(f.game, f.state).install(f.pkg, f.manifest);
    expect(result.installedFiles).toEqual(["LiveCPK/common/grass.dds"]);
    expect(await fs.readFile(path.join(f.game, "LiveCPK/common/grass.dds"), "utf8")).toBe("new grass asset");
    const journal = JSON.parse(await fs.readFile(path.join(f.state, "install-journal.json"), "utf8"));
    expect(journal.modules[0].id).toBe("studio.pitch-pack");
  });


  it("refuses to auto-install manual-assisted configuration packages", async () => {
    const f = await fixture();
    const manifest: ModuleManifest = {
      ...f.manifest,
      deployment: { strategy: "configuration", configFormat: "sider-ini",
        manualSteps: ["Review the generated settings and apply them manually."] }
    };
    await expect(new ModuleInstaller(f.game, f.state).install(f.pkg, manifest))
      .rejects.toThrow("requires manual-assisted deployment");
    await expect(fs.access(path.join(f.game, "LiveCPK/common/grass.dds"))).rejects.toThrow();
    await expect(fs.access(path.join(f.state, "install-journal.json"))).rejects.toThrow();
  });

  it("rejects a payload changed after its manifest was created", async () => {
    const f = await fixture();
    await fs.writeFile(path.join(f.pkg, "payload", "grass.dds"), "tampered payload");
    await expect(new ModuleInstaller(f.game, f.state).install(f.pkg, f.manifest)).rejects.toThrow("SHA-256 mismatch");
    await expect(fs.access(path.join(f.game, "LiveCPK/common/grass.dds"))).rejects.toThrow();
  });

  it("refuses to overwrite existing files without explicit approval", async () => {
    const f = await fixture();
    const target = path.join(f.game, "LiveCPK/common/grass.dds");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "user's existing file");
    await expect(new ModuleInstaller(f.game, f.state).install(f.pkg, f.manifest)).rejects.toThrow("not approved");
    expect(await fs.readFile(target, "utf8")).toBe("user's existing file");
  });

  it("backs up an approved replacement and restores it on uninstall", async () => {
    const f = await fixture();
    const relative = "LiveCPK/common/grass.dds";
    const target = path.join(f.game, ...relative.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "original user file");
    const installer = new ModuleInstaller(f.game, f.state);
    await installer.install(f.pkg, f.manifest, { approvedOverwriteTargets: [relative] });
    expect(await fs.readFile(target, "utf8")).toBe("new grass asset");
    const result = await installer.uninstall("studio.pitch-pack");
    expect(result.restored).toEqual([relative]);
    expect(await fs.readFile(target, "utf8")).toBe("original user file");
  });

  it("blocks uninstall before mutation when an original backup is missing", async () => {
    const f = await fixture();
    const relative = "LiveCPK/common/grass.dds";
    const target = path.join(f.game, ...relative.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "original user file");
    const installer = new ModuleInstaller(f.game, f.state);
    await installer.install(f.pkg, f.manifest, { approvedOverwriteTargets: [relative] });
    const journalPath = path.join(f.state, "install-journal.json");
    const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
    const backupPath = journal.modules[0].files[0].backupPath;
    await fs.rm(backupPath, { force: true });
    await expect(installer.uninstall("studio.pitch-pack")).rejects.toThrow("Original backup is missing");
    expect(await fs.readFile(target, "utf8")).toBe("new grass asset");
    const unchangedJournal = JSON.parse(await fs.readFile(journalPath, "utf8"));
    expect(unchangedJournal.modules).toHaveLength(1);
  });

  it("blocks uninstall while another installed module depends on it", async () => {
    const f = await fixture();
    const installer = new ModuleInstaller(f.game, f.state);
    await installer.install(f.pkg, f.manifest);
    const journalPath = path.join(f.state, "install-journal.json");
    const journal = JSON.parse(await fs.readFile(journalPath, "utf8"));
    journal.modules.push({ id: "studio.weather-addon", version: "1.0.0", installedAt: new Date().toISOString(),
      dependencies: ["studio.pitch-pack"], files: [] });
    await fs.writeFile(journalPath, JSON.stringify(journal));
    await expect(installer.uninstall("studio.pitch-pack")).rejects.toThrow("studio.weather-addon");
    expect(await fs.readFile(path.join(f.game, "LiveCPK/common/grass.dds"), "utf8")).toBe("new grass asset");
  });
  it("preserves a managed file that the user modified after installation", async () => {
    const f = await fixture();
    const installer = new ModuleInstaller(f.game, f.state);
    await installer.install(f.pkg, f.manifest);
    const target = path.join(f.game, "LiveCPK/common/grass.dds");
    await fs.writeFile(target, "user modification");
    const result = await installer.uninstall("studio.pitch-pack");
    expect(result.preservedModified).toEqual(["LiveCPK/common/grass.dds"]);
    expect(await fs.readFile(target, "utf8")).toBe("user modification");
  });
  it("recovers an interrupted install by restoring backups and removing newly placed files", async () => {
    const f = await fixture();
    const installer = new ModuleInstaller(f.game, f.state);
    const replaced = "LiveCPK/common/grass.dds";
    const added = "LiveCPK/common/new-grass.dds";
    const replacedPath = path.join(f.game, ...replaced.split("/"));
    const addedPath = path.join(f.game, ...added.split("/"));
    const backupPath = path.join(f.state, "backups", "recovery", "original-grass.dds");
    await fs.mkdir(path.dirname(replacedPath), { recursive: true });
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, "original grass");
    await fs.writeFile(replacedPath, "new grass asset");
    await fs.writeFile(addedPath, "new grass asset");
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    await fs.writeFile(path.join(f.state, "install-journal.json"), JSON.stringify({
      schemaVersion: 1, updatedAt: new Date().toISOString(), modules: [],
      pendingTransaction: {
        id: "simulated-crash", moduleId: "studio.pitch-pack", startedAt: new Date().toISOString(),
        files: [
          { target: replaced, installedSha256: digest("new grass asset"), backupPath, backupSha256: digest("original grass") },
          { target: added, installedSha256: digest("new grass asset"), backupPath: null, backupSha256: null },
        ],
      },
    }));
    const recovered = await installer.recoverPendingTransaction();
    expect(recovered).toEqual([added, replaced]);
    expect(await fs.readFile(replacedPath, "utf8")).toBe("original grass");
    await expect(fs.access(addedPath)).rejects.toThrow();
    const journal = JSON.parse(await fs.readFile(path.join(f.state, "install-journal.json"), "utf8"));
    expect(journal.pendingTransaction).toBeNull();
  });

  it("preflights every interrupted-install backup before restoring any target", async () => {
    const f = await fixture();
    const installer = new ModuleInstaller(f.game, f.state);
    const first = "LiveCPK/common/first.dds";
    const second = "LiveCPK/common/second.dds";
    const firstPath = path.join(f.game, ...first.split("/"));
    const secondPath = path.join(f.game, ...second.split("/"));
    const backupPath = path.join(f.state, "backups", "recovery", "first-original.dds");
    await fs.mkdir(path.dirname(firstPath), { recursive: true });
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(firstPath, "installed first");
    await fs.writeFile(secondPath, "installed second");
    await fs.writeFile(backupPath, "original first");
    const digest = (value: string) => createHash("sha256").update(value).digest("hex");
    await fs.writeFile(path.join(f.state, "install-journal.json"), JSON.stringify({
      schemaVersion: 1, updatedAt: new Date().toISOString(), modules: [],
      pendingTransaction: {
        id: "simulated-partial-crash", moduleId: "studio.pitch-pack", startedAt: new Date().toISOString(),
        files: [
          { target: first, installedSha256: digest("installed first"), backupPath, backupSha256: digest("original first") },
          { target: second, installedSha256: digest("installed second"), backupPath: path.join(f.state, "backups", "missing.dds"), backupSha256: digest("original second") },
        ],
      },
    }));

    await expect(installer.recoverPendingTransaction()).rejects.toThrow("backup is missing");
    expect(await fs.readFile(firstPath, "utf8")).toBe("installed first");
    expect(await fs.readFile(secondPath, "utf8")).toBe("installed second");
    const journal = JSON.parse(await fs.readFile(path.join(f.state, "install-journal.json"), "utf8"));
    expect(journal.pendingTransaction).not.toBeNull();
  });

  it("preserves a target changed after an interrupted install", async () => {
    const f = await fixture();
    const relative = "LiveCPK/common/grass.dds";
    const target = path.join(f.game, ...relative.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "user's later edit");
    const digest = createHash("sha256").update("new grass asset").digest("hex");
    await fs.writeFile(path.join(f.state, "install-journal.json"), JSON.stringify({
      schemaVersion: 1, updatedAt: new Date().toISOString(), modules: [],
      pendingTransaction: {
        id: "simulated-crash", moduleId: "studio.pitch-pack", startedAt: new Date().toISOString(),
        files: [{ target: relative, installedSha256: digest, backupPath: null, backupSha256: null }],
      },
    }));
    await new ModuleInstaller(f.game, f.state).recoverPendingTransaction();
    expect(await fs.readFile(target, "utf8")).toBe("user's later edit");
  });
  it("deploys Lua modules into Sider modules directory and journals their ownership", async () => {
    const f = await fixture();
    const luaSource = "payload/nextgen-weather.lua";
    const luaTarget = "modules/nextgen-weather.lua";
    const luaBytes = Buffer.from('return { name = "NextGen Weather" }');
    await fs.writeFile(path.join(f.pkg, "payload", "nextgen-weather.lua"), luaBytes);
    const luaHash = createHash("sha256").update(luaBytes).digest("hex");
    const manifest: ModuleManifest = {
      ...f.manifest,
      luaModules: [{ source: luaSource, moduleName: "nextgen-weather.lua", sha256: luaHash }],
    };
    const result = await new ModuleInstaller(f.game, f.state).install(f.pkg, manifest);
    expect(result.installedFiles).toContain(luaTarget);
    expect(await fs.readFile(path.join(f.game, luaTarget), "utf8")).toContain("NextGen Weather");
    const journal = JSON.parse(await fs.readFile(path.join(f.state, "install-journal.json"), "utf8"));
    expect(journal.modules[0].files.some((file: { target: string }) => file.target === luaTarget)).toBe(true);
  });

});