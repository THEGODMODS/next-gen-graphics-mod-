import { describe, expect, it } from "vitest";
import { evaluateContentRelease, type ContentReleaseCandidate } from "../src/catalogue/release-gates";

const validCandidate: ContentReleaseCandidate = {
  schemaVersion: 1, id: "thegodmods.god-turf", version: "1.0.0", department: "stadiums",
  ownership: "thegodmods-original", title: "GOD TURF", publisher: "THEGODMODS",
  author: "THEGODMODS Studio", licenseId: "THEGODMODS-ORIGINAL-1.0",
  redistributionAllowed: true, sourceAttribution: "Original THEGODMODS-created assets.",
  game: { title: "PES 2017", executable: ["PES2017.exe"], patchVersions: ["Smoke-test patch 1"], siderRange: ">=3.5.0 <4.0.0" },
  deployment: "livecpk",
  package: { downloadUrl: "https://packages.example.test/god-turf-1.0.0.zip", archiveSize: 1024,
    archiveSha256: "a".repeat(64), signatureKeyId: "thegodmods-release-2026" },
  evidence: {
    manifestValidated: true, payloadHashesVerified: true,
    windowsCiRunUrl: "https://github.com/THEGODMODS/next-gen-graphics-mod-/actions/runs/1",
    automatedTestsPassed: true, rollbackTested: true,
    realGame: { status: "passed", testedAt: "2026-11-13T00:00:00.000Z",
      gameBuild: "PES 2017 test build", siderVersion: "3.5.0", tester: "QA tester",
      evidenceUrl: "https://evidence.example.test/god-turf" },
  },
};

describe("curated content release gates", () => {
  it("allows verified status only when every release gate has evidence", () => {
    expect(evaluateContentRelease(validCandidate)).toEqual({ eligible: true, state: "verified", blockers: [] });
  });
  it("keeps a release automated-ready but not verified without a real game test", () => {
    const candidate = structuredClone(validCandidate);
    candidate.evidence.realGame.status = "pending";
    const result = evaluateContentRelease(candidate);
    expect(result.eligible).toBe(false);
    expect(result.state).toBe("automated-ready");
    expect(result.blockers).toContain("A successful real PES 2017 game test is required for verified status.");
  });
  it("blocks releases without redistribution permission or attribution", () => {
    const candidate = structuredClone(validCandidate);
    candidate.redistributionAllowed = false;
    candidate.sourceAttribution = "";
    const result = evaluateContentRelease(candidate);
    expect(result.state).toBe("blocked");
    expect(result.blockers).toContain("Explicit redistribution permission is required.");
    expect(result.blockers).toContain("Source and attribution details are required.");
  });
  it("rejects insecure package URLs and malformed archive digests", () => {
    const candidate = structuredClone(validCandidate);
    candidate.package.downloadUrl = "http://packages.example.test/mod.zip";
    candidate.package.archiveSha256 = "not-a-digest";
    const result = evaluateContentRelease(candidate);
    expect(result.state).toBe("blocked");
    expect(result.blockers).toContain("Package URL must be HTTPS without credentials or a fragment.");
    expect(result.blockers).toContain("A lowercase SHA-256 archive digest is required.");
  });
  it("does not accept caller-supplied verified labels or wrong-game compatibility", () => {
    const candidate = { ...structuredClone(validCandidate), verificationState: "verified",
      game: { ...validCandidate.game, title: "PES 2021" } };
    const result = evaluateContentRelease(candidate);
    expect(result.eligible).toBe(false);
    expect(result.state).toBe("blocked");
    expect(result.blockers).toContain("Only PES 2017-targeted releases are accepted.");
  });
  it("blocks a release when real-game validation failed", () => {
    const candidate = structuredClone(validCandidate);
    candidate.evidence.realGame.status = "failed";
    const result = evaluateContentRelease(candidate);
    expect(result.eligible).toBe(false);
    expect(result.state).toBe("blocked");
    expect(result.blockers).toContain("Real PES 2017 game validation failed; the release is blocked.");
  });
  it("requires a recorded game build, Sider version, tester and evidence URL", () => {
    const candidate = structuredClone(validCandidate);
    candidate.evidence.realGame = { status: "passed", testedAt: "", gameBuild: "",
      siderVersion: "", tester: "", evidenceUrl: "" };
    const result = evaluateContentRelease(candidate);
    expect(result.eligible).toBe(false);
    expect(result.state).toBe("blocked");
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
