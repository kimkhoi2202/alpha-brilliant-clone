/**
 * Vendored-parity guard for the content model + feedback engine.
 *
 * `functions/src/content/{engine,types}.ts` are deliberate VENDORED COPIES of the
 * client originals at `../src/content/{engine,types}.ts` (the functions tsconfig
 * sets `rootDir: "src"`, so the client copy can't be imported directly). The
 * server verification firewall (PRD §3.1, P3/P4) is only sound while the two
 * copies agree — yet nothing enforces that. This script does.
 *
 * It compares the CODE of each pair, ignoring the differences that are intended:
 *   - comments (the file-header blurb and the `source` doc-comment differ on
 *     purpose; comments don't affect firewall behavior, so all are stripped), and
 *   - the ESM `.js` import-extension the vendored copy needs under NodeNext.
 * Any remaining (i.e. real, behavioral) drift exits non-zero so CI/`npm run
 * check:parity` fails loudly.
 *
 * Ponytail: a string compare of normalized source — no TS parser, no deps.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// functions/scripts -> functions/src/content (vendored) and -> repo src/content (client).
const vendoredDir = resolve(here, "../src/content");
const clientDir = resolve(here, "../../src/content");

const FILES = ["engine.ts", "types.ts"];

/** Strip comments + normalize import extensions/whitespace down to code lines. */
function normalize(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments (incl. JSDoc)
    .replace(/\/\/.*$/gm, "") // line comments
    .replace(/(\bfrom\s+["'][^"']+?)\.js(["'])/g, "$1$2") // drop ESM .js ext
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
}

/** Return the 1-based index + text of the first differing normalized line, or null. */
function firstDiff(a, b) {
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      return { line: i + 1, vendored: a[i] ?? "(end of file)", client: b[i] ?? "(end of file)" };
    }
  }
  return null;
}

let drift = false;
for (const file of FILES) {
  const vendoredPath = resolve(vendoredDir, file);
  const clientPath = resolve(clientDir, file);

  let vendoredSrc;
  let clientSrc;
  try {
    vendoredSrc = readFileSync(vendoredPath, "utf8");
    clientSrc = readFileSync(clientPath, "utf8");
  } catch (err) {
    console.error(`✗ parity: cannot read ${file}: ${err.message}`);
    process.exit(2);
  }

  const diff = firstDiff(normalize(vendoredSrc), normalize(clientSrc));
  if (diff) {
    drift = true;
    console.error(
      `✗ parity DRIFT in ${file} (first mismatch at normalized line ${diff.line}):\n` +
        `    vendored: ${diff.vendored}\n` +
        `    client:   ${diff.client}`,
    );
  } else {
    console.log(`✓ parity OK: functions/src/content/${file} matches src/content/${file}`);
  }
}

if (drift) {
  console.error(
    "\nThe vendored content copies have drifted from the client originals. The server " +
      "firewall's soundness depends on them matching — reconcile the files (keeping only the " +
      "intended comment / .js-extension differences) before shipping.",
  );
  process.exit(1);
}
console.log("\nAll content copies are in parity.");
