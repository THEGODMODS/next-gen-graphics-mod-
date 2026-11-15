#!/usr/bin/env node
/**
 * Non-destructive masked detail compositor for GOD KITS / GOD FACES.
 * Supports only audited uncompressed RGBA8/BGRA8 DDS inputs. Writes a new file;
 * never edits the base, overlay, mask, game or patch resource.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const CHANNELS = {
  RGBA8_UNORM: { r: 0, g: 1, b: 2, a: 3 },
  BGRA8_UNORM: { r: 2, g: 1, b: 0, a: 3 }
};
const clamp = value => Math.max(0, Math.min(255, Math.round(value)));

function levelSizes(width, height, mipCount) {
  const sizes = [];
  let w = width, h = height;
  for (let i = 0; i < mipCount; i++) {
    sizes.push({ width: w, height: h, bytes: w * h * 4 });
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
  }
  return sizes;
}

/**
 * Apply a neutral greyscale detail overlay only where the supplied UV mask is
 * white. Overlay alpha and the mask both modulate strength. Base alpha and all
 * pixels outside the mask are preserved. All mip levels are composited.
 */
export function compositeMaskedDds(baseBytes, overlayBytes, maskBytes, options = {}) {
  const opacity = options.opacity ?? 1;
  const maskChannel = options.maskChannel ?? "r";
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 2) throw new Error("opacity must be between 0 and 2.");
  if (!["r", "g", "b", "a"].includes(maskChannel)) throw new Error("maskChannel must be r, g, b or a.");
  const base = inspectDds(baseBytes), overlay = inspectDds(overlayBytes), mask = inspectDds(maskBytes);
  for (const [name, result] of [["base", base], ["overlay", overlay], ["mask", mask]]) {
    if (!result.valid) throw new Error(name + " DDS is invalid: " + result.errors.join(" "));
    if (!CHANNELS[result.format]) throw new Error(name + " DDS must be uncompressed RGBA8 or BGRA8.");
  }
  for (const [name, result] of [["overlay", overlay], ["mask", mask]]) {
    if (result.width !== base.width || result.height !== base.height || result.mipCount !== base.mipCount) {
      throw new Error(name + " dimensions and mip count must exactly match the base DDS.");
    }
  }
  const out = Buffer.from(baseBytes);
  const baseChannels = CHANNELS[base.format], overlayChannels = CHANNELS[overlay.format], maskChannels = CHANNELS[mask.format];
  const sizes = levelSizes(base.width, base.height, base.mipCount);
  let offset = base.dataOffset;
  let overlayOffset = overlay.dataOffset;
  let maskOffset = mask.dataOffset;
  for (const level of sizes) {
    for (let pixel = 0; pixel < level.width * level.height; pixel++) {
      const b = offset + pixel * 4, o = overlayOffset + pixel * 4, m = maskOffset + pixel * 4;
      const coverage = maskBytes[m + maskChannels[maskChannel]] / 255;
      if (coverage <= 0) continue;
      const detailAlpha = overlayBytes[o + overlayChannels.a] / 255;
      const detail = (
        overlayBytes[o + overlayChannels.r] +
        overlayBytes[o + overlayChannels.g] +
        overlayBytes[o + overlayChannels.b]
      ) / 3 - 128;
      const strength = coverage * detailAlpha * opacity;
      for (const channel of ["r", "g", "b"]) {
        const index = baseChannels[channel];
        out[b + index] = clamp(baseBytes[b + index] + detail * strength);
      }
      // Alpha is deliberately not modified.
    }
    offset += level.bytes;
    overlayOffset += level.bytes;
    maskOffset += level.bytes;
  }
  return out;
}

async function main(args) {
  const [basePath, overlayPath, maskPath, outputPath, rawOpacity, maskChannel] = args;
  if (!basePath || !overlayPath || !maskPath || !outputPath) {
    console.error("Usage: node tools/godmods-dds-compositor.mjs <base.dds> <detail-overlay.dds> <uv-mask.dds> <new-output.dds> [opacity 0..2] [mask-channel r|g|b|a]");
    process.exitCode = 2;
    return;
  }
  const paths = [basePath, overlayPath, maskPath].map(p => path.resolve(p));
  const destination = path.resolve(outputPath);
  if (paths.includes(destination)) throw new Error("Output must be a new path; input files are never overwritten.");
  const bytes = compositeMaskedDds(
    await readFile(paths[0]), await readFile(paths[1]), await readFile(paths[2]),
    { opacity: rawOpacity === undefined ? 1 : Number(rawOpacity), maskChannel: maskChannel || "r" }
  );
  await writeFile(destination, bytes);
  console.log(JSON.stringify({ output: destination, bytes: bytes.length, operation: "masked-neutral-detail-composite", inputsModified: false }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main(process.argv.slice(2));
