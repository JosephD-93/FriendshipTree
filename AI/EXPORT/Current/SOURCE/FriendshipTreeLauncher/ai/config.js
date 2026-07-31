const path = require("path");

const PROJECT_ROOT = "C:\\Users\\Joe\\FriendshipTree";
const AI_ROOT = path.join(PROJECT_ROOT, "AI");
const EXPORT_ROOT = path.join(AI_ROOT, "EXPORT");
const CURRENT_EXPORT = path.join(EXPORT_ROOT, "Current");
const SOURCE_EXPORT = path.join(CURRENT_EXPORT, "SOURCE");
const REQUESTED_ROOT = path.join(EXPORT_ROOT, "Requested-Files");
const ZIP_PATH = path.join(EXPORT_ROOT, "FriendshipTree-AI-Workspace.zip");

const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", ".gradle", "dist", "build", "coverage",
  ".idea", ".vscode", "Archive", "Backups", "Quarantine", "Staging", "EXPORT"
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".apk", ".aab", ".keystore", ".jks", ".class", ".dex", ".so", ".dll",
  ".exe", ".msi", ".zip", ".ftupdate", ".7z", ".rar", ".tmp", ".log"
]);

const INCLUDED_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".css", ".html",
  ".ps1", ".cmd", ".bat", ".xml", ".gradle", ".properties", ".yml", ".yaml",
  ".toml", ".env", ".gitignore", ".npmrc", ".svg"
]);

const ALWAYS_INCLUDE = new Set([
  "package.json", "package-lock.json", "vite.config.js", "vite.config.ts",
  "capacitor.config.json", "capacitor.config.js", "capacitor.config.ts",
  "tailwind.config.js", "postcss.config.js", "AndroidManifest.xml",
  "settings.gradle", "build.gradle", "gradle.properties", ".gitignore", ".aiignore"
]);

module.exports = {
  PROJECT_ROOT, AI_ROOT, EXPORT_ROOT, CURRENT_EXPORT, SOURCE_EXPORT,
  REQUESTED_ROOT, ZIP_PATH, EXCLUDED_DIRS, EXCLUDED_EXTENSIONS,
  INCLUDED_EXTENSIONS, ALWAYS_INCLUDE
};
