const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { app } = require("electron");

let nextTaskId = 0;
function runWorker(task) {
  return new Promise((resolve, reject) => {
    const id = ++nextTaskId;
    const workerPath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "electron", "dds-worker.cjs")
      : path.join(__dirname, "dds-worker.cjs");
    const worker = new Worker(workerPath);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      if (error) reject(error);
      else resolve(value);
    };
    worker.once("message", message => {
      if (!message || message.id !== id) return finish(new Error("Background worker returned an invalid response."));
      if (!message.ok) return finish(new Error(message.error || "Background task failed."));
      finish(null, message.result);
    });
    worker.once("error", error => finish(error));
    worker.once("exit", code => {
      if (!settled && code !== 0) finish(new Error("Background worker exited unexpectedly (" + code + ")."));
      else if (!settled) finish(new Error("Background worker exited without returning a result."));
    });
    worker.postMessage({ id, task });
  });
}

async function inspect(filePath, root) {
  return runWorker({ operation: "inspect-dds", filePath, root });
}
async function compare(originalPath, replacementPath, root) {
  return runWorker({ operation: "compare-dds", originalPath, replacementPath, root });
}
async function analyzeLog(filePath, root) {
  return runWorker({ operation: "analyze-sider-log", filePath, root });
}
module.exports = { inspect, compare, analyzeLog };
