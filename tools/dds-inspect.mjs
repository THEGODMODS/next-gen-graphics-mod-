#!/usr/bin/env node
import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const MAX_FILE_BYTES = 512 * 1024 * 1024;

function rgb565(value) {
  const r = (value >> 11) & 31, g = (value >> 5) & 63, b = value & 31;
  return [Math.round(r * 255 / 31), Math.round(g * 255 / 63), Math.round(b * 255 / 31)];
}
function colorPalette(block, forceFour = false) {
  const c0 = block.readUInt16LE(0), c1 = block.readUInt16LE(2);
  const a = rgb565(c0), b = rgb565(c1);
  const colors = [a, b];
  if (c0 > c1 || forceFour) {
    colors.push(a.map((v, i) => Math.round((2 * v + b[i]) / 3)));
    colors.push(a.map((v, i) => Math.round((v + 2 * b[i]) / 3)));
  } else {
    colors.push(a.map((v, i) => Math.round((v + b[i]) / 2)));
    colors.push([0, 0, 0]);
  }
  return { colors, indices: block.readUInt32LE(4), transparent: c0 <= c1 && !forceFour };
}
function alphaPalette(block) {
  const a0 = block[0], a1 = block[1], values = [a0, a1];
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) values.push(Math.round(((7 - i) * a0 + i * a1) / 7));
  } else {
    for (let i = 1; i <= 4; i++) values.push(Math.round(((5 - i) * a0 + i * a1) / 5));
    values.push(0, 255);
  }
  let bits = 0n;
  for (let i = 0; i < 6; i++) bits |= BigInt(block[2 + i]) << BigInt(i * 8);
  return Array.from({ length: 16 }, (_, i) => values[Number((bits >> BigInt(i * 3)) & 7n)]);
}
function decodeBlock(format, block) {
  const isBc1 = format.startsWith("BC1");
  const isBc2 = format.startsWith("BC2");
  const isBc3 = format.startsWith("BC3");
  const isBc5 = format.startsWith("BC5");
  if (isBc5) {
    return { channels: [alphaPalette(block.subarray(0, 8)), alphaPalette(block.subarray(8, 16)), null], alpha: null };
  }
  const colorOffset = isBc1 ? 0 : 8;
  const color = colorPalette(block.subarray(colorOffset, colorOffset + 8), !isBc1);
  let alpha = null;
  if (isBc3) alpha = alphaPalette(block.subarray(0, 8));
  if (isBc2) {
    let bits = 0n;
    for (let i = 0; i < 8; i++) bits |= BigInt(block[i]) << BigInt(i * 8);
    alpha = Array.from({ length: 16 }, (_, i) => Number((bits >> BigInt(i * 4)) & 15n) * 17);
  }
  return {
    channels: [0, 1, 2].map(channel => Array.from({ length: 16 }, (_, i) => color.colors[(color.indices >>> (i * 2)) & 3][channel])),
    alpha: alpha ?? (isBc1 && color.transparent
      ? Array.from({ length: 16 }, (_, i) => ((color.indices >>> (i * 2)) & 3) === 3 ? 0 : 255)
      : Array(16).fill(255))
  };
}

export function analyzeDds(buffer) {
  const audit = inspectDds(buffer);
  if (!audit.valid) throw new Error("DDS audit failed: " + audit.errors.join("; "));
  const format = audit.format;
  if (!["BC1", "BC1_UNORM", "BC1_UNORM_SRGB", "BC2", "BC2_UNORM", "BC2_UNORM_SRGB",
    "BC3", "BC3_UNORM", "BC3_UNORM_SRGB", "BC5", "BC5_UNORM", "BC5_SNORM"].includes(format)) {
    throw new Error("Pixel analysis currently supports BC1, BC2, BC3 and BC5 only; received " + format + ".");
  }
  const width = audit.width, height = audit.height;
  const blockBytes = format.startsWith("BC1") ? 8 : 16;
  const sums = [0, 0, 0], mins = [255, 255, 255], maxs = [0, 0, 0];
  let alphaSum = 0, alphaBelow128 = 0, pixelCount = 0, luminanceSum = 0, luminanceSquared = 0;
  let normalLengthSum = 0, normalLengthSquared = 0, normalCount = 0;
  const blocksX = Math.ceil(width / 4), blocksY = Math.ceil(height / 4);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const offset = audit.dataOffset + (by * blocksX + bx) * blockBytes;
      const decoded = decodeBlock(format, buffer.subarray(offset, offset + blockBytes));
      for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
        const x = bx * 4 + px, y = by * 4 + py;
        if (x >= width || y >= height) continue;
        const i = py * 4 + px;
        if (format.startsWith("BC5")) {
          const nx = decoded.channels[0][i] / 127.5 - 1;
          const ny = decoded.channels[1][i] / 127.5 - 1;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
          normalLengthSum += length; normalLengthSquared += length * length; normalCount++;
          for (let c = 0; c < 2; c++) {
            const value = decoded.channels[c][i];
            sums[c] += value; mins[c] = Math.min(mins[c], value); maxs[c] = Math.max(maxs[c], value);
          }
        } else {
          for (let c = 0; c < 3; c++) {
            const value = decoded.channels[c][i];
            sums[c] += value; mins[c] = Math.min(mins[c], value); maxs[c] = Math.max(maxs[c], value);
          }
          const luminance = 0.2126 * decoded.channels[0][i] + 0.7152 * decoded.channels[1][i] + 0.0722 * decoded.channels[2][i];
          luminanceSum += luminance; luminanceSquared += luminance * luminance;
        }
        const alpha = decoded.alpha ? decoded.alpha[i] : 255;
        alphaSum += alpha; if (alpha < 128) alphaBelow128++;
        pixelCount++;
      }
    }
  }
  const mean = sums.map(v => Number((v / pixelCount).toFixed(2)));
  const result = {
    width, height, format, mipCount: audit.mipCount, analyzedMip: 0, pixelsAnalyzed: pixelCount,
    channels: format.startsWith("BC5") ? "RG (BC5; normal-map candidate)" : "RGB",
    channelMean: format.startsWith("BC5") ? mean.slice(0, 2) : mean,
    channelMin: format.startsWith("BC5") ? mins.slice(0, 2) : mins,
    channelMax: format.startsWith("BC5") ? maxs.slice(0, 2) : maxs,
    alpha: { mean: Number((alphaSum / pixelCount).toFixed(2)), below128Percent: Number((alphaBelow128 * 100 / pixelCount).toFixed(2)) }
  };
  if (!format.startsWith("BC5")) {
    const average = luminanceSum / pixelCount;
    result.luminance = {
      mean: Number(average.toFixed(2)),
      standardDeviation: Number(Math.sqrt(Math.max(0, luminanceSquared / pixelCount - average * average)).toFixed(2))
    };
  } else {
    const average = normalLengthSum / normalCount;
    result.reconstructedNormalLength = {
      mean: Number(average.toFixed(4)),
      standardDeviation: Number(Math.sqrt(Math.max(0, normalLengthSquared / normalCount - average * average)).toFixed(4)),
      note: "Z is reconstructed as positive sqrt(max(0, 1 - X² - Y²)); this is a diagnostic approximation, not proof of the game's normal convention."
    };
  }
  return result;
}

export async function analyzeDdsFile(filePath) {
  const file = path.resolve(filePath);
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Input must be a regular file, not a symbolic link.");
  if (stat.size > MAX_FILE_BYTES) throw new Error("DDS exceeds the 512 MiB analysis safety limit.");
  const buffer = await readFile(file);
  return { file, ...analyzeDds(buffer) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npm run inspect:dds -- <texture.dds>");
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(await analyzeDdsFile(target), null, 2));
  } catch (error) {
    console.error("DDS inspection failed: " + error.message);
    process.exitCode = 1;
  }
}
