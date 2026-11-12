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

  async syncInstalledLiveCpkRoots(): Promise<SiderSyncResult> {
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
      const luaModules = [...new Set(journal.modules.flatMap(module =>
        module.files.map(file => file.target.replace(/\\\\/g, "/"))
          .filter(target => /^modules\\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.lua$/i.test(target))
          .map(target => target.slice("modules/".length)),
      ))].sort((a, b) => a.localeCompare(b));
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
