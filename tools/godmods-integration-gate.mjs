#!/usr/bin/env node
// Final evidence gate for real PES 2017 / YosfX integration.
// It validates submitted evidence; it never edits game files or authorizes deployment.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const nonEmpty = value => typeof value === "string" && value.trim().length > 0;
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const safeRelative = value => nonEmpty(value) && !path.isAbsolute(value) &&
  !/^[A-Za-z]:/.test(value) &&
  !value.replaceAll(String.fromCharCode(92), "/").split("/").some(part => !part || part === "." || part === "..");
const issues = [];
const requireEvidence = (condition, message) => { if (!condition) issues.push(message); };

function requireFileEvidence(item, label) {
  requireEvidence(item && safeRelative(item.path), label + ".path must be a safe relative evidence path");
  requireEvidence(item && digest(item.sha256), label + ".sha256 must be a SHA-256 digest");
}
function requireRollback(safety, label) {
  requireEvidence(safety?.originalsUntouched === true, label + ".originalsUntouched must be true");
  requireEvidence(safeRelative(safety?.backupPath), label + ".backupPath must identify a safe backup location");
  requireEvidence(safety?.disableProcedure && nonEmpty(safety.disableProcedure), label + ".disableProcedure must be documented");
  requireEvidence(safety?.rollbackTested === true, label + ".rollbackTested must be true");
}
function validateResourceRows(rows, label) {
  requireEvidence(Array.isArray(rows) && rows.length > 0, label + " must contain at least one inspected resource mapping");
  for (const [index, row] of (rows || []).entries()) {
    const prefix = label + "[" + index + "]";
    for (const key of ["resourceId", "targetPath", "materialRole", "uvSet", "mappingMethod"]) {
      requireEvidence(nonEmpty(row?.[key]), prefix + "." + key + " must be recorded from the installed target");
    }
    requireEvidence(safeRelative(row?.targetPath), prefix + ".targetPath must be a safe relative path");
    requireEvidence(digest(row?.sourceSha256), prefix + ".sourceSha256 must be a SHA-256 digest");
    requireEvidence(digest(row?.targetSha256), prefix + ".targetSha256 must be a SHA-256 digest");
    requireFileEvidence(row?.uvEvidence, prefix + ".uvEvidence");
    requireFileEvidence(row?.capture, prefix + ".capture");
    requireEvidence(row?.formatVerified === true, prefix + ".formatVerified must be true");
    requireEvidence(row?.inGameAppearancePassed === true, prefix + ".inGameAppearancePassed must be true");
    requireRollback(row?.safety, prefix + ".safety");
  }
}
export function validateIntegrationEvidence(evidence) {
  issues.length = 0;
  requireEvidence(evidence?.schemaVersion === 1, "schemaVersion must be 1");
  requireEvidence(evidence?.kind === "godmods-pes2017-integration-evidence", "kind must be godmods-pes2017-integration-evidence");
  const target = evidence?.target || {};
  for (const key of ["gameBuild", "patchName", "patchVersion", "siderVersion", "executableSha256"]) {
    requireEvidence(nonEmpty(target[key]), "target." + key + " must identify the exact tested installation");
  }
  requireEvidence(digest(target.executableSha256), "target.executableSha256 must be a SHA-256 digest");

  const audio = evidence?.audio || {};
  requireEvidence(Array.isArray(audio.routes) && audio.routes.length > 0, "audio.routes must contain inspected event routes");
  for (const [i, route] of (audio.routes || []).entries()) {
    const p = "audio.routes[" + i + "]";
    requireFileEvidence(route?.source, p + ".source");
    requireEvidence(nonEmpty(route?.eventId) && nonEmpty(route?.eventEvidence), p + " must identify the exact event and evidence");
    requireEvidence(nonEmpty(route?.teamOrCompetitionId), p + ".teamOrCompetitionId must use the installed patch identifier");
    requireEvidence(Number.isFinite(route?.peak) && route.peak >= 0 && route.peak <= 1, p + ".peak must be a measured normalized peak");
    requireEvidence(Number.isFinite(route?.rms) && route.rms >= 0 && route.rms <= 1, p + ".rms must be a measured normalized RMS");
    requireEvidence(route?.commentaryMixReviewed === true, p + ".commentaryMixReviewed must be true");
    requireEvidence(route?.loopBoundaryReviewed === true, p + ".loopBoundaryReviewed must be true");
    requireFileEvidence(route?.capture, p + ".capture");
    requireEvidence(route?.inGamePlaybackPassed === true, p + ".inGamePlaybackPassed must be true");
    requireRollback(route?.safety, p + ".safety");
  }

  const gameplay = evidence?.gameplay || {};
  const runs = Array.isArray(gameplay.runs) ? gameplay.runs : [];
  requireEvidence(runs.length >= 3, "gameplay.runs must contain at least three repeatable full-match runs");
  const scenarioIds = new Set();
  for (const [i, run] of runs.entries()) {
    const p = "gameplay.runs[" + i + "]";
    requireEvidence(nonEmpty(run?.scenarioId) && nonEmpty(run?.matchId), p + " must identify the scenario and match");
    if (nonEmpty(run?.scenarioId)) scenarioIds.add(run.scenarioId);
    requireEvidence(run?.fullMatchCompleted === true, p + ".fullMatchCompleted must be true");
    requireEvidence(Number.isFinite(run?.durationMinutes) && run.durationMinutes >= 5, p + ".durationMinutes must record a completed match");
    requireEvidence(Number.isInteger(run?.repeatIndex) && run.repeatIndex >= 1, p + ".repeatIndex must be a positive integer");
    requireEvidence(run?.metrics && Object.keys(run.metrics).length >= 2 && Object.values(run.metrics).every(Number.isFinite), p + ".metrics must contain at least two numeric measured outcomes");
    requireFileEvidence(run?.matchLog, p + ".matchLog");
    requireFileEvidence(run?.capture, p + ".capture");
    requireEvidence(run?.stabilityPassed === true, p + ".stabilityPassed must be true");
  }
  requireEvidence(scenarioIds.size > 0, "gameplay must include a repeatable scenario identifier");
  requireEvidence(gameplay.rollbackTested === true, "gameplay.rollbackTested must be true");

  const graphics = evidence?.graphics || {};
  for (const key of ["hostName", "hostVersion", "inputPrimaries", "inputTransfer", "outputPrimaries", "outputTransfer"]) {
    requireEvidence(nonEmpty(graphics[key]), "graphics." + key + " must be explicitly declared");
  }
  requireFileEvidence(graphics.adapterEvidence, "graphics.adapterEvidence");
  requireFileEvidence(graphics.inGameCapture, "graphics.inGameCapture");
  requireEvidence(graphics.colourPipelinePassed === true, "graphics.colourPipelinePassed must be true");
  requireEvidence(graphics.profileConflictTested === true, "graphics.profileConflictTested must be true");
  requireRollback(graphics.safety, "graphics.safety");

  const mappings = evidence?.mappings || {};
  for (const department of ["stadiumsTurf", "kitsEquipment", "playersFaces"]) {
    validateResourceRows(mappings[department], "mappings." + department);
  }
  requireEvidence(evidence?.crossDepartment?.interactionTestsPassed === true, "crossDepartment.interactionTestsPassed must be true");
  requireEvidence(evidence?.crossDepartment?.performanceReviewPassed === true, "crossDepartment.performanceReviewPassed must be true");
  requireFileEvidence(evidence?.crossDepartment?.testReport, "crossDepartment.testReport");
  requireRollback(evidence?.crossDepartment?.safety, "crossDepartment.safety");

  const valid = issues.length === 0;
  return {
    schemaVersion: 1,
    product: "GODMODS final PES 2017 integration gate",
    status: valid ? "integration-evidence-valid" : "blocked",
    evidenceValid: valid,
    deploymentAuthorized: false,
    inGameVerified: valid,
    target: {
      gameBuild: target.gameBuild || null,
      patch: [target.patchName, target.patchVersion].filter(nonEmpty).join(" ") || null,
      siderVersion: target.siderVersion || null
    },
    coverage: {
      audioRoutes: audio.routes?.length || 0,
      gameplayFullMatchRuns: runs.length,
      gameplayScenarios: scenarioIds.size,
      stadiumTurfMappings: mappings.stadiumsTurf?.length || 0,
      kitEquipmentMappings: mappings.kitsEquipment?.length || 0,
      playerFaceMappings: mappings.playersFaces?.length || 0,
      graphicsHost: nonEmpty(graphics.hostName)
    },
    issues: [...issues]
  };
}

async function main(args) {
  const input = args[0];
  if (!input) throw new Error("Usage: node tools/godmods-integration-gate.mjs <integration-evidence.json>");
  const evidence = JSON.parse(await readFile(path.resolve(input), "utf8"));
  const report = validateIntegrationEvidence(evidence);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.evidenceValid) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error); process.exitCode = 1; });
}
