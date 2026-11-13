import type { ModuleManifest, ModuleFileEntry } from "../../shared/module-types";
import { normalizeSafeRelativePath } from "./path-safety";

export type DeploymentStrategy = "auto" | "direct" | "livecpk" | "lua" | "configuration" | "manual-assisted";
export type DeploymentEntry = { source: string; target: string; sha256: string; adapter: "direct" | "livecpk" | "lua" };
export type DeploymentPlan = {
  strategy: DeploymentStrategy;
  automatedEntries: DeploymentEntry[];
  manualEntries: ModuleFileEntry[];
  manualSteps: string[];
  summary: string;
};

function safeSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((step): step is string => typeof step === "string" && step.trim().length > 0 && step.length <= 500);
}

/**
 * Resolves a manifest into explicit deployment adapters. Legacy manifests use
 * "auto" and retain their established target semantics.
 */
export function resolveDeploymentPlan(manifest: ModuleManifest): DeploymentPlan {
  const declaration = manifest.deployment;
  const strategy = declaration?.strategy ?? "auto";
  const files = manifest.files ?? [];
  const lua = manifest.luaModules ?? [];
  const manualSteps = safeSteps(declaration?.manualSteps);
  const entries: DeploymentEntry[] = [];
  const manualEntries: ModuleFileEntry[] = [];

  if (strategy === "manual-assisted") {
    if (!manualSteps.length) throw new Error("Manual-assisted packages must include at least one explicit manual step.");
    return { strategy, automatedEntries: [], manualEntries: [...files], manualSteps,
      summary: "Package files are provided for a user-completed manual installation; no game files will be changed automatically." };
  }

  if (strategy === "configuration") {
    if (!manualSteps.length) throw new Error("Configuration packages must include explicit manual application instructions.");
    if (!declaration?.configFormat) throw new Error("Configuration packages must declare configFormat.");
    if (lua.length) throw new Error("Configuration packages cannot declare Lua modules.");
    return { strategy, automatedEntries: [], manualEntries: [...files], manualSteps,
      summary: `Configuration template (${declaration.configFormat}) requires a format-aware/manual application step; the manager will not overwrite user configuration.` };
  }

  if (strategy === "lua") {
    if (files.length || !lua.length) throw new Error("Lua deployment must contain Lua modules only.");
    for (const item of lua) entries.push({ source: item.source, target: normalizeSafeRelativePath("modules/" + item.moduleName), sha256: item.sha256, adapter: "lua" });
    return { strategy, automatedEntries: entries, manualEntries, manualSteps, summary: "Lua modules are deployed into the Sider modules folder and remain separately registered through the Sider manager." };
  }

  if (strategy === "livecpk" && lua.length) throw new Error("LiveCPK packages cannot declare Lua modules.");
  if (strategy === "direct" && lua.length) throw new Error("Direct-file packages cannot declare Lua modules.");

  for (const item of files) {
    const target = normalizeSafeRelativePath(item.target);
    const isLiveCpk = /^LiveCPK\//i.test(target);
    if (strategy === "livecpk" && !isLiveCpk) throw new Error(`LiveCPK adapter requires targets under LiveCPK/: ${target}`);
    if (strategy === "direct" && (isLiveCpk || /^modules\//i.test(target))) {
      throw new Error(`Direct-file adapter cannot own a LiveCPK or Sider modules target: ${target}`);
    }
    entries.push({ source: item.source, target, sha256: item.sha256, adapter: isLiveCpk ? "livecpk" : "direct" });
  }
  if (strategy === "auto") {
    for (const item of lua) entries.push({ source: item.source, target: normalizeSafeRelativePath("modules/" + item.moduleName), sha256: item.sha256, adapter: "lua" });
  }
  if (!entries.length) throw new Error("Deployment plan contains no automatically deployable files.");
  return {
    strategy, automatedEntries: entries, manualEntries, manualSteps,
    summary: strategy === "auto"
      ? "Automatically routes declared game files to direct/LiveCPK deployment and Lua files to Sider modules."
      : strategy === "livecpk" ? "Deploys only into the declared LiveCPK tree."
      : "Deploys declared game files directly with transaction backups and ownership tracking."
  };
}
