export interface SiderPitchLogReport {
  schemaVersion: 1;
  totalLines: number;
  scannedLines: number;
  truncated: boolean;
  matchedLines: number;
  uniqueResources: number;
  issueLines: number;
  positiveLines: number;
  references: Array<{
    path: string;
    occurrences: number;
    issueOccurrences: number;
    positiveOccurrences: number;
  }>;
  evidence: Array<{
    line: number;
    classification: "issue" | "positive" | "unclassified";
    text: string;
  }>;
  limitations: string[];
}

export function analyzeSiderPitchLog(content: string): SiderPitchLogReport;
