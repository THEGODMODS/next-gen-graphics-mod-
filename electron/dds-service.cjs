const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const MAX_FILE_BYTES = 512 * 1024 * 1024;
async function readSafe(filePath) {
  const resolved = path.resolve(filePath), stat = await fs.lstat(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("DDS input must be a regular file, not a symbolic link.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("DDS exceeds the 512 MiB input safety limit.");
  return { file: resolved, buffer: await fs.readFile(resolved) };
}
async function loadTools(root) {
  const tools = path.join(root, "tools");
  const [preview, inspect, compare] = await Promise.all([
    import(pathToFileURL(path.join(tools, "dds-preview.mjs")).href),
    import(pathToFileURL(path.join(tools, "dds-inspect.mjs")).href),
    import(pathToFileURL(path.join(tools, "dds-compare.mjs")).href)
  ]);
  return { preview, inspect, compare };
}
async function inspect(filePath, root) {
  const source = await readSafe(filePath), tools = await loadTools(root);
  const analysis = tools.inspect.analyzeDds(source.buffer), preview = tools.preview.ddsToPng(source.buffer);
  return { ...analysis, file: source.file, previewMode: preview.previewMode, previewBase64: preview.png.toString("base64") };
}
async function compare(originalPath, replacementPath, root) {
  const [original, replacement] = await Promise.all([readSafe(originalPath), readSafe(replacementPath)]);
  const tools = await loadTools(root);
  return tools.compare.compareDds(original.buffer, replacement.buffer);
}
module.exports = { inspect, compare };
