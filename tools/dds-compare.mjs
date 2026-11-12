import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const MAX_FILE_BYTES = 512 * 1024 * 1024;

function rgb565(value) {
  return [Math.round(((value >> 11) & 31) * 255 / 31), Math.round(((value >> 5) & 63) * 255 / 63), Math.round((value & 31) * 255 / 31)];
}
function colorPalette(block, forceFour = false) {
  const c0 = block.readUInt16LE(0), c1 = block.readUInt16LE(2);
  const a = rgb565(c0), b = rgb565(c1), colors = [a, b];
  if (c0 > c1 || forceFour) colors.push(a.map((v, i) => Math.round((2 * v + b[i]) / 3)), a.map((v, i) => Math.round((v + 2 * b[i]) / 3)));
  else colors.push(a.map((v, i) => Math.round((v + b[i]) / 2)), [0, 0, 0]);
  return { colors, indices: block.readUInt32LE(4), transparent: c0 <= c1 && !forceFour };
}
function alphaPalette(block) {
  const a0 = block[0], a1 = block[1], values = [a0, a1];
  if (a0 > a1) for (let i = 1; i <= 6; i++) values.push(Math.round(((7 - i) * a0 + i * a1) / 7));
  else { for (let i = 1; i <= 4; i++) values.push(Math.round(((5 - i) * a0 + i * a1) / 5)); values.push(0, 255); }
  let bits = 0n;
  for (let i = 0; i < 6; i++) bits |= BigInt(block[2 + i]) << BigInt(i * 8);
  return Array.from({ length: 16 }, (_, i) => values[Number((bits >> BigInt(i * 3)) & 7n)]);
}
function decodeBlock(format, block) {
  if (format.startsWith("BC5")) return { channels: [alphaPalette(block.subarray(0, 8)), alphaPalette(block.subarray(8, 16))], alpha: null };
  const bc1 = format.startsWith("BC1"), bc3 = format.startsWith("BC3"), bc2 = format.startsWith("BC2");
  const color = colorPalette(block.subarray(bc1 ? 0 : 8, (bc1 ? 0 : 8) + 8), !bc1);
  let alpha = null;
  if (bc3) alpha = alphaPalette(block.subarray(0, 8));
  if (bc2) { let bits = 0n; for (let i = 0; i < 8; i++) bits |= BigInt(block[i]) << BigInt(i * 8); alpha = Array.from({ length: 16 }, (_, i) => Number((bits >> BigInt(i * 4)) & 15n) * 17); }
  return {
    channels: [0, 1, 2].map(c => Array.from({ length: 16 }, (_, i) => color.colors[(color.indices >>> (i * 2)) & 3][c])),
    alpha: alpha ?? (bc1 && color.transparent ? Array.from({ length: 16 }, (_, i) => ((color.indices >>> (i * 2)) & 3) === 3 ? 0 : 255) : Array(16).fill(255))
  };
}
function round(value, digits = 4) { return Number(value.toFixed(digits)); }

export function compareDds(originalBuffer, replacementBuffer) {
  const originalAudit = inspectDds(originalBuffer), replacementAudit = inspectDds(replacementBuffer);
  if (!originalAudit.valid) throw new Error("Original DDS audit failed: " + originalAudit.errors.join("; "));
  if (!replacementAudit.valid) throw new Error("Replacement DDS audit failed: " + replacementAudit.errors.join("; "));
  const a = originalAudit, b = replacementAudit;
  if (a.width !== b.width || a.height !== b.height) throw new Error(`DDS dimensions differ: original ${a.width}x${a.height}, replacement ${b.width}x${b.height}.`);
  if (a.format !== b.format) throw new Error(`DDS formats differ: original ${a.format}, replacement ${b.format}. Exact-format comparison is required.`);
  const format = a.format;
  if (!["BC1", "BC1_UNORM", "BC1_UNORM_SRGB", "BC2", "BC2_UNORM", "BC2_UNORM_SRGB", "BC3", "BC3_UNORM", "BC3_UNORM_SRGB", "BC5", "BC5_UNORM"].includes(format)) {
    throw new Error("Pixel comparison supports BC1, BC2, BC3 and BC5_UNORM only; received " + format + ".");
  }
  const blockBytes = format.startsWith("BC1") ? 8 : 16;
  const blocksX = Math.ceil(a.width / 4), blocksY = Math.ceil(a.height / 4);
  const channelCount = format.startsWith("BC5") ? 2 : 4;
  const names = channelCount === 2 ? ["R", "G"] : ["R", "G", "B", "A"];
  const sums = Array(channelCount).fill(0), squares = Array(channelCount).fill(0), maxima = Array(channelCount).fill(0);
  let changedPixels = 0, pixelCount = 0;
  for (let by = 0; by < blocksY; by++) for (let bx = 0; bx < blocksX; bx++) {
    const offset = a.dataOffset + (by * blocksX + bx) * blockBytes;
    const left = decodeBlock(format, originalBuffer.subarray(offset, offset + blockBytes));
    const right = decodeBlock(format, replacementBuffer.subarray(offset, offset + blockBytes));
    for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
      if (bx * 4 + px >= a.width || by * 4 + py >= a.height) continue;
      const i = py * 4 + px;
      const valuesA = [...left.channels.map(channel => channel[i]), ...(left.alpha ? [left.alpha[i]] : [])];
      const valuesB = [...right.channels.map(channel => channel[i]), ...(right.alpha ? [right.alpha[i]] : [])];
      let pixelChanged = false;
      for (let c = 0; c < channelCount; c++) {
        const delta = Math.abs(valuesA[c] - valuesB[c]);
        sums[c] += delta; squares[c] += delta * delta; maxima[c] = Math.max(maxima[c], delta);
        if (delta !== 0) pixelChanged = true;
      }
      if (pixelChanged) changedPixels++;
      pixelCount++;
    }
  }
  return {
    compatibleForPixelComparison: true, width: a.width, height: a.height, format,
    analyzedMip: 0, pixelsCompared: pixelCount,
    changedPixelPercent: round(changedPixels * 100 / pixelCount, 2),
    channels: Object.fromEntries(names.map((name, i) => [name, {
      meanAbsoluteError: round(sums[i] / pixelCount, 4),
      rootMeanSquareError: round(Math.sqrt(squares[i] / pixelCount), 4),
      maximumAbsoluteError: maxima[i]
    }])),
    limitations: ["Compares decoded base-mip pixels only; higher mip levels are not compared.", "BC5 compares stored R/G channels only and does not infer normal-map conventions.", "A pixel difference is not proof of better visual quality or PES 2017 runtime compatibility."]
  };
}

async function readSafe(filePath) {
  const file = path.resolve(filePath), stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Inputs must be regular files, not symbolic links.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("DDS exceeds the 512 MiB comparison safety limit.");
  return { file, buffer: await readFile(file) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [originalPath, replacementPath] = process.argv.slice(2);
  if (!originalPath || !replacementPath) {
    console.error("Usage: npm run compare:dds -- <original.dds> <replacement.dds>");
    process.exit(2);
  }
  try {
    const original = await readSafe(originalPath), replacement = await readSafe(replacementPath);
    console.log(JSON.stringify({ original: original.file, replacement: replacement.file, ...compareDds(original.buffer, replacement.buffer) }, null, 2));
  } catch (error) { console.error("DDS comparison failed: " + error.message); process.exitCode = 1; }
}
