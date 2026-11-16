import { describe, expect, it } from "vitest";
const validateIntegrationEvidence = async (evidence) => {
  const gate = await import("../tools/godmods-integration-gate.mjs");
  return gate.validateIntegrationEvidence(evidence);
};

const hash = "a".repeat(64);
const file = (name) => ({ path: "evidence/" + name, sha256: hash });
const safety = () => ({ originalsUntouched: true, backupPath: "backups/originals.zip", disableProcedure: "Disable the GODMODS route and restore the recorded backup", rollbackTested: true });
const resource = (name) => ({
  resourceId: name, targetPath: "GODMODS/" + name + "/asset.dds",
  materialRole: "verified material role", uvSet: "UV0 inspected", mappingMethod: "installed resource inventory cross-check",
  sourceSha256: hash, targetSha256: hash, uvEvidence: file(name + "-uv.png"),
  capture: file(name + "-capture.png"), formatVerified: true, inGameAppearancePassed: true, safety: safety()
});
const validEvidence = () => ({
  schemaVersion: 1, kind: "godmods-pes2017-integration-evidence",
  target: { gameBuild: "PES 2017 exact build", patchName: "YosfX", patchVersion: "installed version", siderVersion: "3.5", executableSha256: hash },
  audio: { routes: [{
    source: file("audio.wav"), eventId: "installed-event-id", eventEvidence: "verified against installed event map",
    teamOrCompetitionId: "installed-team-id", peak: 0.8, rms: 0.2, commentaryMixReviewed: true,
    loopBoundaryReviewed: true, capture: file("audio-match.png"), inGamePlaybackPassed: true, safety: safety()
  }] },
  gameplay: { runs: [1, 2, 3].map(repeatIndex => ({
    scenarioId: "controlled-match", matchId: "match-" + repeatIndex, fullMatchCompleted: true,
    durationMinutes: 90, repeatIndex, metrics: { fouls: 18 + repeatIndex, shots: 10 + repeatIndex },
    matchLog: file("match-" + repeatIndex + ".log"), capture: file("match-" + repeatIndex + ".png"), stabilityPassed: true
  })), rollbackTested: true },
  graphics: {
    hostName: "verified host", hostVersion: "recorded version", inputPrimaries: "BT.709", inputTransfer: "BT.1886",
    outputPrimaries: "BT.709", outputTransfer: "BT.1886", adapterEvidence: file("graphics-adapter.json"),
    inGameCapture: file("graphics-match.png"), colourPipelinePassed: true, profileConflictTested: true, safety: safety()
  },
  mappings: {
    stadiumsTurf: [resource("pitch")], kitsEquipment: [resource("kit")], playersFaces: [resource("face")]
  },
  crossDepartment: { interactionTestsPassed: true, performanceReviewPassed: true, testReport: file("cross-department.json"), safety: safety() }
});

describe("GODMODS final integration evidence gate", () => {
  it("accepts a complete evidence set without authorizing deployment", async () => {
    const report = await validateIntegrationEvidence(validEvidence());
    expect(report.status).toBe("integration-evidence-valid");
    expect(report.inGameEvidenceComplete).toBe(true);
    expect(report.inGameVerified).toBe(false);
    expect(report.deploymentAuthorized).toBe(false);
    expect(report.coverage.gameplayFullMatchRuns).toBe(3);
  });
  it("blocks guessed or missing target and resource bindings", async () => {
    const evidence = validEvidence();
    evidence.target.executableSha256 = "not-a-hash";
    evidence.mappings.stadiumsTurf[0].targetPath = "../../original.dds";
    evidence.audio.routes[0].eventEvidence = "";
    const report = await validateIntegrationEvidence(evidence);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("target.executableSha256 must be a SHA-256 digest");
    expect(report.issues).toContain("mappings.stadiumsTurf[0].targetPath must be a safe relative path");
    expect(report.issues).toContain("audio.routes[0] must identify the exact event and evidence");
  });
  it("requires repeatable full-match evidence, a colour-managed host and tested rollback", async () => {
    const evidence = validEvidence();
    evidence.gameplay.runs.pop();
    evidence.graphics.inputTransfer = "";
    evidence.graphics.safety.rollbackTested = false;
    const report = validateIntegrationEvidence(evidence);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("gameplay.runs must contain at least three repeatable full-match runs");
    expect(report.issues).toContain("graphics.inputTransfer must be explicitly declared");
    expect(report.issues).toContain("graphics.safety.rollbackTested must be true");
  });
});
