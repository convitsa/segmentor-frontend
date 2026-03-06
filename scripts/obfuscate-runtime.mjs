import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import JavaScriptObfuscator from "javascript-obfuscator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, "../../backend/public/runtime.js");
const outPath = join(__dirname, "../public/runtime.js");
const rrwebUmdPath = join(
  __dirname,
  "../node_modules/@rrweb/record/dist/record.umd.min.cjs",
);

if (!existsSync(srcPath)) {
  if (existsSync(outPath)) {
    console.log(
      "Backend source not available, using existing obfuscated runtime.js",
    );
    process.exit(0);
  }
  console.error("No runtime.js source found and no pre-built version exists");
  process.exit(1);
}

const source = readFileSync(srcPath, "utf-8");

let combined = source;
if (existsSync(rrwebUmdPath)) {
  const rrwebUmd = readFileSync(rrwebUmdPath, "utf-8");

  const rrwebWrapper = [
    "var rrwebRecord = (function() {",
    "  var module = { exports: {} };",
    "  var exports = module.exports;",
    "  var define = undefined;",
    rrwebUmd,
    "  var _m = module.exports;",
    "  if (_m && _m.record) return _m.record;",
    "  if (_m && _m.default && _m.default.record) return _m.default.record;",
    "  if (_m && _m.default) return _m.default;",
    "  return _m;",
    "})();",
  ].join("\n");

  combined = source.replace(
    /^\(function\s*\(\)\s*\{/,
    `(function () {\n${rrwebWrapper}\n`,
  );

  // Scrub identifiable strings that ad-blocker heuristics might match.
  // These are rrweb internals that serve no external purpose.
  combined = combined
    .replace(/__rrweb_original__/g, "__seg_o__")
    .replace(/FullSnapshot/g, "_FS_")
    .replace(/IncrementalSnapshot/g, "_IS_")
    .replace(/define\("rrweb"/g, 'define("_sr"')
    .replace(/exports\["rrweb"\]/g, 'exports["_sr"]')
    .replace(/g\["rrweb"\]/g, 'g["_sr"]')
    .replace(/'rrweb'/g, "'_sr'")
    .replace(/"rrweb"/g, '"_sr"')
    .replace(/recording/gi, "cap")
    .replace(/snapshot/gi, "snap");

  console.log("Bundled @rrweb/record into runtime.js (keywords scrubbed)");
} else {
  console.log(
    "Warning: @rrweb/record not found, building runtime.js without capture support",
  );
}

const result = JavaScriptObfuscator.obfuscate(combined, {
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
  stringArrayThreshold: 0.75,
  splitStrings: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: "browser",
  seed: 0,
  reservedNames: [],
  reservedStrings: [
    "cdn.jsdelivr.net",
    "unpkg.com",
    "\\[Segmentor\\]",
  ],
});

writeFileSync(outPath, result.getObfuscatedCode(), "utf-8");

const srcSize = Buffer.byteLength(source, "utf-8");
const combinedSize = Buffer.byteLength(combined, "utf-8");
const outSize = Buffer.byteLength(result.getObfuscatedCode(), "utf-8");
console.log(
  `Obfuscated runtime.js: ${srcSize} (source) + rrweb -> ${combinedSize} (combined) -> ${outSize} (obfuscated) bytes`,
);
