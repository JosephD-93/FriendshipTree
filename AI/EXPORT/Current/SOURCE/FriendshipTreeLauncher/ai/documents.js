const fs = require("fs");
const path = require("path");
const { AI_ROOT } = require("./config");

const PROJECT_INSTRUCTIONS = `You are the technical partner for the FriendshipTree software project.

READING ORDER
1. Read AI/AI_SPECIFICATION.md.
2. Read AI/MANIFEST.json.
3. Read AI/ARCHITECTURE.md and AI/DEVELOPMENT_RULES.md.
4. Read AI/CURRENT_STATE.md, AI/KNOWN_ISSUES.md and AI/NEXT_TASKS.md.
5. Use AI/FILE_INDEX.json to locate files.
6. Inspect the exact relevant source file before editing.

SOURCE OF TRUTH
- Exact current source overrides summaries.
- Canonical AI documents override old chat summaries.
- Never ask for information already present in the workspace.
- Never invent paths, package formats, IPC contracts, launchers, update systems, recovery systems, build commands or architecture.
- Flag conflicts and prefer exact current source plus the canonical AI specification.

SYSTEM BOUNDARIES
- FriendshipTree app: React/Vite, packaged for Android with Capacitor.
- FriendshipTree Studio: developer-facing desktop environment.
- Electron Launcher: user-facing dashboard and taskbar entry.
- Forge: canonical Studio update, validation, confirmation and rollback engine.
- Do not create competing launchers, updaters, Core applications or parallel Studio projects.

SAFETY
- Inspect the live Forge source before creating .ftupdate packages.
- Preserve rollback and backups.
- Preserve user data and existing persistence.
- State exact paths and working directories.
- Use complete copy-pasteable PowerShell where PowerShell is required.
- Update canonical AI documentation after architectural or workflow changes.`;

const defaults = {
  "AI_SPECIFICATION.md": `# FriendshipTree AI Specification v1

This folder is the permanent canonical knowledge system for AI-assisted FriendshipTree development.

## Authority order
1. Exact current source files.
2. AI_SPECIFICATION.md
3. MANIFEST.json
4. ARCHITECTURE.md
5. DEVELOPMENT_RULES.md
6. CURRENT_STATE.md, KNOWN_ISSUES.md and NEXT_TASKS.md
7. Historical handovers and chat summaries.

## Permanent subsystem
Canonical AI knowledge lives in:
\`C:\\Users\\Joe\\FriendshipTree\\AI\`

Generated exports live in:
\`C:\\Users\\Joe\\FriendshipTree\\AI\\EXPORT\`

## Maintenance rule
When architecture, package formats, file locations, build commands, persistence, update safety or system responsibilities change:
1. update the relevant canonical document;
2. add a dated CHANGELOG entry;
3. refresh and validate the workspace;
4. replace stale files in the ChatGPT Project.

## Missing-file workflow
A ChatGPT Project cannot directly browse the local filesystem. It must request the exact canonical path from FILE_INDEX.json. The Launcher action **Export requested file** creates an upload copy and receipt without changing source.
`,
  "ARCHITECTURE.md": `# FriendshipTree Architecture

## App
React/Vite application packaged for Android using Capacitor.

## Studio
Developer-facing desktop environment. Installed versions live under \`StudioSystem\\Versions\`.

## Launcher
Electron user-facing dashboard and taskbar entry.

## Forge
Canonical Studio package validation, staging, candidate confirmation and rollback engine:
\`StudioSystem\\Bootstrap\\FriendshipTree-Forge.ps1\`

## Update flow
Approved .ftupdate → Inbox → Forge validation → side-by-side installation → confirmation or rollback.

## Boundaries
- Launcher may invoke Forge but must not replace Forge.
- No competing launcher, updater, Core application or duplicate Studio.
- User data must not live only inside disposable version folders.
`,
  "DEVELOPMENT_RULES.md": PROJECT_INSTRUCTIONS,
  "KNOWN_ISSUES.md": "# Known Issues\n\nRecord only confirmed current issues, evidence and status.\n",
  "NEXT_TASKS.md": "# Next Tasks\n\nRecord agreed next tasks. Keep speculative ideas separate.\n",
  "CHANGELOG.md": `# AI Subsystem Changelog\n\n## ${new Date().toISOString().slice(0,10)}\n- Created the permanent JavaScript-based AI subsystem.\n`
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureCanonicalDocuments() {
  ensureDir(AI_ROOT);
  for (const [name, content] of Object.entries(defaults)) {
    const target = path.join(AI_ROOT, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, content, "utf8");
  }
  return PROJECT_INSTRUCTIONS;
}

module.exports = { ensureCanonicalDocuments, PROJECT_INSTRUCTIONS };
