const { parentPort } = require("node:worker_threads");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const MAX_FILE_BYTES = 512 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 24 * 1024 * 1024;
const toolCache = new Map();

async function readSafe(filePath) {
  const resolved = path.resolve(filePath);
  const stat = await fs.lstat(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Input must be a regular file, not a symbolic link.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("Input exceeds the 512 MiB safety limit.");
  return { file: resolved, buffer: await fs.readFile(resolved) };
}

async function loadDdsTools(root) {
  if (!toolCache.has(root)) {
    const dir = path.join(root, "tools");
    toolCache.set(root, Promise.all([
      import(pathToFileURL(path.join(dir, "dds-preview.mjs")).href),
      import(pathToFileURL(path.join(dir, "dds-inspect.mjs")).href),
      import(pathToFileURL(path.join(dir, "dds-compare.mjs")).href)
    ]).then(([preview, inspect, compare]) => ({ preview, inspect, compare })));
  }
  return toolCache.get(root);
}

async function execute(task) {
  if (task.operation === "inspect-dds") {
    const source = await readSafe(task.filePath);
    const tools = await loadDdsTools(task.root);
    const analysis = tools.inspect.analyzeDds(source.buffer);
    const preview = tools.preview.ddsToPng(source.buffer);
    if (preview.png.length > MAX_PREVIEW_BYTES) throw new Error("Decoded PNG preview exceeds the 24 MiB desktop transfer limit. Use a smaller texture for in-app preview.");
    return { ...analysis, file: source.file, previewMode: preview.previewMode, previewBase64: preview.png.toString("base64") };
  }
  if (task.operation === "compare-dds") {
    const [original, replacement] = await Promise.all([readSafe(task.originalPath), readSafe(task.replacementPath)]);
    const tools = await loadDdsTools(task.root);
    return tools.compare.compareDds(original.buffer, replacement.buffer);
  }
  if (task.operation === "analyze-sider-log") {
    const source = await readSafe(task.filePath);
    if (source.buffer.length > 32 * 1024 * 1024) throw new Error("Sider log exceeds the 32 MiB analysis limit.");
    const analyzer = require(path.join(task.root, "tools", "sider-pitch-log.cjs"));
    return { fileName: path.basename(source.file), report: analyzer.analyzeSiderPitchLog(source.buffer.toString("utf8")) };
  }
  throw new Error("Unsupported background task.");
}

parentPort.on("message", async message => {
  try {
    const result = await execute(message.task);
    parentPort.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({ id: message.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
