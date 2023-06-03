#!/usr/bin/env node

const fg = require("fast-glob");
const { defu } = require("defu");
const { resolve, join } = require("path");
const { ensureDir, remove } = require("fs-extra");
const { select } = require("@inquirer/prompts");
const { consola } = require("consola");
const { existsSync } = require("fs");

const { copyFile, lstat, readFile, writeFile } = require("fs/promises");

const log = consola.withTag("try-fix-projects");

async function run() {
  const backups = "backups";
  const originPackageJson = "package.json";
  const originPackageJsonLock = "package-lock.json";
  const projectDir = resolve(__dirname, "../projects");
  const projects = await fg("*", {
    onlyDirectories: true,
    cwd: projectDir,
  });

  const choices = projects.map((p) => ({ name: p, value: p }));

  const answer = await select({
    message: "选择你当前的课程名称?",
    choices,
  });

  await ensureDir(backups);
  const packageJsonMtime = await getFileFormatedMtime(originPackageJson);
  const backupFile = join(
    backups,
    `${packageJsonMtime}-${originPackageJson}`,
  );

  await copyFile(
    originPackageJson,
    backupFile,
  );

  if (existsSync(originPackageJsonLock)) {
    const backupLockFile = join(
      backups,
      `${packageJsonMtime}-${originPackageJsonLock}`,
    );

    await copyFile(originPackageJsonLock, backupLockFile);

    await remove(originPackageJsonLock);

    log.info(`已备份 -> ${backupLockFile}`);
  }

  log.info(`已备份 -> ${backupFile}`);

  const originPackageJsonText = await readFile(originPackageJson, {
    encoding: "utf-8",
  });

  const targetPackageJsonText = await readFile(
    join(projectDir, answer, nodeIsLts() ? "package.json" : "old-package.json"),
    { encoding: "utf-8" },
  );

  const finalPackageJson = defu(
    JSON.parse(targetPackageJsonText),
    JSON.parse(originPackageJsonText),
  );

  await writeFile(originPackageJson, JSON.stringify(finalPackageJson, null, 2));

  log.info(`${originPackageJson} 合并成功`);

  log.success("fix 成功, 请重新执行 npm install");
}

run();

async function getFileFormatedMtime(file) {
  const { mtime } = await lstat(file);
  return mtime.toLocaleString().replace(/:|\/|\\| /g, "-");
}

function nodeIsLts() {
  const [major] = process.version.slice(1).split(".");
  return Number(major) >= 18;
}
