const START = "; >>> NEXTGEN MANAGED CONFIG >>>";
const END = "; <<< NEXTGEN MANAGED CONFIG <<<";

export interface ManagedSiderConfig {
  luaModules: string[];
  liveCpkRoots: string[];
}

function validateLuaModule(value: string): string {
  if (!/^[A-Za-z0-9_.-]+\.lua$/i.test(value) || value.includes("..")) {
    throw new Error(`Invalid Sider Lua module filename: ${value}`);
  }
  return value;
}

function validateRoot(value: string): string {
  if (!value || /[\r\n"']/g.test(value) || value.startsWith("\\") || /^[A-Za-z]:/.test(value) || value.includes("..")) {
    throw new Error(`Invalid relative LiveCPK root: ${value}`);
  }
  return value.replace(/\//g, "\\");
}

export function buildManagedSiderBlock(config: ManagedSiderConfig): string {
  const modules = [...new Set(config.luaModules.map(validateLuaModule))].sort((a, b) => a.localeCompare(b));
  const roots = [...new Set(config.liveCpkRoots.map(validateRoot))].sort((a, b) => a.localeCompare(b));
  if (modules.length === 0 && roots.length === 0) {
    throw new Error("A managed Sider block requires at least one Lua module or LiveCPK root.");
  }
  const lines = [START];
  if (roots.length) {
    lines.push("livecpk.enabled = 1", ...roots.map(root => `cpk.root = "${root}"`));
  }
  if (modules.length) {
    lines.push("lua.enabled = 1", ...modules.map(module => `lua.module = "${module}"`));
  }
  lines.push(END);
  return lines.join("\r\n");
}

/** Replaces only the manager-owned block; all other lines and their order remain untouched. */
export function upsertManagedSiderBlock(content: string, config: ManagedSiderConfig): string {
  const starts = content.split(START).length - 1;
  const ends = content.split(END).length - 1;
  if (starts !== ends || starts > 1) throw new Error("Sider INI contains damaged or duplicate NextGen markers; manual repair is required.");
  const block = buildManagedSiderBlock(config);
  if (starts === 1) {
    const start = content.indexOf(START);
    const end = content.indexOf(END) + END.length;
    if (end < start) throw new Error("Sider INI manager markers are out of order.");
    return content.slice(0, start) + block + content.slice(end);
  }
  const separator = content.length === 0 || content.endsWith("\n") ? "" : "\r\n";
  return content + separator + block + "\r\n";
}

export function removeManagedSiderBlock(content: string): string {
  const starts = content.split(START).length - 1;
  const ends = content.split(END).length - 1;
  if (starts === 0 && ends === 0) return content;
  if (starts !== 1 || ends !== 1) throw new Error("Sider INI contains damaged or duplicate NextGen markers; refusing to modify it.");
  const start = content.indexOf(START);
  const end = content.indexOf(END) + END.length;
  if (end < start) throw new Error("Sider INI manager markers are out of order.");
  const before = content.slice(0, start);
  const after = content.slice(end).replace(/^\r?\n/, "");
  return before + after;
}
