const { join } = require("path");
const { defu } = require("./normalize");
const {
  emptyDir,
  ensureDir,
  exists,
  lstat,
  copyFile,
  readFile,
  writeFile,
  remove,
  appendFile,
} = require("fs-extra");

async function mayBeCleanDir(dir) {
  if (await exists(dir)) {
    await emptyDir(dir);
  }
}

async function mayBeBackupFile(file, outout = "backups") {
  await ensureDir(outout);
  if (!(await exists(file))) {
    return;
  }
  const mtime = await getFileFormatedMtime(file);
  await copyFile(file, join(outout, `${mtime}-${file}`));
}

async function mayBeBackupFiles(files, outout = "backups") {
  return Promise.all(files.map((file) => mayBeBackupFile(file, outout)));
}

async function getFileFormatedMtime(file) {
  const { mtime } = await lstat(file);
  return `${mtime.getFullYear()}-${mtime.getMonth()}-${mtime.getDay()}-${mtime.getHours()}-${mtime.getMinutes()}-${mtime.getSeconds()}-${mtime.getMilliseconds()}`;
}

async function defuPackageJson(target, origin) {
  const [targetPackageJson, originPackageJson] = await Promise.all(
    [target, origin].map((file) => readJson(file)),
  );

  return writeJson(origin, defu(targetPackageJson, originPackageJson));
}

async function readTextFile(file) {
  return readFile(file, { encoding: "utf-8" });
}

async function readJson(file) {
  const text = await readTextFile(file);
  return JSON.parse(text);
}

async function writeJson(target, json) {
  return writeFile(target, JSON.stringify(json, null, 2));
}

async function ensureRemove(file) {
  await remove(file).catch(() => {});
}

async function ensureEmpty(file) {
  await writeFile(file, "").catch(() => {});
}

async function writeNpmrc(
  record = "registry=https://registry.npmmirror.com/",
) {
  const rcFile = ".npmrc";
  if (!(await exists(rcFile))) {
    await writeFile(rcFile, record, { encoding: "utf-8" });
  } else {
    const rcText = await readFile(rcFile, { encoding: "utf-8" });
    if (!rcText.includes(record)) {
      await appendFile(rcFile, "\n" + record);
    }
  }
}

async function detectInstallCommand() {
  if (await exists("pnpm-lock.yaml")) {
    return "pnpm install";
  }

  if (await exists("yarn.lock")) {
    return "yarn";
  }

  return "npm install";
}

module.exports = {
  readJson,
  writeJson,
  writeNpmrc,
  ensureEmpty,
  ensureRemove,
  readTextFile,
  mayBeCleanDir,
  defuPackageJson,
  mayBeBackupFile,
  mayBeBackupFiles,
  getFileFormatedMtime,
  detectInstallCommand,
};
