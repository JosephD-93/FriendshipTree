const fs = require("fs");
const path = require("path");
const { AI_ROOT, PROJECT_ROOT } = require("./config");

const REQUIRED_AI_FILES = [
  "AI_SPECIFICATION.md", "MANIFEST.json", "ARCHITECTURE.md",
  "DEVELOPMENT_RULES.md", "CURRENT_STATE.md", "KNOWN_ISSUES.md",
  "NEXT_TASKS.md", "CHANGELOG.md", "FILE_INDEX.json"
];

function validateWorkspace() {
  const results = [];
  for (const name of REQUIRED_AI_FILES) {
    const target = path.join(AI_ROOT, name);
    results.push({ check: "Required canonical file", target, passed: fs.existsSync(target) });
  }

  for (const [check, target] of [
    ["Canonical Forge source", path.join(PROJECT_ROOT, "StudioSystem", "Bootstrap", "FriendshipTree-Forge.ps1")],
    ["Electron Launcher main process", path.join(PROJECT_ROOT, "FriendshipTreeLauncher", "main.js")]
  ]) {
    results.push({ check, target, passed: fs.existsSync(target) });
  }

  const failed = results.filter(r => !r.passed);
  return {
    validatedUtc: new Date().toISOString(),
    healthy: failed.length === 0,
    passed: results.length - failed.length,
    failed: failed.length,
    results
  };
}

module.exports = { validateWorkspace };
