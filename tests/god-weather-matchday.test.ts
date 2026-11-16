import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const root = path.resolve("content/packs");
const profiles = [
  { folder: "GOD-WEATHER-FINE-DAY", id: "thegodmods.god-weather-fine-day", values: [0, 0, 0] },
  { folder: "GOD-WEATHER-RAIN-DAY", id: "thegodmods.god-weather-rain-day", values: [0, 1, 0] },
  { folder: "GOD-WEATHER-RAIN-NIGHT", id: "thegodmods.god-weather-rain-night", values: [1, 1, 0] },
  { folder: "GOD-MATCHDAY-WINTER-NIGHT", id: "thegodmods.god-matchday-winter-night", values: [1, 0, 1] }
];

describe("GOD WEATHER and GOD MATCHDAY Sider profiles", () => {
  it("builds four original PES 2017 / Sider 3.5 condition packages", async () => {
    await run(process.execPath, [path.resolve("tools/build-pes2017-modules.mjs")]);
    for (const profile of profiles) {
      const base = path.join(root, profile.folder);
      const manifest = JSON.parse(await readFile(path.join(base, "module.json"), "utf8"));
      expect(manifest.id).toBe(profile.id);
      expect(manifest.category).toBe("stadiums");
      expect(manifest.game.sider).toBe(">=3.5.0 <4.0.0");
      expect(manifest.conflicts).toHaveLength(6);
      const luaFile = manifest.files.find((file: { target: string }) => file.target.endsWith(".lua"));
      const iniFile = manifest.files.find((file: { target: string }) => file.target.endsWith("stadium.ini"));
      const lua = await readFile(path.join(base, luaFile.source), "utf8");
      const ini = await readFile(path.join(base, iniFile.source), "utf8");
      expect(lua).toContain('ctx.register("set_conditions", apply)');
      expect(lua).toContain('ctx.register("set_conditions_for_replay", apply)');
      expect(lua).toContain("changed.weather = settings.weather");
      expect(lua).toContain("changed.season = settings.season");
      expect(ini).toMatch(new RegExp("timeofday = " + profile.values[0]));
      expect(ini).toMatch(new RegExp("weather = " + profile.values[1]));
      expect(ini).toMatch(new RegExp("season = " + profile.values[2]));
    }
  });
});
