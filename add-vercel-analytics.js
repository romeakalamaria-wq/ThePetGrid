const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".vercel"
]);

const analyticsBlock = `
  <!-- Vercel Web Analytics -->
  <script>
    window.va = window.va || function () {
      (window.vaq = window.vaq || []).push(arguments);
    };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
`;

let updated = 0;
let alreadyPresent = 0;
let skipped = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) {
      continue;
    }

    let html = fs.readFileSync(fullPath, "utf8");

    if (html.includes("/_vercel/insights/script.js")) {
      alreadyPresent += 1;
      console.log("ALREADY:", path.relative(ROOT, fullPath));
      continue;
    }

    const bodyCloseIndex = html.toLowerCase().lastIndexOf("</body>");

    if (bodyCloseIndex === -1) {
      skipped += 1;
      console.log("SKIPPED (no </body>):", path.relative(ROOT, fullPath));
      continue;
    }

    html =
      html.slice(0, bodyCloseIndex) +
      analyticsBlock +
      "\n" +
      html.slice(bodyCloseIndex);

    fs.writeFileSync(fullPath, html, "utf8");
    updated += 1;
    console.log("UPDATED:", path.relative(ROOT, fullPath));
  }
}

walk(ROOT);

console.log("\nDone.");
console.log("Updated:", updated);
console.log("Already had Analytics:", alreadyPresent);
console.log("Skipped:", skipped);
