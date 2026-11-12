const PITCH_PATH = /common[\\/]+bg[\\/]+model[\\/]+bg[\\/]+pitch(?:[\\/]+[^\s"'<>|,;)]*)?/ig;
const MAX_LINES = 100000;
function classify(line) {
  if (/\b(not found|missing|failed|failure|error|cannot open|unable to|does not exist)\b/i.test(line)) return "issue";
  if (/\b(loaded|opened|replaced|found|reading|read file|success)\b/i.test(line)) return "positive";
  return "unclassified";
}
function analyzeSiderPitchLog(content) {
  if (typeof content !== "string") throw new TypeError("Sider log content must be text.");
  const lines = content.split(/\r?\n/);
  const references = new Map();
  const evidence = [];
  let matchedLines = 0, issueLines = 0, positiveLines = 0;
  for (let index = 0; index < Math.min(lines.length, MAX_LINES); index++) {
    const line = lines[index];
    PITCH_PATH.lastIndex = 0;
    const matches = [...line.matchAll(PITCH_PATH)].map(match => match[0].replace(/\\/g, "/"));
    if (!matches.length) continue;
    matchedLines++;
    const classification = classify(line);
    if (classification === "issue") issueLines++;
    if (classification === "positive") positiveLines++;
    for (const resource of matches) {
      const key = resource.toLowerCase();
      const current = references.get(key) ?? { path: resource, occurrences: 0, issueOccurrences: 0, positiveOccurrences: 0 };
      current.occurrences++;
      if (classification === "issue") current.issueOccurrences++;
      if (classification === "positive") current.positiveOccurrences++;
      references.set(key, current);
    }
    if (evidence.length < 500) evidence.push({ line: index + 1, classification, text: line.slice(0, 600) });
  }
  const sorted = [...references.values()].sort((a, b) => b.occurrences - a.occurrences || a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    totalLines: lines.length,
    scannedLines: Math.min(lines.length, MAX_LINES),
    truncated: lines.length > MAX_LINES,
    matchedLines,
    uniqueResources: sorted.length,
    issueLines,
    positiveLines,
    references: sorted.slice(0, 1000),
    evidence,
    limitations: [
      "Only log lines containing the documented Stadium Server pitch subtree are reported.",
      "Positive and issue labels are keyword heuristics over raw log text, not proof of successful in-game rendering.",
      "A resource absent from this log may still be loaded through another path, another log, or a container."
    ]
  };
}

module.exports = { analyzeSiderPitchLog };
