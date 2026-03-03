import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, "../../backend/public/runtime.js");
const outPath = join(__dirname, "../public/runtime.js");

if (!existsSync(srcPath)) {
  if (existsSync(outPath)) {
    console.log("Backend source not available, using existing obfuscated runtime.js");
    process.exit(0);
  }
  console.error("No runtime.js source found and no pre-built version exists");
  process.exit(1);
}

const source = readFileSync(srcPath, "utf-8");

const result = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.3,
  deadCodeInjection: false,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  selfDefending: false,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: "variable",
  stringArrayThreshold: 0.5,
  splitStrings: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: "browser",
  seed: 0,
  reservedStrings: [
    "rrweb",
    "cdn.jsdelivr.net",
    "unpkg.com",
    "\\[Segmentor\\]",
    "/public/recording",
  ],
});

writeFileSync(outPath, result.getObfuscatedCode(), "utf-8");

const srcSize = Buffer.byteLength(source, "utf-8");
const outSize = Buffer.byteLength(result.getObfuscatedCode(), "utf-8");
console.log(`Obfuscated runtime.js: ${srcSize} → ${outSize} bytes`);
