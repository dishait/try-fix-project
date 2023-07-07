const { join } = require("path");
const { createDefu } = require("defu");
const {
  emptyDir,
  ensureDir,
  exists,
  lstat,
  copyFile,
  readFile,
  writeFile,
  remove,
} = require("fs-extra");

const defu = createDefu((defaultObject, key, value) => {
  if (Array.isArray(value)) {
    // 保持数组类型是唯一的
    defaultObject[key] = [...new Set([defaultObject[key], value].flat())];
    return true;
  }
  return false;
});

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

async function mayBeCreateNpmrcTaobao() {
  if (!(await exists('.npmrc'))) {
    await writeFile('.npmrc', "registry=https://registry.npmmirror.com/", {
      encoding: 'utf-8'
    })
  }
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
  mayBeCreateNpmrcTaobao,
};
