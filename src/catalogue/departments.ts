export type DepartmentId = "graphics" | "stadiums" | "kits" | "players" | "audio" | "gameplay";
export type CatalogueSourceId = "pesmodding" | "moddingway" | "nexus" | "profacemods" | "gfx-pitch-2026" | "gfx-combined-2025" | "pesfiles-graphics";

export interface CatalogueSource {
  id: CatalogueSourceId;
  name: string;
  focus: string;
  note: string;
  categories: string[];
}

export interface OriginalProject {
  name: string;
  focus: string;
  status: "studio-planned" | "in-development";
  categories: string[];
}

export interface DepartmentDefinition {
  id: DepartmentId;
  title: string;
  strapline: string;
  description: string;
  subcategories: string[];
  originals: OriginalProject[];
  thirdParty: CatalogueSource[];
}

export const departments: DepartmentDefinition[] = [
  {
    id: "graphics", title: "Graphics", strapline: "THE VISUAL ENGINE", description: "Build a complete visual identity for PES 2017: natural colour, lighting, weather, broadcast presentation and high-resolution texture work.",
    subcategories: ["Complete Graphics Overhauls", "eFootball-Inspired Visuals", "FC-Inspired Visuals", "Natural Colour & Realism", "Lighting & Weather", "Stadium Atmosphere", "Scoreboards & Broadcast", "Boots, Balls & Texture Packs"],
    originals: [
      { name: "GOD VISUALS", focus: "A THEGODMODS visual identity: balanced colour, realistic lighting and carefully tested texture replacements.", status: "studio-planned", categories: ["Complete Graphics Overhauls", "Natural Colour & Realism", "Lighting & Weather"] },
      { name: "GOD CINEMATIC", focus: "A cinematic presentation direction for matchday lighting, contrast and broadcast atmosphere.", status: "studio-planned", categories: ["Lighting & Weather", "Stadium Atmosphere", "Scoreboards & Broadcast"] },
      { name: "GOD NATURAL", focus: "A restrained, natural-colour graphics direction designed to avoid over-saturation.", status: "studio-planned", categories: ["Natural Colour & Realism", "Complete Graphics Overhauls"] }
    ],
    thirdParty: [
      { id: "pesmodding", name: "PES Modding", focus: "Graphics, patches and visual releases", note: "External creator catalogue; each release needs its own compatibility and permission review.", categories: ["Complete Graphics Overhauls", "eFootball-Inspired Visuals", "FC-Inspired Visuals", "Natural Colour & Realism", "Lighting & Weather", "Stadium Atmosphere", "Scoreboards & Broadcast", "Boots, Balls & Texture Packs"] },
      { id: "nexus", name: "Nexus Mods", focus: "Community visual mods and tools", note: "External listings; availability and game-version support vary by creator.", categories: ["Complete Graphics Overhauls", "Lighting & Weather", "Stadium Atmosphere", "Scoreboards & Broadcast"] },
      { id: "gfx-combined-2025", name: "GFX Combined 2024–2025", focus: "Third-party graphics collection", note: "Publisher-hosted release information; not a manager-verified package.", categories: ["Complete Graphics Overhauls", "eFootball-Inspired Visuals", "Natural Colour & Realism", "Lighting & Weather"] }
    ]
  },
  {
    id: "stadiums", title: "Stadiums & Turf", strapline: "THE MATCHDAY ENVIRONMENT", description: "Shape the entire stadium experience: pitch textures, turf tones, patterns, stadium environments, adboards, lighting and atmosphere.",
    subcategories: ["Turf & Pitch Textures", "Pitch Patterns & Wear", "Natural Grass", "eFootball Turf Styles", "Stadium Environments", "Adboards & LED Boards", "Stadium Lighting", "Stadium Server Modules"],
    originals: [
      { name: "GOD TURF", focus: "Original THEGODMODS pitch and turf collection, developed around real DDS resources and controlled in-game testing.", status: "studio-planned", categories: ["Turf & Pitch Textures", "Pitch Patterns & Wear", "Natural Grass", "eFootball Turf Styles"] },
      { name: "GOD STADIUMS", focus: "An original stadium environment programme covering atmosphere, presentation and compatible stadium assets.", status: "studio-planned", categories: ["Stadium Environments", "Adboards & LED Boards", "Stadium Lighting", "Stadium Server Modules"] },
      { name: "GOD PITCH LAB", focus: "Our in-house pitch texture development line, built with the existing inventory and DDS validation tools.", status: "in-development", categories: ["Turf & Pitch Textures", "Pitch Patterns & Wear", "Natural Grass"] }
    ],
    thirdParty: [
      { id: "gfx-pitch-2026", name: "eFootball 2026 GFX & Pitch", focus: "Third-party graphics and pitch release", note: "External archive with publisher-listed requirements; CPK and loader workflows differ.", categories: ["Turf & Pitch Textures", "Natural Grass", "eFootball Turf Styles"] },
      { id: "pesmodding", name: "PES Modding", focus: "Stadium and pitch community releases", note: "External creator catalogue; confirm Stadium Server and Sider requirements.", categories: ["Turf & Pitch Textures", "Pitch Patterns & Wear", "Natural Grass", "Stadium Environments", "Stadium Lighting", "Stadium Server Modules"] },
      { id: "moddingway", name: "ModdingWay", focus: "Stadium, pitch and adboard mods", note: "External creator catalogue; check each release's patch compatibility.", categories: ["Turf & Pitch Textures", "Stadium Environments", "Adboards & LED Boards", "Stadium Lighting"] }
    ]
  },
  {
    id: "kits", title: "Kits & Equipment", strapline: "EVERY DETAIL COUNTS", description: "Discover and manage team kits, goalkeeper kits, boots, balls, gloves and equipment collections.",
    subcategories: ["Club Kits", "National Team Kits", "Goalkeeper Kits", "Boots", "Balls", "Gloves & Equipment", "Kit Fonts & Numbers", "Classic Kits"],
    originals: [{ name: "GOD KITS", focus: "Original kit and equipment projects with creator-owned artwork and documented team/season coverage.", status: "studio-planned", categories: ["Club Kits", "National Team Kits", "Goalkeeper Kits", "Kit Fonts & Numbers", "Classic Kits"] }],
    thirdParty: [
      { id: "moddingway", name: "ModdingWay", focus: "Kits, boots, balls and equipment", note: "External creator catalogue; verify season, patch and kit-server requirements.", categories: ["Club Kits", "National Team Kits", "Goalkeeper Kits", "Boots", "Balls", "Gloves & Equipment", "Kit Fonts & Numbers", "Classic Kits"] },
      { id: "pesmodding", name: "PES Modding", focus: "Community kit and equipment releases", note: "External creator catalogue; review author instructions and redistribution terms.", categories: ["Club Kits", "National Team Kits", "Goalkeeper Kits", "Boots", "Balls", "Kit Fonts & Numbers", "Classic Kits"] }
    ]
  },
  {
    id: "players", title: "Players", strapline: "BRING THE GAME TO LIFE", description: "Player appearance collections spanning faces, hair, tattoos, boots, body details and individual player updates.",
    subcategories: ["Player Faces", "Face Updates", "Hair & Beards", "Tattoos", "Boots & Accessories", "Classic Players", "Squad Appearance Packs"],
    originals: [{ name: "GOD FACES", focus: "Original player appearance work with consistent previews, player IDs and versioned update notes.", status: "studio-planned", categories: ["Player Faces", "Face Updates", "Hair & Beards", "Tattoos", "Classic Players", "Squad Appearance Packs"] }],
    thirdParty: [
      { id: "profacemods", name: "ProFaceMods", focus: "PES 2017 player face library", note: "External face library; check player IDs, patch compatibility and creator permissions.", categories: ["Player Faces", "Face Updates", "Hair & Beards", "Classic Players", "Squad Appearance Packs"] },
      { id: "pesmodding", name: "PES Modding", focus: "Faces, hair and player updates", note: "External creator catalogue; releases are not automatically validated by this manager.", categories: ["Player Faces", "Face Updates", "Hair & Beards", "Tattoos", "Boots & Accessories", "Classic Players", "Squad Appearance Packs"] }
    ]
  },
  {
    id: "audio", title: "Audio & Atmosphere", strapline: "FEEL THE STADIUM", description: "Create an authentic matchday soundscape with club anthems, chants, crowd ambience, commentary and stadium atmosphere.",
    subcategories: ["Club Anthems", "Team Chants", "Crowd Atmosphere", "Commentary", "Goal & Match Events", "Tifos & Supporter Atmosphere"],
    originals: [{ name: "GOD ATMOSPHERE", focus: "Original matchday audio design and properly licensed or user-created sound collections.", status: "studio-planned", categories: ["Club Anthems", "Team Chants", "Crowd Atmosphere", "Commentary", "Goal & Match Events", "Tifos & Supporter Atmosphere"] }],
    thirdParty: [
      { id: "pesmodding", name: "PES Modding", focus: "Community anthems, chants and audio atmosphere", note: "External creator catalogue; audio rights and game-version compatibility must be checked.", categories: ["Club Anthems", "Team Chants", "Crowd Atmosphere", "Commentary", "Goal & Match Events", "Tifos & Supporter Atmosphere"] },
      { id: "moddingway", name: "ModdingWay", focus: "PES 2017 community content index", note: "External source directory; inspect each release for audio-specific instructions.", categories: ["Club Anthems", "Team Chants", "Crowd Atmosphere", "Commentary", "Goal & Match Events"] }
    ]
  },
  {
    id: "gameplay", title: "Gameplay", strapline: "MAKE EVERY MATCH PLAY DIFFERENT", description: "Explore gameplay configurations and compatible extensions for movement, physics, ball behaviour, AI, difficulty and match flow.",
    subcategories: ["Gameplay Overhauls", "Player Movement", "Ball Physics", "AI & Tactics", "Difficulty & Match Tempo", "Refereeing & Fouls", "Lua & Sider Extensions"],
    originals: [{ name: "GOD GAMEPLAY", focus: "Original, versioned gameplay tuning projects with documented settings and controlled test results.", status: "studio-planned", categories: ["Gameplay Overhauls", "Player Movement", "Ball Physics", "AI & Tactics", "Difficulty & Match Tempo", "Refereeing & Fouls", "Lua & Sider Extensions"] }],
    thirdParty: [
      { id: "pesmodding", name: "PES Modding", focus: "Gameplay and patch community releases", note: "External creator catalogue; check executable, patch and Sider requirements.", categories: ["Gameplay Overhauls", "Player Movement", "Ball Physics", "AI & Tactics", "Difficulty & Match Tempo", "Refereeing & Fouls", "Lua & Sider Extensions"] },
      { id: "nexus", name: "Nexus Mods", focus: "Community gameplay mods and tools", note: "External listings; verify that a release targets PES 2017 specifically.", categories: ["Gameplay Overhauls", "Player Movement", "Ball Physics", "AI & Tactics", "Difficulty & Match Tempo", "Refereeing & Fouls"] }
    ]
  }
];

export function getDepartment(id: string): DepartmentDefinition | undefined {
  return departments.find((department) => department.id === id);
}
