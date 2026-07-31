const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  PROJECT_ROOT, AI_ROOT, EXPORT_ROOT, CURRENT_EXPORT,
  SOURCE_EXPORT, REQUESTED_ROOT, ZIP_PATH
} = require("./config");
const { ensureCanonicalDocuments, PROJECT_INSTRUCTIONS } = require("./documents");
const { sha256 } = require("./indexer");
const { validateWorkspace } = require("./validator");

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8"); }
function cleanDir(dir) { fs.rmSync(dir, { recursive: true, force: true }); ensureDir(dir); }

const INCLUDED_EXTENSIONS = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx",
  ".json", ".md", ".txt", ".html", ".css", ".scss", ".less",
  ".xml", ".gradle", ".properties", ".toml", ".yaml", ".yml",
  ".kt", ".kts", ".java", ".c", ".cc", ".cpp", ".h", ".hpp",
  ".ps1", ".psm1", ".bat", ".cmd", ".sh", ".sql", ".svg"
]);

const INCLUDED_FILENAMES = new Set([
  "gradlew", "gradlew.bat", "package-lock.json", "package.json",
  "vite.config.js", "vite.config.ts", "capacitor.config.js",
  "capacitor.config.ts", "settings.gradle", "settings.gradle.kts",
  "build.gradle", "build.gradle.kts", "gradle.properties",
  "AndroidManifest.xml", ".gitignore", ".npmrc", ".nvmrc"
]);

const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git", ".gradle", ".idea", ".cache", ".update-manager",
  "node_modules", "build", "dist", "coverage", "tmp", "temp",
  "cache", "caches", "backups", "backup", "archive", "archives",
  "quarantine", "unnecessary"
]);

const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;

function normaliseRelative(value) {
  return value.split(path.sep).join("/");
}

function shouldExcludeDirectory(relativePath, name) {
  const lowerName = name.toLowerCase();
  const lowerRelative = normaliseRelative(relativePath).toLowerCase();

  if (EXCLUDED_DIRECTORY_NAMES.has(lowerName)) return true;
  if (lowerRelative === "ai/export" || lowerRelative.startsWith("ai/export/")) return true;
  if (lowerRelative.includes("/build/intermediates/")) return true;
  if (lowerRelative.includes("/build/generated/")) return true;
  if (lowerRelative.includes("/build/outputs/")) return true;
  if (lowerRelative.includes("/.transforms/")) return true;

  return false;
}

function shouldIncludeFile(fullPath) {
  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size > MAX_SOURCE_FILE_BYTES) return false;

  const name = path.basename(fullPath);
  if (INCLUDED_FILENAMES.has(name)) return true;

  return INCLUDED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function classifyFile(relativePath) {
  const rel = normaliseRelative(relativePath);
  const lower = rel.toLowerCase();

  if (lower.startsWith("ai/")) {
    return { classification: "canonical-documentation", system: "ai-handover" };
  }
  if (lower.startsWith("friendshiptreelauncher/")) {
    return { classification: "exact-current-source", system: "launcher" };
  }
  if (lower.startsWith("friendshiptreestudio/")) {
    return { classification: "exact-current-source", system: "studio" };
  }
  if (lower.startsWith("studiosystem/bootstrap/") || lower.includes("friendshiptree-forge")) {
    return { classification: "exact-current-source", system: "forge" };
  }
  if (lower.startsWith("studiosystem/")) {
    return { classification: "exact-current-source", system: "studio-support" };
  }
  if (lower.startsWith("android/")) {
    return { classification: "exact-current-source", system: "android" };
  }
  if (
    lower.startsWith("src/") ||
    lower.startsWith("public/") ||
    lower === "package.json" ||
    lower === "package-lock.json" ||
    lower.startsWith("vite.config.") ||
    lower.startsWith("capacitor.config.") ||
    lower === "index.html"
  ) {
    return { classification: "exact-current-source", system: "app" };
  }

  return { classification: "project-support-file", system: "shared" };
}

function buildCompleteSourceIndex() {
  const records = [];
  const exclusions = {
    generatedAndDependencyFolders: [
      "node_modules", "build", "dist", ".gradle", ".git", ".idea",
      "coverage", "cache", "tmp"
    ],
    historicalAndRecoveryFolders: [
      "Archive", "backups", ".update-manager", "quarantine", "unnecessary"
    ],
    exportFolders: ["AI/EXPORT"],
    oversizedFiles: `Files larger than ${MAX_SOURCE_FILE_BYTES} bytes`
  };

  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(PROJECT_ROOT, fullPath);

      if (entry.isDirectory()) {
        if (!shouldExcludeDirectory(relativePath, entry.name)) walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !shouldIncludeFile(fullPath)) continue;

      const stat = fs.statSync(fullPath);
      const classification = classifyFile(relativePath);

      records.push({
        path: normaliseRelative(relativePath),
        canonicalPath: fullPath,
        modifiedUtc: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        sha256: sha256(fullPath),
        classification: classification.classification,
        system: classification.system
      });
    }
  }

  walk(PROJECT_ROOT);
  records.sort((a, b) => a.path.localeCompare(b.path));

  return { records, exclusions };
}

function createCoverageDocument(files, exclusions) {
  const systemCounts = {};
  for (const file of files) {
    systemCounts[file.system] = (systemCounts[file.system] || 0) + 1;
  }

  const lines = [
    "# Source Coverage",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "This handover contains the meaningful editable source and documentation",
    "from the live FriendshipTree project. It is not a byte-for-byte backup.",
    "",
    "## Included systems",
    "",
    `- App source and configuration: ${systemCounts.app || 0} files`,
    `- Android project and widget source: ${systemCounts.android || 0} files`,
    `- FriendshipTree Studio: ${(systemCounts.studio || 0) + (systemCounts["studio-support"] || 0)} files`,
    `- FriendshipTree Launcher: ${systemCounts.launcher || 0} files`,
    `- Forge update/recovery system: ${systemCounts.forge || 0} files`,
    `- Canonical AI documentation: ${systemCounts["ai-handover"] || 0} files`,
    "",
    "The Launcher is deliberately included even if it has not yet made installation easier.",
    "It is part of the real current system and must be visible to the next AI.",
    "",
    "## Deliberately excluded",
    "",
    "- Dependencies such as node_modules.",
    "- Android, Gradle, Vite and Electron build outputs.",
    "- Caches and generated intermediates.",
    "- Old archives, updater backups, quarantine and recovery copies.",
    "- The AI export folder itself, to prevent recursive exports.",
    "- Binary or oversized files that are not useful editable source.",
    "",
    "## Authority labels",
    "",
    "- canonical-documentation: project rules and explanatory documents.",
    "- exact-current-source: copied directly from the live canonical project.",
    "- project-support-file: shared configuration or supporting source.",
    "- Historical and recovery material is excluded from this package.",
    "",
    "## Build statement",
    "",
    "The package is intended to contain the handwritten source and configuration",
    "needed to inspect and modify the App, Android project, Studio, Launcher and Forge.",
    "It does not contain downloaded dependencies or compiled build outputs.",
    "A build still requires the normal local toolchain and dependency installation.",
    "",
    "## Exclusion record",
    "",
    "```json",
    JSON.stringify(exclusions, null, 2),
    "```",
    ""
  ];

  fs.writeFileSync(path.join(AI_ROOT, "SOURCE_COVERAGE.md"), lines.join("\n"), "utf8");
}

function updateCanonicalState() {
  ensureCanonicalDocuments();

  let source = buildCompleteSourceIndex();
  createCoverageDocument(source.records, source.exclusions);
  source = buildCompleteSourceIndex();

  const files = source.records;
  const counts = files.reduce((result, file) => {
    result[file.system] = (result[file.system] || 0) + 1;
    return result;
  }, {});

  const manifest = {
    format: "friendshiptree-complete-ai-handover-v1",
    generatedUtc: new Date().toISOString(),
    projectName: "FriendshipTree",
    canonicalRoot: PROJECT_ROOT,
    aiRoot: AI_ROOT,
    purpose: "Transfer the meaningful live source and documentation into a ChatGPT Project.",
    sourceAuthority: "Files classified exact-current-source were copied from the canonical project root.",
    systems: {
      app: {
        path: PROJECT_ROOT,
        role: "React/Vite application packaged with Capacitor Android",
        indexedFiles: counts.app || 0
      },
      android: {
        path: path.join(PROJECT_ROOT, "android"),
        role: "Capacitor Android project and native widget implementation",
        indexedFiles: counts.android || 0
      },
      studio: {
        path: path.join(PROJECT_ROOT, "FriendshipTreeStudio"),
        versions: path.join(PROJECT_ROOT, "StudioSystem", "Versions"),
        indexedFiles: (counts.studio || 0) + (counts["studio-support"] || 0)
      },
      launcher: {
        path: path.join(PROJECT_ROOT, "FriendshipTreeLauncher"),
        role: "Electron launcher and installation/update dashboard",
        indexedFiles: counts.launcher || 0,
        inclusionNote: "Included as real current source even though it has not yet achieved its intended ease-of-use."
      },
      forge: {
        path: path.join(PROJECT_ROOT, "StudioSystem", "Bootstrap", "FriendshipTree-Forge.ps1"),
        role: "Canonical update and recovery engine",
        indexedFiles: counts.forge || 0
      }
    },
    exclusions: source.exclusions,
    export: {
      currentFolder: CURRENT_EXPORT,
      zip: ZIP_PATH,
      requestedFiles: REQUESTED_ROOT
    },
    indexedFileCount: files.length
  };

  writeJson(path.join(AI_ROOT, "MANIFEST.json"), manifest);
  writeJson(path.join(AI_ROOT, "FILE_INDEX.json"), {
    format: "friendshiptree-complete-file-index-v1",
    generatedUtc: new Date().toISOString(),
    canonicalRoot: PROJECT_ROOT,
    note: "Each record identifies the exact live file copied into SOURCE.",
    fields: [
      "path", "canonicalPath", "modifiedUtc", "sizeBytes",
      "sha256", "classification", "system"
    ],
    files
  });

  fs.writeFileSync(path.join(AI_ROOT, "CURRENT_STATE.md"),
`# Current State

Generated from the live project: ${new Date().toLocaleString()}

- Canonical root: \`${PROJECT_ROOT}\`
- Canonical AI folder: \`${AI_ROOT}\`
- Meaningful source and documentation files indexed: ${files.length}
- App files: ${counts.app || 0}
- Android files: ${counts.android || 0}
- Studio files: ${(counts.studio || 0) + (counts["studio-support"] || 0)}
- Launcher files: ${counts.launcher || 0}
- Forge files: ${counts.forge || 0}
- Current export folder: \`${CURRENT_EXPORT}\`
- Current transport ZIP: \`${ZIP_PATH}\`

The Launcher is included as exact current source. Its inclusion does not claim
that it successfully made installation or updating easier.

Generated folders, dependencies, archives and build outputs are deliberately excluded.
See SOURCE_COVERAGE.md and FILE_INDEX.json for exact coverage and proof.

Behavioural status must still be confirmed against source and real test results.
`, "utf8");

  return buildCompleteSourceIndex().records;
}

function validate() {
  updateCanonicalState();
  const status = validateWorkspace();
  writeJson(path.join(AI_ROOT, "WORKSPACE_STATUS.json"), status);

  const lines = [
    "# AI Workspace Validation Report", "",
    `Generated: ${new Date().toLocaleString()}`, "",
    `Overall: **${status.healthy ? "PASS" : "FAIL"}**`, ""
  ];

  for (const result of status.results) {
    lines.push(`- ${result.passed ? "PASS" : "FAIL"}: ${result.check} - \`${result.target}\``);
  }

  fs.writeFileSync(path.join(AI_ROOT, "VALIDATION_REPORT.md"), lines.join("\n"), "utf8");
  return status;
}

function copyFilePreservingPath(record) {
  const destination = path.join(SOURCE_EXPORT, record.path);
  ensureDir(path.dirname(destination));
  fs.copyFileSync(record.canonicalPath, destination);
}

function createZip() {
  fs.rmSync(ZIP_PATH, { force: true });
  const result = spawnSync("tar.exe", ["-a", "-c", "-f", ZIP_PATH, "."], {
    cwd: CURRENT_EXPORT,
    windowsHide: true,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(`ZIP creation failed: ${result.stderr || result.stdout || "tar.exe error"}`);
  }
}

function buildReadFirst(files, status) {
  const aiDocs = files
    .filter(file => normaliseRelative(file.path).toLowerCase().startsWith("ai/"))
    .map(file => path.basename(file.path));

  const preferredOrder = [
    "PROJECT_CONSTITUTION.md",
    "00-READ-FIRST.md",
    "AI_SPECIFICATION.md",
    "MANIFEST.json",
    "SOURCE_COVERAGE.md",
    "ARCHITECTURE.md",
    "DEVELOPMENT_RULES.md",
    "CURRENT_STATE.md",
    "KNOWN_ISSUES.md",
    "NEXT_TASKS.md",
    "CHANGELOG.md",
    "FILE_INDEX.json",
    "VALIDATION_REPORT.md",
    "WORKSPACE_STATUS.json"
  ];

  const orderedDocs = [
    ...preferredOrder.filter(name => name !== "00-READ-FIRST.md" && aiDocs.includes(name)),
    ...aiDocs.filter(name => !preferredOrder.includes(name)).sort()
  ];

  return [
    "# FriendshipTree - Read First",
    "",
    "This package contains the meaningful live source and documentation for:",
    "- the React app;",
    "- the Android project and widgets;",
    "- FriendshipTree Studio;",
    "- the FriendshipTree Launcher;",
    "- Forge.",
    "",
    "It deliberately excludes dependencies, build output, caches, archives and backups.",
    "",
    "Read in this order:",
    "",
    ...orderedDocs.map((name, index) => `${index + 1}. SOURCE/AI/${name}`),
    `${orderedDocs.length + 1}. SOURCE/AI/FILE_INDEX.json to locate exact live source`,
    `${orderedDocs.length + 2}. The exact relevant source files under SOURCE`,
    "",
    "Rules:",
    "- Read PROJECT_CONSTITUTION.md before architectural decisions.",
    "- Treat exact-current-source files as the copied live implementation.",
    "- Treat canonical-documentation as explanatory and governing material.",
    "- Do not treat excluded archives or generated build output as current source.",
    "- Report conflicts instead of silently choosing.",
    "- Do not claim testing that has not actually happened.",
    "",
    `Validation: ${status.healthy ? "PASS" : "FAIL"}`,
    `Generated: ${new Date().toLocaleString()}`,
    ""
  ].join("\n");
}

function refresh() {
  const files = updateCanonicalState();
  const status = validate();
  const finalFiles = buildCompleteSourceIndex().records;

  cleanDir(CURRENT_EXPORT);
  ensureDir(SOURCE_EXPORT);

  for (const record of finalFiles) copyFilePreservingPath(record);

  fs.writeFileSync(
    path.join(CURRENT_EXPORT, "00-READ-FIRST.md"),
    buildReadFirst(finalFiles, status),
    "utf8"
  );

  fs.writeFileSync(
    path.join(CURRENT_EXPORT, "PROJECT-INSTRUCTIONS.txt"),
    PROJECT_INSTRUCTIONS,
    "utf8"
  );

  ensureDir(EXPORT_ROOT);
  createZip();

  return {
    status,
    zipPath: ZIP_PATH,
    currentExport: CURRENT_EXPORT,
    fileCount: finalFiles.length,
    includedSystems: ["app", "android", "studio", "launcher", "forge"],
    packageType: "meaningful-complete-source-handover"
  };
}

function exportRequestedFile(sourcePath) {
  const resolved = path.resolve(sourcePath);
  const root = path.resolve(PROJECT_ROOT) + path.sep;

  if (!resolved.toLowerCase().startsWith(root.toLowerCase())) {
    throw new Error("Selected file is outside the FriendshipTree project.");
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error("Selected file does not exist.");
  }

  ensureDir(REQUESTED_ROOT);
  const relative = path.relative(PROJECT_ROOT, resolved);
  const safeName = relative.replace(/[\\/]/g, "__");
  const destination = path.join(REQUESTED_ROOT, safeName);

  fs.copyFileSync(resolved, destination);
  writeJson(`${destination}.receipt.json`, {
    exportedUtc: new Date().toISOString(),
    canonicalPath: resolved,
    relativePath: normaliseRelative(relative),
    exportedCopy: destination,
    modifiedUtc: fs.statSync(resolved).mtime.toISOString(),
    sizeBytes: fs.statSync(resolved).size,
    sha256: sha256(resolved)
  });

  return destination;
}

function initialize() {
  ensureCanonicalDocuments();
  updateCanonicalState();
  return validate();
}

module.exports = {
  initialize,
  refresh,
  validate,
  exportRequestedFile,
  PROJECT_INSTRUCTIONS,
  AI_ROOT,
  ZIP_PATH,
  REQUESTED_ROOT
};
