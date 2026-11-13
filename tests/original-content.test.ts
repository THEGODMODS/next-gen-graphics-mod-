import { describe, expect, it } from "vitest";
import { departments } from "../src/catalogue/departments";
import { getOriginalContentProject, originalContentProjects } from "../src/catalogue/original-content";

describe("THEGODMODS original content library", () => {
  it("defines production briefs for every original product line", () => {
    const originals = departments.flatMap(department => department.originals.map(project => ({ ...project, department: department.id })));
    expect(originalContentProjects).toHaveLength(originals.length);
    for (const original of originals) {
      const brief = getOriginalContentProject(original.name);
      expect(brief, original.name).toBeDefined();
      expect(brief?.department).toBe(original.department);
      expect(brief?.deliverables.length).toBeGreaterThan(0);
      expect(brief?.assetRequirements.length).toBeGreaterThan(0);
      expect(brief?.acceptanceChecks.length).toBeGreaterThan(0);
      expect(brief?.rightsPolicy.length).toBeGreaterThan(20);
      expect(brief?.previewPlan.length).toBeGreaterThan(0);
    }
  });

  it("covers all six departments and unique package identities", () => {
    expect(new Set(originalContentProjects.map(project => project.department))).toEqual(
      new Set(["graphics", "stadiums", "kits", "players", "audio", "gameplay"])
    );
    expect(new Set(originalContentProjects.map(project => project.id)).size).toBe(originalContentProjects.length);
  });

  it("does not label briefs as released content", () => {
    expect(originalContentProjects.every(project => project.productionState !== ("released" as string))).toBe(true);
    expect(originalContentProjects.find(project => project.name === "GOD PITCH LAB")?.productionState).toBe("tooling-prototype");
  });
});
