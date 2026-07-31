const path = require("path");
const { execFile } = require("child_process");
const { syncConfirmedStudio } = require("./canonical-studio-sync");

const MAX_OUTPUT = 8 * 1024 * 1024;
const UNSAFE_PARTS = new Set([
  "node_modules", ".git", "dist", "build", "backups", "logs", "incoming",
  "updates", "reports", "cache", "caches", "temp", "tmp",
  "bootstrapbackups", "generated builds", "downloads"
]);

const UNSAFE_PREFIXES = [
  ".cleanup-audit/",
  ".friendshiptree-patches/",
  ".migration-v3/",
  ".studio/",
  "ai/export/",
  "friendshiptreestudio/versions/",
  "studiosystem/delivery/",
  "studiosystem/versions/"
];

function runGit(projectRoot, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile("git.exe", args, {
      cwd: projectRoot,
      windowsHide: true,
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || stdout || error.message).trim();
        reject(new Error(detail || `Git failed: git ${args.join(" ")}`));
        return;
      }
      const output = String(stdout || "");
      resolve(options.preserveWhitespace ? output : output.trim());
    });
  });
}

function normaliseRepoPath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
}

function isUnsafe(repoPath) {
  const normalised = normaliseRepoPath(repoPath).toLowerCase();
  if (UNSAFE_PREFIXES.some(prefix => normalised === prefix.slice(0, -1) || normalised.startsWith(prefix))) return true;
  const parts = normalised.split("/").filter(Boolean);
  if (parts[0] === "studiosystem" && ["versions", "backups", "logs", "incoming", "updates"].includes(parts[1])) return true;
  if (parts[0] === ".studio") return true;
  return parts.some(part => UNSAFE_PARTS.has(part));
}

function parsePorcelainZ(raw) {
  const fields = String(raw || "").split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const record = fields[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    let repoPath = normaliseRepoPath(record.slice(3));
    let fromPath = null;
    if (status.includes("R") || status.includes("C")) {
      fromPath = repoPath;
      repoPath = normaliseRepoPath(fields[++index] || "");
    }
    if (!repoPath) continue;
    const unsafe = isUnsafe(repoPath);
    entries.push({
      status,
      path: repoPath,
      fromPath,
      includedByDefault: !unsafe,
      unsafe,
      reason: unsafe ? "Runtime, generated, backup or dependency path" : null
    });
  }
  return entries;
}

async function assertRepository(projectRoot) {
  const inside = await runGit(projectRoot, ["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") throw new Error("FriendshipTree is not inside a Git repository.");
  const top = path.resolve(await runGit(projectRoot, ["rev-parse", "--show-toplevel"]));
  if (top.toLowerCase() !== path.resolve(projectRoot).toLowerCase()) {
    throw new Error(`Git root mismatch. Expected ${projectRoot}, found ${top}.`);
  }
}

async function getStatus(projectRoot) {
  await assertRepository(projectRoot);
  const canonicalSync = syncConfirmedStudio(projectRoot);
  const [branch, remote, upstream, raw] = await Promise.all([
    runGit(projectRoot, ["branch", "--show-current"]),
    runGit(projectRoot, ["remote", "get-url", "origin"]).catch(() => ""),
    runGit(projectRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]).catch(() => ""),
    runGit(projectRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"], { preserveWhitespace: true })
  ]);
  const entries = parsePorcelainZ(raw);
  return {
    branch: branch || "(detached)",
    remote: remote || null,
    upstream: upstream || null,
    entries,
    safeCount: entries.filter(entry => !entry.unsafe).length,
    excludedCount: entries.filter(entry => entry.unsafe).length,
    canonicalSync
  };
}

async function verifyRemoteState(projectRoot) {
  const upstream = await runGit(projectRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
    .catch(() => "");
  if (!upstream) throw new Error("This branch has no upstream GitHub branch. Configure it once before using Launcher backup.");
  await runGit(projectRoot, ["fetch", "--prune"]);
  const counts = await runGit(projectRoot, ["rev-list", "--left-right", "--count", `HEAD...${upstream}`]);
  const [ahead, behind] = counts.split(/\s+/).map(Number);
  if (behind > 0) throw new Error(`GitHub contains ${behind} newer commit(s). Pull and review them before backing up.`);
  return { upstream, ahead: ahead || 0, behind: behind || 0 };
}

async function commitAndPush(projectRoot, selectedPaths, message, progress = () => {}) {
  await assertRepository(projectRoot);
  const current = await getStatus(projectRoot);
  const allowed = new Map(current.entries.filter(entry => !entry.unsafe).map(entry => [entry.path, entry]));
  const paths = [...new Set((selectedPaths || []).map(normaliseRepoPath).filter(Boolean))];
  if (!paths.length) throw new Error("Select at least one safe change to back up.");
  const rejected = paths.filter(repoPath => !allowed.has(repoPath));
  if (rejected.length) throw new Error(`Selection changed or contains an excluded path: ${rejected.join(", ")}`);

  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw new Error("Enter a commit message describing this backup.");
  if (cleanMessage.length > 120) throw new Error("Keep the commit message to 120 characters or fewer.");

  progress("Checking GitHub for newer commits…");
  const remoteState = await verifyRemoteState(projectRoot);
  const alreadyStaged = await runGit(projectRoot, ["diff", "--cached", "--name-only"]);
  if (alreadyStaged) {
    throw new Error("Git already has staged changes. Unstage or commit them before using Launcher backup so nothing is included accidentally.");
  }
  progress(`Staging ${paths.length} selected change(s)…`);
  let staged;
  try {
    await runGit(projectRoot, ["add", "--", ...paths]);
    staged = await runGit(projectRoot, ["diff", "--cached", "--name-status"]);
    if (!staged) throw new Error("The selected paths produced no staged changes.");
  } catch (error) {
    // A failed multi-path add can leave earlier paths staged. Restore only the
    // index entries selected by this operation; working files are untouched.
    await runGit(projectRoot, ["reset", "--quiet", "--", ...paths]).catch(() => {});
    throw error;
  }

  progress("Creating local backup commit…");
  await runGit(projectRoot, ["commit", "-m", cleanMessage]);
  const commit = await runGit(projectRoot, ["rev-parse", "--short", "HEAD"]);
  progress(`Pushing ${commit} to ${remoteState.upstream}…`);
  try {
    await runGit(projectRoot, ["push"]);
  } catch (error) {
    throw new Error(`Commit ${commit} was created locally, but push failed: ${error.message}`);
  }
  return { ok: true, commit, upstream: remoteState.upstream, staged };
}

module.exports = { getStatus, commitAndPush };
