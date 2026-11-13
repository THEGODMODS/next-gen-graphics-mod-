import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { JournalStore } from "./journal";
import { upsertManagedSiderBlock, removeManagedSiderBlock } from "./sider-ini";

async function withSiderLock<T>(stateDirectory: string, action: () => Promise<T>): Promise<T> {
  await fs.mkdir(stateDirectory, { recursive: true });
  const lock = path.join(stateDirectory, "sider-config.lock");
  try { await fs.mkdir(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Another Sider configuration operation is running.");
    throw error;
  }
  try { return await action(); }
  finally { await fs.rm(lock, { recursive: true, force: true }); }
}

export interface ManagedLuaModule { moduleName: string; enabled: boolean; sha256: string; }

export interface SiderSyncResult {
  registeredRoots: string[];
  registeredLuaModules: string[];
  changed: boolean;
  backupPath: string | null;
}

/**
 * Registers the game's LiveCPK directory only when installed module payloads
 * actually target it. User-owned INI lines are retained by the marker adapter.
 */
export class SiderConfigManager {
  constructor(private readonly gameDirectory: string, private readonly stateDirectory: string) {}

  async listLuaModules(): Promise<ManagedLuaModule[]> {
    const journal = await new JournalStore(this.stateDirectory).read();
    const records = new Map<string, string>();
    for (const module of journal.modules) for (const file of module.files) {
      const target = file.target.replace(/\\/g, "/");
      if (/^modules\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.lua$/i.test(target)) records.set(target.slice(8), file.sha256);
    }
    const activationPath = path.join(this.stateDirectory, "sider-enabled-lua.json");
    let enabled: Set<string>;
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(activationPath, "utf8"));
      if (!Array.isArray(parsed) || parsed.some(value => typeof value !== "string")) throw new Error("Lua activation state is damaged; synchronization is blocked.");
      enabled = new Set((parsed as string[]).filter(name => records.has(name)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      enabled = new Set(records.keys());
    }
    return [...records].sort(([a], [b]) => a.localeCompare(b)).map(([moduleName, sha256]) => ({ moduleName, sha256, enabled: enabled.has(moduleName) }));
  }

  async setLuaModuleEnabled(moduleName: string, enabled: boolean): Promise<SiderSyncResult> {
    return this.setLuaModulesEnabled([moduleName], enabled);
  }

  /** Atomically toggles every Lua extension belonging to a single installed package. */
  async setLuaModulesEnabled(moduleNames: string[], enabled: boolean): Promise<SiderSyncResult> {
    if (!Array.isArray(moduleNames) || moduleNames.length === 0 ||
        moduleNames.some(name => typeof name !== "string" || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.lua$/i.test(name) || name.includes(".."))) {
      throw new Error("Invalid Lua module activation group.");
    }
    const uniqueNames = [...new Set(moduleNames)];
    if (uniqueNames.length !== moduleNames.length) throw new Error("Lua activation group contains duplicate module names.");
    const installed = await this.listLuaModules();
    const installedNames = new Set(installed.map(module => module.moduleName));
    if (uniqueNames.some(name => !installedNames.has(name))) {
      throw new Error("Lua module is not installed or is not managed by this manager; every activation-group member must be installed.");
    }
    const activationPath = path.join(this.stateDirectory, "sider-enabled-lua.json");
    const previous = installed.filter(module => module.enabled).map(module => module.moduleName);
    const names = new Set(previous);
    for (const name of uniqueNames) enabled ? names.add(name) : names.delete(name);
    await fs.mkdir(this.stateDirectory, { recursive: true });
    const temporary = activationPath + ".tmp";
    await fs.writeFile(temporary, JSON.stringify([...names].sort(), null, 2), { encoding: "utf8", flag: "w" });
    await fs.rename(temporary, activationPath);
    try { return await this.syncInstalledModules(); }
    catch (error) {
      const rollback = activationPath + ".rollback.tmp";
      await fs.writeFile(rollback, JSON.stringify(previous.sort(), null, 2), { encoding: "utf8", flag: "w" });
      await fs.rename(rollback, activationPath);
      throw error;
    }
  }
  /** Replaces the complete manager-owned Lua activation set in one Sider sync. */
  async applyLuaActivationProfile(enabledModuleNames: string[]): Promise<SiderSyncResult> {
    if (!Array.isArray(enabledModuleNames) || enabledModuleNames.length > 1000 ||
        enabledModuleNames.some(name => typeof name !== "string" || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.lua$/i.test(name) || name.includes(".."))) {
      throw new Error("Invalid Lua activation profile.");
    }
    const uniqueNames = [...new Set(enabledModuleNames)];
    if (uniqueNames.length !== enabledModuleNames.length) throw new Error("Lua activation profile contains duplicate module names.");
    const installed = await this.listLuaModules();
    const installedNames = new Set(installed.map(module => module.moduleName));
    if (uniqueNames.some(name => !installedNames.has(name))) {
      throw new Error("Lua activation profile contains a module that is not installed or manager-owned.");
    }
    const activationPath = path.join(this.stateDirectory, "sider-enabled-lua.json");
    const previous = installed.filter(module => module.enabled).map(module => module.moduleName).sort();
    const desired = [...uniqueNames].sort();
    await fs.mkdir(this.stateDirectory, { recursive: true });
    const temporary = activationPath + ".profile.tmp";
    await fs.writeFile(temporary, JSON.stringify(desired, null, 2), { encoding: "utf8", flag: "w" });
    await fs.rename(temporary, activationPath);
    try {
      return await this.syncInstalledModules();
    } catch (error) {
      const rollback = activationPath + ".profile-rollback.tmp";
      await fs.writeFile(rollback, JSON.stringify(previous, null, 2), { encoding: "utf8", flag: "w" });
      await fs.rename(rollback, activationPath);
      throw error;
    }
  }

  async syncInstalledModules(): Promise<SiderSyncResult> {
    return withSiderLock(this.stateDirectory, async () => {
      const gameRoot = await fs.realpath(this.gameDirectory);
      const iniPath = path.join(gameRoot, "sider.ini");
      const stat = await fs.lstat(iniPath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("sider.ini must be a regular file; configuration was not changed.");

      const journal = await new JournalStore(this.stateDirectory).read();
      const hasLiveCpkFiles = journal.modules.some(module =>
        module.files.some(file => file.target.replace(/\\/g, "/").toLowerCase().startsWith("livecpk/")),
      );
      const roots = hasLiveCpkFiles ? [".\\LiveCPK"] : [];
      const installedLua = [...new Set(journal.modules.flatMap(module =>
        module.files.map(file => file.target.replace(/\\/g, "/"))
          .filter(target => /^modules\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.lua$/i.test(target))
          .map(target => target.slice("modules/".length)),
      ))].sort((a, b) => a.localeCompare(b));
      const activationPath = path.join(this.stateDirectory, "sider-enabled-lua.json");
      let enabledLua: Set<string>;
      try {
        const parsed: unknown = JSON.parse(await fs.readFile(activationPath, "utf8"));
        if (!Array.isArray(parsed) || parsed.some(value => typeof value !== "string")) throw new Error("Lua activation state is damaged; synchronization is blocked.");
        enabledLua = new Set((parsed as string[]).filter(name => installedLua.includes(name)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        enabledLua = new Set(installedLua);
      }
      const luaModules = installedLua.filter(name => enabledLua.has(name));
      const original = await fs.readFile(iniPath, "utf8");
      const updated = roots.length || luaModules.length
        ? upsertManagedSiderBlock(original, { luaModules, liveCpkRoots: roots })
        : removeManagedSiderBlock(original);
      if (updated === original) return { registeredRoots: roots, registeredLuaModules: luaModules, changed: false, backupPath: null };

      const backupDirectory = path.join(this.stateDirectory, "sider-backups");
      await fs.mkdir(backupDirectory, { recursive: true });
      const backupPath = path.join(backupDirectory, `sider-${Date.now()}-${randomUUID()}.ini`);
      await fs.copyFile(iniPath, backupPath);
      const temporary = iniPath + `.nextgen-${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, updated, { encoding: "utf8", flag: "wx" });
        await fs.rename(temporary, iniPath);
        const written = await fs.readFile(iniPath, "utf8");
        if (written !== updated) throw new Error("Sider INI verification failed after writing.");
      } catch (error) {
        await fs.rm(temporary, { force: true });
        try { await fs.copyFile(backupPath, iniPath); } catch { /* Keep backup for manual recovery. */ }
        throw error;
      }
      return { registeredRoots: roots, registeredLuaModules: luaModules, changed: true, backupPath };
    });
  }
}
