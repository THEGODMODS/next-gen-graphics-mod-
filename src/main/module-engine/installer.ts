import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { ModuleManifest } from "../../shared/module-types";
import { normalizeSafeRelativePath, resolveInsideRoot } from "./path-safety";
import { verifySha256 } from "./sha256";
import { JournalStore, type ManagedFileRecord } from "./journal";

export interface InstallOptions {
  /** Exact relative targets the user explicitly approved replacing in the install preview. */
  approvedOverwriteTargets?: string[];
}

export interface InstallResult {
  moduleId: string;
  installedFiles: string[];
  backups: string[];
}

export interface UninstallResult {
  removed: string[];
  restored: string[];
  preservedModified: string[];
}

async function exists(filePath: string): Promise<boolean> {
  try { await fs.lstat(filePath); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function assertNoSymlinkPath(root: string, relativePath: string, includeLeaf: boolean): Promise<void> {
  const safe = normalizeSafeRelativePath(relativePath);
  const segments = safe.split("/");
  const count = includeLeaf ? segments.length : segments.length - 1;
  let cursor = root;
  for (let index = 0; index < count; index += 1) {
    cursor = path.join(cursor, segments[index]);
    try {
      const stat = await fs.lstat(cursor);
      if (stat.isSymbolicLink()) throw new Error(`Symbolic link/reparse point is not allowed: ${cursor}`);
      if (index < count - 1 && !stat.isDirectory()) throw new Error(`A parent path is not a directory: ${cursor}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

async function ensureSafeParents(root: string, relativePath: string): Promise<void> {
  const safe = normalizeSafeRelativePath(relativePath);
  const segments = safe.split("/");
  let cursor = root;
  for (const segment of segments.slice(0, -1)) {
    cursor = path.join(cursor, segment);
    try {
      const stat = await fs.lstat(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Unsafe target parent: ${cursor}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.mkdir(cursor);
    }
  }
}

async function withInstallLock<T>(stateDirectory: string, operation: () => Promise<T>): Promise<T> {
  await fs.mkdir(stateDirectory, { recursive: true });
  const lock = path.join(stateDirectory, "install.lock");
  try { await fs.mkdir(lock); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("Another module operation is running. Close the other operation and retry.");
    }
    throw error;
  }
  try { return await operation(); }
  finally { await fs.rm(lock, { recursive: true, force: true }); }
}

export class ModuleInstaller {
  private readonly journal: JournalStore;

  constructor(
    private readonly managedRoot: string,
    private readonly stateDirectory: string,
  ) {
    this.journal = new JournalStore(stateDirectory);
  }

  async install(packageDirectory: string, manifest: ModuleManifest, options: InstallOptions = {}): Promise<InstallResult> {
    return withInstallLock(this.stateDirectory, async () => {
      const root = await fs.realpath(this.managedRoot);
      const packageRoot = await fs.realpath(packageDirectory);
      const journal = await this.journal.read();

      if (journal.modules.some((item) => item.id === manifest.id)) {
        throw new Error(`Module ${manifest.id} is already installed. Upgrade support is not enabled yet.`);
      }
      const installedIds = new Set(journal.modules.map((item) => item.id));
      for (const dependency of manifest.dependencies) {
        if (!installedIds.has(dependency)) throw new Error(`Missing dependency: ${dependency}`);
      }
      for (const conflict of manifest.conflicts) {
        if (installedIds.has(conflict)) throw new Error(`Module conflicts with installed module: ${conflict}`);
      }

      const approved = new Set((options.approvedOverwriteTargets ?? []).map(normalizeSafeRelativePath));
      const ownedTargets = new Map<string, string>();
      for (const item of journal.modules) {
        for (const file of item.files) ownedTargets.set(file.target.toLowerCase(), item.id);
      }

      const transactionId = randomUUID();
      const stagingRoot = path.join(this.stateDirectory, "staging", transactionId);
      const backupRoot = path.join(this.stateDirectory, "backups", manifest.id, transactionId);
      const plan: Array<{ source: string; target: string; hash: string; existed: boolean; backup: string | null }> = [];

      // Preflight the entire package before touching the game directory.
      for (const entry of manifest.files) {
        const sourceRelative = normalizeSafeRelativePath(entry.source);
        const targetRelative = normalizeSafeRelativePath(entry.target);
        const source = resolveInsideRoot(packageRoot, sourceRelative);
        const target = resolveInsideRoot(root, targetRelative);
        const sourceStat = await fs.lstat(source);
        if (sourceStat.isSymbolicLink() || !sourceStat.isFile()) {
          throw new Error(`Package source must be a regular file: ${sourceRelative}`);
        }
        const realSource = await fs.realpath(source);
        const sourcePrefix = packageRoot.endsWith(path.sep) ? packageRoot : packageRoot + path.sep;
        if (!realSource.startsWith(sourcePrefix)) throw new Error(`Package source escapes package directory: ${sourceRelative}`);
        if (!(await verifySha256(source, entry.sha256))) {
          throw new Error(`SHA-256 mismatch: ${sourceRelative}`);
        }

        await assertNoSymlinkPath(root, targetRelative, false);
        const owner = ownedTargets.get(targetRelative.toLowerCase());
        if (owner) throw new Error(`Target is already managed by module ${owner}: ${targetRelative}`);
        const targetExists = await exists(target);
        if (targetExists) {
          const stat = await fs.lstat(target);
          if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Target is not a regular file: ${targetRelative}`);
          if (!approved.has(targetRelative)) {
            throw new Error(`Target already exists and is not approved for replacement: ${targetRelative}`);
          }
        }
        const backup = targetExists ? path.join(backupRoot, ...targetRelative.split("/")) : null;
        plan.push({ source, target, hash: entry.sha256.toLowerCase(), existed: targetExists, backup });
      }

      await fs.mkdir(stagingRoot, { recursive: true });
      const staged: Array<{ path: string; target: string; hash: string; existed: boolean; backup: string | null }> = [];
      const applied: Array<{ target: string; backup: string | null; installedHash: string }> = [];

      try {
        // Stage and re-verify every file before any target is changed.
        for (const item of plan) {
          const stagedPath = resolveInsideRoot(stagingRoot, path.relative(root, item.target).split(path.sep).join("/"));
          await fs.mkdir(path.dirname(stagedPath), { recursive: true });
          await fs.copyFile(item.source, stagedPath);
          if (!(await verifySha256(stagedPath, item.hash))) throw new Error(`Staged file verification failed: ${item.target}`);
          staged.push({ path: stagedPath, target: item.target, hash: item.hash, existed: item.existed, backup: item.backup });
        }

        for (const item of staged) {
          const relativeTarget = path.relative(root, item.target).split(path.sep).join("/");
          await assertNoSymlinkPath(root, relativeTarget, false);
          await ensureSafeParents(root, relativeTarget);
          if (item.existed) {
            await fs.mkdir(path.dirname(item.backup!), { recursive: true });
            await fs.copyFile(item.target, item.backup!);
          }
          const temporaryTarget = item.target + `.nextgen-${transactionId}.tmp`;
          await fs.copyFile(item.path, temporaryTarget);
          if (!(await verifySha256(temporaryTarget, item.hash))) {
            await fs.rm(temporaryTarget, { force: true });
            throw new Error(`Final write verification failed: ${relativeTarget}`);
          }
          await fs.rename(temporaryTarget, item.target);
          applied.push({ target: item.target, backup: item.backup, installedHash: item.hash });
        }

        const records: ManagedFileRecord[] = staged.map((item) => ({
          target: path.relative(root, item.target).split(path.sep).join("/"),
          sha256: item.hash,
          backupPath: item.backup,
        }));
        journal.modules.push({
          id: manifest.id,
          version: manifest.version,
          installedAt: new Date().toISOString(),
          files: records,
        });
        await this.journal.write(journal);
        return {
          moduleId: manifest.id,
          installedFiles: records.map((record) => record.target),
          backups: records.flatMap((record) => record.backupPath ? [record.backupPath] : []),
        };
      } catch (error) {
        // Restore only files changed by this transaction. Never touch unrelated files.
        for (const item of applied.reverse()) {
          try {
            if (item.backup && await exists(item.backup)) {
              await fs.copyFile(item.backup, item.target);
            } else if (await exists(item.target)) {
              const currentMatches = await verifySha256(item.target, item.installedHash);
              if (currentMatches) await fs.unlink(item.target);
            }
          } catch { /* Preserve the original failure; recovery data remains on disk. */ }
        }
        throw error;
      } finally {
        await fs.rm(stagingRoot, { recursive: true, force: true });
      }
    });
  }

  async uninstall(moduleId: string): Promise<UninstallResult> {
    return withInstallLock(this.stateDirectory, async () => {
      const root = await fs.realpath(this.managedRoot);
      const journal = await this.journal.read();
      const index = journal.modules.findIndex((item) => item.id === moduleId);
      if (index < 0) throw new Error(`Module is not installed: ${moduleId}`);
      const moduleRecord = journal.modules[index];
      const removed: string[] = [];
      const restored: string[] = [];
      const preservedModified: string[] = [];

      for (const record of [...moduleRecord.files].reverse()) {
        const relative = normalizeSafeRelativePath(record.target);
        await assertNoSymlinkPath(root, relative, true);
        const target = resolveInsideRoot(root, relative);
        if (!(await exists(target))) continue;
        const stat = await fs.lstat(target);
        if (stat.isSymbolicLink() || !stat.isFile()) {
          preservedModified.push(relative);
          continue;
        }
        if (!(await verifySha256(target, record.sha256))) {
          preservedModified.push(relative);
          continue;
        }
        if (record.backupPath && await exists(record.backupPath)) {
          await fs.copyFile(record.backupPath, target);
          restored.push(relative);
        } else {
          await fs.unlink(target);
          removed.push(relative);
        }
      }

      journal.modules.splice(index, 1);
      await this.journal.write(journal);
      return { removed, restored, preservedModified };
    });
  }
}
