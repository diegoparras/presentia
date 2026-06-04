const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
} = require("@puppeteer/browsers");

const buildId = (process.env.EXPORT_CHROME_BUILD_ID || "146.0.7680.76").trim();
const cacheDir = path.join(__dirname, "..", "resources", "chromium");
const manifestPath = path.join(cacheDir, "presenton-runtime.json");

function getRevisionDir(platform) {
  return path.join(cacheDir, Browser.CHROME, `${platform}-${buildId}`);
}

function runtimeLooksComplete(executablePath) {
  if (!fs.existsSync(executablePath)) {
    return false;
  }
  if (process.platform !== "win32") {
    return true;
  }

  const chromeDir = path.dirname(executablePath);
  return ["chrome.dll", "icudtl.dat"].every((fileName) =>
    fs.existsSync(path.join(chromeDir, fileName))
  );
}

function validateExecutable(executablePath) {
  if (!runtimeLooksComplete(executablePath)) {
    return false;
  }

  const result = spawnSync(
    executablePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--no-first-run",
      "--disable-extensions",
      "--dump-dom",
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: 15000,
      windowsHide: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    return false;
  }
  return (result.stdout || "").toLowerCase().includes("<html");
}

function writeManifest(platform, executablePath) {
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        browser: Browser.CHROME,
        buildId,
        platform,
        nodePlatform: process.platform,
        arch: process.arch,
        executable: path.relative(cacheDir, executablePath),
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

function findAppBundle(executablePath) {
  let current = path.dirname(executablePath);
  while (true) {
    if (current.endsWith(".app")) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function directoryContainsSymlink(rootDir) {
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const stats = fs.lstatSync(fullPath);
      if (stats.isSymbolicLink()) {
        return true;
      }
      if (stats.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
  return false;
}

function normalizeMacBundleForPackaging(executablePath) {
  if (process.platform !== "darwin") {
    return;
  }

  const appBundlePath = findAppBundle(executablePath);
  if (!appBundlePath || !fs.existsSync(appBundlePath)) {
    return;
  }

  if (!directoryContainsSymlink(appBundlePath)) {
    return;
  }

  const normalizedPath = `${appBundlePath}.normalized`;
  const backupPath = `${appBundlePath}.backup`;
  fs.rmSync(normalizedPath, { recursive: true, force: true });
  fs.rmSync(backupPath, { recursive: true, force: true });

  console.log(`[Chromium] Normalizing macOS app bundle symlinks: ${appBundlePath}`);
  fs.cpSync(appBundlePath, normalizedPath, { recursive: true, dereference: true });
  fs.renameSync(appBundlePath, backupPath);
  try {
    fs.renameSync(normalizedPath, appBundlePath);
    fs.rmSync(backupPath, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(appBundlePath) && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, appBundlePath);
    }
    throw error;
  }
}

function removeIncompleteRuntime(platform, executablePath) {
  if (validateExecutable(executablePath)) {
    return;
  }

  const revisionDir = getRevisionDir(platform);
  if (!fs.existsSync(revisionDir)) {
    return;
  }

  console.log(
    `[Chromium] Removing incomplete runtime before download: ${revisionDir}`
  );
  fs.rmSync(revisionDir, { recursive: true, force: true });
}

async function main() {
  if (process.env.SKIP_BUNDLED_CHROMIUM === "1") {
    console.log("[Chromium] SKIP_BUNDLED_CHROMIUM=1; leaving runtime unbundled.");
    return;
  }

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error(`Unsupported platform for bundled Chromium: ${process.platform}-${process.arch}`);
  }

  const options = {
    browser: Browser.CHROME,
    buildId,
    cacheDir,
    platform,
  };
  const executablePath = computeExecutablePath(options);
  if (runtimeLooksComplete(executablePath)) {
    if (!validateExecutable(executablePath)) {
      removeIncompleteRuntime(platform, executablePath);
    } else {
      normalizeMacBundleForPackaging(executablePath);
      if (!validateExecutable(executablePath)) {
        removeIncompleteRuntime(platform, executablePath);
      } else {
      writeManifest(platform, executablePath);
      console.log(`[Chromium] Bundled runtime already exists: ${executablePath}`);
      return;
      }
    }
  }

  if (validateExecutable(executablePath)) {
    writeManifest(platform, executablePath);
    return;
  }

  removeIncompleteRuntime(platform, executablePath);
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`[Chromium] Downloading Chrome for Testing ${buildId} into ${cacheDir}`);
  await install({
    ...options,
    downloadProgressCallback(downloadedBytes, totalBytes) {
      if (totalBytes <= 0) return;
      const percent = Math.floor((downloadedBytes / totalBytes) * 100);
      process.stdout.write(`\r[Chromium] ${percent}%`);
    },
  });
  process.stdout.write("\n");

  normalizeMacBundleForPackaging(executablePath);
  if (!validateExecutable(executablePath)) {
    throw new Error(`Chromium install finished, but executable was not found at ${executablePath}`);
  }
  writeManifest(platform, executablePath);
  console.log(`[Chromium] Bundled runtime ready: ${executablePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
