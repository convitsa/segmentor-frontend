import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, "../../backend/public/runtime.js");
const outPath = join(__dirname, "../public/runtime.js");

const source = readFileSync(srcPath, "utf-8");

const result = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: true,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ["rc4"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: "function",
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 15,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: "browser",
  seed: 0,
});

writeFileSync(outPath, result.getObfuscatedCode(), "utf-8");

const srcSize = Buffer.byteLength(source, "utf-8");
const outSize = Buffer.byteLength(result.getObfuscatedCode(), "utf-8");
console.log(`Obfuscated runtime.js: ${srcSize} → ${outSize} bytes`);
