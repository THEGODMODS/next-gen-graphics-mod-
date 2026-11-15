import { describe, expect, it } from "vitest";
import { runGodmodsFinalRegression } from "../tools/godmods-final-regression.mjs";
describe("GODMODS final cross-department regression",()=>{
 it("passes source QA while honestly holding game compatibility and release gates open",async()=>{
  const report=await runGodmodsFinalRegression();
  expect(report.sourceQaPassed).toBe(true);
  expect(report.status).toBe("source-qa-passed-game-integration-pending");
  expect(report.gameCompatibilityVerified).toBe(false);
  expect(report.releaseReady).toBe(false);
  expect(report.departments).toHaveLength(7);
  expect(report.blockers.length).toBeGreaterThanOrEqual(5);
 },120000);
});
