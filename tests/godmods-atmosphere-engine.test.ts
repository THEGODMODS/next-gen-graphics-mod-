import { describe, expect, it } from "vitest";
import { buildAtmosphereModule } from "../tools/godmods-atmosphere-engine.mjs";

describe("GOD ATMOSPHERE premium crowd engine", () => {
  const lua = buildAtmosphereModule("GOD ATMOSPHERE — Premium Crowd", "GOD-ATMOSPHERE-MATCHDAY");

  it("uses only documented Sider audio methods and team setup notifications", () => {
    expect(lua).toContain("audio.new(");
    expect(lua).toContain(":set_volume(");
    expect(lua).toContain(":when_done(");
    expect(lua).toContain(":finish()");
    expect(lua).toContain('ctx.register("set_home_team"');
    expect(lua).toContain('ctx.register("set_away_team"');
    expect(lua).not.toMatch(/goal_scored|half_time|match_end|memory\.write|addr\s*=/i);
  });

  it("ships four allow-listed premium beds and optional secondary texture", () => {
    for (const bed of ["stadium-open-air", "stadium-intimate", "stadium-night", "stadium-cup-final"]) {
      expect(lua).toContain(bed);
    }
    expect(lua).toContain('texture = "none"');
    expect(lua).toContain("duplicate texture bed disabled");
    expect(lua).toContain("base_loop.filename ~= settings.bed");
  });

  it("is disabled by default and validates all editable controls", () => {
    expect(lua).toContain("enabled = 0");
    expect(lua).toContain("next_settings = { enabled = 0");
    expect(lua).toContain("value >= 0 and value <= 1");
    expect(lua).toContain("value >= 0 and value <= 3");
    expect(lua).toContain("valid_bed(raw, false)");
    expect(lua).toContain("valid_bed(raw, true)");
    expect(lua).toContain("intensity_scale");
  });

  it("restarts completed loops but prevents stale callbacks from reviving stopped audio", () => {
    expect(lua).toContain("if slot.sound == sound then");
    expect(lua).toContain("slot.sound = nil");
    expect(lua).toContain("if sound then sound:finish() end");
    expect(lua).toContain("if settings.enabled == 0 or settings.ambience == 0 then stop_loop(base_loop); stop_loop(texture_loop); return end");
  });
});
