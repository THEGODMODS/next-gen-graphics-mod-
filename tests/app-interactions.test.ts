import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ts from "typescript";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const jsxButtons = (source: string) => {
  const file = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons: Array<{ line: number; hasClick: boolean }> = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName) && node.tagName.text.toLowerCase() === "button") {
        buttons.push({
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          hasClick: node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "onClick")
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return buttons;
};

describe("GODMODS Manager interaction contract", () => {
  it("gives every App button an explicit click action", () => {
    const buttons = jsxButtons(read("../src/App.tsx"));
    expect(buttons.length).toBeGreaterThan(25);
    expect(buttons.filter(button => !button.hasClick), "Buttons without click handlers (line numbers)").toEqual([]);
  });

  it("gives every department catalogue button an explicit click action", () => {
    const buttons = jsxButtons(read("../src/components/DepartmentCatalogue.tsx"));
    expect(buttons.length).toBeGreaterThan(4);
    expect(buttons.filter(button => !button.hasClick)).toEqual([]);
  });

  it("keeps all navigation destinations represented by real page routes", () => {
    const source = read("../src/App.tsx");
    for (const label of ["Overview", "Graphics", "Stadiums & Turf", "Kits & Equipment", "Players", "Audio & Atmosphere", "Gameplay", "Modules", "Profiles", "Backups", "Diagnostics", "Settings"]) {
      expect(source).toContain(`label: "${label}"`);
    }
    for (const route of ['active === "Settings"', 'active === "Diagnostics"', 'active === "Modules"', 'active === "Profiles"', 'active === "Backups"']) expect(source).toContain(route);
  });

  it("keeps every preload IPC invocation backed by a main-process handler", () => {
    const preload = read("../electron/preload.ts");
    const main = read("../electron/main.ts");
    const invocations = [...preload.matchAll(/ipcRenderer\.invoke\("([^"]+)"/g)].map(match => match[1]);
    const handlers = new Set([...main.matchAll(/ipcMain\.handle\("([^"]+)"/g)].map(match => match[1]));
    expect(invocations.length).toBeGreaterThan(10);
    expect(invocations.filter(channel => !handlers.has(channel))).toEqual([]);
  });

  it("keeps synchronous filesystem calls out of Electron startup and status", () => {
    const main = read("../electron/main.ts");
    expect(main).not.toMatch(/\b(?:existsSync|readFileSync|writeFileSync|statSync|readdirSync)\b/);
    expect(main).toContain("async function getStatus()");
    expect(main).toContain('mainWindow.once("ready-to-show"');
  });
});
