import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { ModuleManifest } from "../../shared/module-types";
import { normalizeSafeRelativePath, resolveInsideRoot } from "./path-safety";
import { sha256File, verifySha256 } from "./sha256";
import { JournalStore, type ManagedFileRecord } from "./journal";
import { resolveDeploymentPlan } from "./deployment";

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

  /** Roll back an interrupted install before any new module operation is allowed. */
  async recoverPendingTransaction(): Promise<string[]> {
    return withInstallLock(this.stateDirectory, async () => {
      const root = await fs.realpath(this.managedRoot);
      const journal = await this.journal.read();
      if (!journal.pendingTransaction) return [];
      const recovered = await this.rollbackPending(root, journal);
      return recovered;
    });
  }

  private async rollbackPending(root: string, journal: Awaited<ReturnType<JournalStore["read"]>>): Promise<string[]> {
    const pending = journal.pendingTransaction;
    if (!pending) return [];
    const recovered: string[] = [];
    for (const item of [...pending.files].reverse()) {
      const relative = normalizeSafeRelativePath(item.target);
      await assertNoSymlinkPath(root, relative, true);
      const target = resolveInsideRoot(root, relative);
      const backup = item.backupPath;
      const backupExists = backup ? await exists(backup) : false;
      if (backup) {
        const backupRelative = path.relative(this.stateDirectory, backup);
        if (!backupRelative || backupRelative.startsWith("..") || path.isAbsolute(backupRelative)) {
          throw new Error("Pending transaction backup escapes the manager state directory; recovery is blocked.");
        }
        if (backupExists) {
          const stat = await fs.lstat(backup);
          if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Pending transaction backup is not a regular file.");
          if (!item.backupSha256 || !(await verifySha256(backup, item.backupSha256))) {
            throw new Error("Pending transaction backup integrity check failed; recovery is blocked.");
          }
        }
      }

      const targetExists = await exists(target);
      if (targetExists) {
        const stat = await fs.lstat(target);
        if (stat.isSymbolicLink() || !stat.isFile()) continue;
        if (!(await verifySha256(target, item.installedSha256))) continue;
      }
      if (backup && backupExists) {
        await ensureSafeParents(root, relative);
        const restoreTemp = target + `.nextgen-recovery-${pending.id}.tmp`;
        await fs.copyFile(backup, restoreTemp);
        if (!(await verifySha256(restoreTemp, item.backupSha256!))) {
          await fs.rm(restoreTemp, { force: true });
          throw new Error("Recovery restore verification failed.");
        }
        await fs.rename(restoreTemp, target);
        recovered.push(relative);
      } else if (!backup && targetExists) {
        await fs.unlink(target);
        recovered.push(relative);
      }
    }
    journal.pendingTransaction = null;
    await this.journal.write(journal);
    return recovered;
  }

  async install(packageDirectory: string, manifest: ModuleManifest, options: InstallOptions = {}): Promise<InstallResult> {
    return withInstallLock(this.stateDirectory, async () => {
      const root = await fs.realpath(this.managedRoot);
      const packageRoot = await fs.realpath(packageDirectory);
      const journal = await this.journal.read();
      if (journal.pendingTransaction) await this.rollbackPending(root, journal);

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
      const deployment = resolveDeploymentPlan(manifest);
      if (deployment.manualEntries.length) {
        throw new Error("This package requires manual-assisted deployment. The manager will not claim installation or write configuration templates automatically.");
      }

      // Preflight every adapter output before touching the game directory.
      const packageEntries = deployment.automatedEntries;
      for (const entry of packageEntries) {
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

        // Preserve all approved originals before recording the durable recovery point.
        const pendingFiles = [];
        for (const item of staged) {
          if (item.existed && item.backup) {
            await fs.mkdir(path.dirname(item.backup), { recursive: true });
            await fs.copyFile(item.target, item.backup);
          }
          pendingFiles.push({
            target: path.relative(root, item.target).split(path.sep).join("/"),
            installedSha256: item.hash,
            backupPath: item.backup,
            backupSha256: item.backup ? await sha256File(item.backup) : null,
          });
        }
        journal.pendingTransaction = {
          id: transactionId,
          moduleId: manifest.id,
          startedAt: new Date().toISOString(),
          files: pendingFiles,
        };
        await this.journal.write(journal);

        for (const item of staged) {
          const relativeTarget = path.relative(root, item.target).split(path.sep).join("/");
          await assertNoSymlinkPath(root, relativeTarget, false);
          await ensureSafeParents(root, relativeTarget);
          const temporaryTarget = item.target + `.nextgen-${transactionId}.tmp`;
          await fs.copyFile(item.path, temporaryTarget);
          if (!(await verifySha256(temporaryTarget, item.hash))) {
            await fs.rm(temporaryTarget, { force: true });
            throw new Error(`Final write verification failed: ${relativeTarget}`);
          }
          await fs.rename(temporaryTarget, item.target);
          applied.push({ target: item.target, backup: item.backup, installedHash: item.hash });
        }

        const records: ManagedFileRecord[] = await Promise.all(staged.map(async (item) => ({
          target: path.relative(root, item.target).split(path.sep).join("/"),
          sha256: item.hash,
          backupPath: item.backup,
          backupSha256: item.backup ? await sha256File(item.backup) : null,
        })));
        journal.modules.push({
          id: manifest.id,
          version: manifest.version,
          installedAt: new Date().toISOString(),
          dependencies: [...manifest.dependencies],
          files: records,
        });
        journal.pendingTransaction = null;
        await this.journal.write(journal);
        return {
          moduleId: manifest.id,
          installedFiles: records.map((record) => record.target),
          backups: records.flatMap((record) => record.backupPath ? [record.backupPath] : []),
        };
      } catch (error) {
        // Use the same hash-guarded recovery path used after an application crash.
        try {
          const latest = await this.journal.read();
          if (latest.pendingTransaction) await this.rollbackPending(root, latest);
        } catch { /* Keep the pending journal and backups for a later recovery attempt. */ }
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
      if (journal.pendingTransaction) await this.rollbackPending(root, journal);
      const index = journal.modules.findIndex((item) => item.id === moduleId);
      if (index < 0) throw new Error(`Module is not installed: ${moduleId}`);
      const moduleRecord = journal.modules[index];
      const dependents = journal.modules.filter(item => item.id !== moduleId && item.dependencies?.includes(moduleId));
      if (dependents.length) {
        throw new Error("Cannot uninstall this module while installed modules depend on it: " +
          dependents.map(item => item.id).join(", ") + ". Remove those dependent modules first.");
      }
      const removed: string[] = [];
      const restored: string[] = [];
      const preservedModified: string[] = [];

      for (const record of [...moduleRecord.files].reverse()) {
        const relative = normalizeSafeRelativePath(record.target);
        await assertNoSymlinkPath(root, relative, true);
        const target = resolveInsideRoot(root, relative);
        const targetExists = await exists(target);
        if (!targetExists) {
          if (record.backupPath) {
            const backupRelative = path.relative(this.stateDirectory, record.backupPath);
            if (!backupRelative || backupRelative.startsWith("..") || path.isAbsolute(backupRelative)) {
              throw new Error("Journal backup path escapes the manager state directory.");
            }
            if (await exists(record.backupPath)) {
              const backupStat = await fs.lstat(record.backupPath);
              if (backupStat.isSymbolicLink() || !backupStat.isFile()) throw new Error("Journal backup is not a regular file.");
              if (record.backupSha256 && !(await verifySha256(record.backupPath, record.backupSha256))) {
                throw new Error("Backup integrity check failed; original file was not restored.");
              }
              await ensureSafeParents(root, relative);
              await fs.copyFile(record.backupPath, target);
              restored.push(relative);
            }
          }
          continue;
        }
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
          const backupRelative = path.relative(this.stateDirectory, record.backupPath);
          if (!backupRelative || backupRelative.startsWith("..") || path.isAbsolute(backupRelative)) {
            throw new Error("Journal backup path escapes the manager state directory.");
          }
          const backupStat = await fs.lstat(record.backupPath);
          if (backupStat.isSymbolicLink() || !backupStat.isFile()) throw new Error("Journal backup is not a regular file.");
          if (record.backupSha256 && !(await verifySha256(record.backupPath, record.backupSha256))) {
            throw new Error("Backup integrity check failed; original file was not restored.");
          }
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
