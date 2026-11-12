export interface PitchLogReference { path: string; occurrences: number; issueOccurrences: number; positiveOccurrences: number; }
export interface PitchLogEvidence { line: number; classification: "issue" | "positive" | "unclassified"; text: string; }
export interface PitchLogReport {
 schemaVersion: 1; totalLines: number; scannedLines: number; truncated: boolean;
 matchedLines: number; uniqueResources: number; issueLines: number; positiveLines: number;
 references: PitchLogReference[]; evidence: PitchLogEvidence[]; limitations: string[];
}
export function analyzeSiderPitchLog(content: string): PitchLogReport;
