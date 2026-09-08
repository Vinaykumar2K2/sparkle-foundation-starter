// GitHub Pages post-build step:
// - .nojekyll so files/folders starting with "_" (e.g. _shell.html) are served
// - 404.html fallback so deep links and refreshes boot the SPA shell
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "dist", "client");

writeFileSync(join(out, ".nojekyll"), "");

const shell = join(out, "_shell.html");
const index = join(out, "index.html");
const source = existsSync(shell) ? shell : index;
copyFileSync(source, join(out, "404.html"));

console.log("[pages] wrote .nojekyll and 404.html");
