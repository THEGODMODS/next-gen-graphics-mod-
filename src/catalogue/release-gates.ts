import type { DepartmentId } from "./departments";

export type ContentOwnership = "thegodmods-original" | "third-party";
export type DeploymentStrategy = "direct" | "livecpk" | "lua" | "configuration" | "manual-assisted";
export type GameValidationStatus = "passed" | "pending" | "failed";

export interface ContentReleaseCandidate {
  schemaVersion: 1;
  id: string;
  version: string;
  department: DepartmentId;
  ownership: ContentOwnership;
  title: string;
  publisher: string;
  author: string;
  licenseId: string;
  redistributionAllowed: boolean;
  sourceAttribution: string;
  game: { title: "PES 2017"; executable: string[]; patchVersions: string[]; siderRange: string };
  deployment: DeploymentStrategy;
  package: { downloadUrl: string; archiveSize: number; archiveSha256: string; signatureKeyId: string };
  evidence: {
    manifestValidated: boolean;
    payloadHashesVerified: boolean;
    windowsCiRunUrl: string;
    automatedTestsPassed: boolean;
    rollbackTested: boolean;
    realGame: {
      status: GameValidationStatus;
      testedAt: string;
      gameBuild: string;
      siderVersion: string;
      tester: string;
      evidenceUrl: string;
    };
  };
}

export interface ReleaseGateResult {
  eligible: boolean;
  state: "blocked" | "automated-ready" | "verified";
  blockers: string[];
}

const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const digestPattern = /^[a-f0-9]{64}$/;
const strategies = new Set<DeploymentStrategy>(["direct", "livecpk", "lua", "configuration", "manual-assisted"]);
const departments = new Set<DepartmentId>(["graphics", "stadiums", "kits", "players", "audio", "gameplay"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validHttpsUrl(value: unknown): value is string {
  if (!nonEmpty(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

/** Derives release state from evidence; never trusts a caller-supplied verified label. */
export function evaluateContentRelease(input: unknown): ReleaseGateResult {
  const blockers: string[] = [];
  if (!isRecord(input)) return { eligible: false, state: "blocked", blockers: ["Release candidate must be an object."] };

  const add = (condition: boolean, message: string) => { if (!condition) blockers.push(message); };
  add(input.schemaVersion === 1, "schemaVersion must be 1.");
  add(typeof input.id === "string" && idPattern.test(input.id), "A stable namespaced package ID is required.");
  add(typeof input.version === "string" && semverPattern.test(input.version), "A semantic package version is required.");
  add(typeof input.department === "string" && departments.has(input.department as DepartmentId), "A supported department is required.");
  add(input.ownership === "thegodmods-original" || input.ownership === "third-party", "Ownership lane must be explicit.");
  add(nonEmpty(input.title), "Release title is required.");
  add(nonEmpty(input.publisher), "Publisher identity is required.");
  add(nonEmpty(input.author), "Author identity is required.");
  add(nonEmpty(input.licenseId), "A license identifier is required.");
  add(input.redistributionAllowed === true, "Explicit redistribution permission is required.");
  add(nonEmpty(input.sourceAttribution), "Source and attribution details are required.");

  const game = input.game;
  add(isRecord(game), "PES 2017 compatibility declaration is required.");
  if (isRecord(game)) {
    add(game.title === "PES 2017", "Only PES 2017-targeted releases are accepted.");
    add(Array.isArray(game.executable) && game.executable.length > 0 &&
      game.executable.every(name => typeof name === "string" && /^[A-Za-z0-9_.-]+\.exe$/i.test(name)),
      "Supported PES 2017 executable filenames are required.");
    add(Array.isArray(game.patchVersions) && game.patchVersions.length > 0 &&
      game.patchVersions.every(nonEmpty), "At least one explicitly tested patch/data-pack version is required.");
    add(nonEmpty(game.siderRange), "A Sider version range is required.");
  }

  add(typeof input.deployment === "string" && strategies.has(input.deployment as DeploymentStrategy),
    "A supported deployment strategy is required.");

  const pkg = input.package;
  add(isRecord(pkg), "Immutable package metadata is required.");
  if (isRecord(pkg)) {
    add(validHttpsUrl(pkg.downloadUrl), "Package URL must be HTTPS without credentials or a fragment.");
    add(Number.isSafeInteger(pkg.archiveSize) && Number(pkg.archiveSize) > 0, "Exact positive archive size is required.");
    add(typeof pkg.archiveSha256 === "string" && digestPattern.test(pkg.archiveSha256),
      "A lowercase SHA-256 archive digest is required.");
    add(nonEmpty(pkg.signatureKeyId), "A trusted release-signing key ID is required.");
  }

  const evidence = input.evidence;
  add(isRecord(evidence), "Quality evidence is required.");
  if (isRecord(evidence)) {
    add(evidence.manifestValidated === true, "Manifest validation has not passed.");
    add(evidence.payloadHashesVerified === true, "Payload hash verification has not passed.");
    add(validHttpsUrl(evidence.windowsCiRunUrl), "A Windows CI run URL is required.");
    add(evidence.automatedTestsPassed === true, "Automated tests have not passed.");
    add(evidence.rollbackTested === true, "Install rollback testing has not passed.");

    const realGame = evidence.realGame;
    add(isRecord(realGame), "Real-game validation evidence is required.");
    if (isRecord(realGame)) {
      add(realGame.status === "passed" || realGame.status === "pending" || realGame.status === "failed",
        "Real-game validation status is invalid.");
      if (realGame.status === "pending") blockers.push("A successful real PES 2017 game test is required for verified status.");
      if (realGame.status === "failed") blockers.push("Real PES 2017 game validation failed; the release is blocked.");
      if (realGame.status === "passed") {
        add(nonEmpty(realGame.testedAt) && !Number.isNaN(Date.parse(String(realGame.testedAt))),
          "A valid real-game test timestamp is required.");
        add(nonEmpty(realGame.gameBuild), "The tested PES 2017 build must be recorded.");
        add(nonEmpty(realGame.siderVersion), "The tested Sider version must be recorded.");
        add(nonEmpty(realGame.tester), "The tester identity must be recorded.");
        add(validHttpsUrl(realGame.evidenceUrl), "A real-game evidence URL is required.");
      }
    }
  }

  const automatedBlockers = blockers.filter(message => !message.startsWith("A successful real PES 2017 game test"));
  const automatedReady = automatedBlockers.length === 0;
  const verified = automatedReady && isRecord(evidence) && isRecord(evidence.realGame) && evidence.realGame.status === "passed";
  return {
    eligible: verified,
    state: verified ? "verified" : automatedReady ? "automated-ready" : "blocked",
    blockers: [...new Set(blockers)],
  };
}
