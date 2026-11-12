import { analyzeSiderPitchLog } from "../tools/sider-pitch-log.mjs";
import { describe, it, expect } from "vitest";


describe("Sider pitch log analyzer", () => {
  it("extracts pitch paths, counts occurrences and preserves raw evidence", () => {
    const log = [
      "[LiveCPK] loaded common\\bg\\model\\bg\\pitch\\grass.dds",
      "[LiveCPK] ERROR: file not found common/bg/model/bg/pitch/grass_n.dds",
      "[LiveCPK] reading common/bg/model/bg/pitch/grass.dds",
      "unrelated stadium line"
    ].join("\r\n");
    const report = analyzeSiderPitchLog(log);
    expect(report.totalLines).toBe(4);
    expect(report.matchedLines).toBe(3);
    expect(report.uniqueResources).toBe(2);
    expect(report.issueLines).toBe(1);
    expect(report.positiveLines).toBe(2);
    expect(report.references.find(item => item.path.endsWith("grass.dds"))?.occurrences).toBe(2);
    expect(report.evidence[1].classification).toBe("issue");
    expect(report.evidence[1].text).toContain("file not found");
  });
  it("does not claim success when no pitch paths appear", () => {
    const report = analyzeSiderPitchLog("Sider started\nPES process attached\n");
    expect(report.uniqueResources).toBe(0);
    expect(report.positiveLines).toBe(0);
    expect(report.limitations.length).toBeGreaterThan(0);
  });
  it("caps scanning and reports truncation", () => {
    const report = analyzeSiderPitchLog(Array.from({length: 100002}, () => "ordinary log line").join("\n"));
    expect(report.scannedLines).toBe(100000);
    expect(report.truncated).toBe(true);
  });
});
