import { describe, expect, it } from "vitest";
import { departments } from "../src/catalogue/departments";

describe("department catalogue foundation", () => {
  it("defines all six first-class departments exactly once", () => {
    expect(departments.map(item => item.id)).toEqual(["graphics", "stadiums", "kits", "players", "audio", "gameplay"]);
    expect(new Set(departments.map(item => item.id)).size).toBe(6);
  });

  it("gives every department subcategories and an Originals / Third-Party lane", () => {
    for (const department of departments) {
      expect(department.subcategories.length, department.id + " subcategories").toBeGreaterThan(0);
      expect(department.originals.length, department.id + " Originals").toBeGreaterThan(0);
      expect(department.thirdParty.length, department.id + " third-party sources").toBeGreaterThan(0);
    }
  });

  it("keeps external source IDs within the supported IPC allowlist", () => {
    const supported = new Set(["pesmodding", "moddingway", "nexus", "profacemods", "gfx-pitch-2026", "gfx-combined-2025", "pesfiles-graphics"]);
    for (const department of departments) {
      for (const source of department.thirdParty) expect(supported.has(source.id), source.name).toBe(true);
    }
  });

  it("labels original projects as concepts or active tooling, never as installable packages", () => {
    for (const department of departments) {
      for (const project of department.originals) {
        expect(project.status === "studio-planned" || project.status === "in-development").toBe(true);
        expect(project.focus.length).toBeGreaterThan(20);
      }
    }
  });
});
