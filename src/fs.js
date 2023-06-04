const { join } = require("path");
const { defu } = require("defu");
const {
  emptyDir,
  ensureDir,
  exists,
  lstat,
  copyFile,
  readFile,
  writeFile,
  remove,
} = require(
  "fs-extra",
);

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
  return mtime.toLocaleString().replace(/:|\/|\\| /g, "-");
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

module.exports = {
  readJson,
  writeJson,
  ensureRemove,
  readTextFile,
  mayBeCleanDir,
  defuPackageJson,
  mayBeBackupFile,
  mayBeBackupFiles,
  getFileFormatedMtime,
};
