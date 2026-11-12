import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ManagedFileRecord {
  target: string;
  sha256: string;
  backupPath: string | null;
}

export interface InstalledModuleRecord {
  id: string;
  version: string;
  installedAt: string;
  files: ManagedFileRecord[];
}

export interface InstallJournal {
  schemaVersion: 1;
  updatedAt: string;
  modules: InstalledModuleRecord[];
}

const emptyJournal = (): InstallJournal => ({
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  modules: [],
});

export class JournalStore {
  readonly filePath: string;

  constructor(readonly stateDirectory: string) {
    this.filePath = path.join(stateDirectory, "install-journal.json");
  }

  async read(): Promise<InstallJournal> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object") throw new Error("Journal root is invalid.");
      const journal = value as InstallJournal;
      if (journal.schemaVersion !== 1 || !Array.isArray(journal.modules)) {
        throw new Error("Unsupported or damaged install journal. Installation is blocked.");
      }
      return journal;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyJournal();
      throw error;
    }
  }

  async write(journal: InstallJournal): Promise<void> {
    await fs.mkdir(this.stateDirectory, { recursive: true });
    const next = { ...journal, updatedAt: new Date().toISOString() };
    const temporary = this.filePath + ".tmp";
    await fs.writeFile(temporary, JSON.stringify(next, null, 2), { encoding: "utf8", flag: "w" });
    await fs.rename(temporary, this.filePath);
  }
}
