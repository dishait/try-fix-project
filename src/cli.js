#!/usr/bin/env node

const fg = require("fast-glob");
const { join, resolve } = require("path");
const { log } = require("./log");
const { nodeIsLts } = require("./check");
const { execSync } = require("child_process");
const { mayBeCleanDir, mayBeBackupFiles, defuPackageJson, ensureRemove } =
  require("./fs");

async function run() {
  const originPackageFile = "package.json";
  const originPackageLockFile = "package-lock.json";
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

  await mayBeCleanDir("node_modules");

  log.info("清理 node_modules");

  await mayBeBackupFiles([originPackageFile, originPackageLockFile]);

  log.info("备份 package.json 和 package-lock.json");

  await ensureRemove(originPackageLockFile);

  log.info("已确保移除 package-lock.json");

  const targetPackageFile = join(
    projectDir,
    answer,
    nodeIsLts() ? "package.json" : "old-package.json",
  );

  await defuPackageJson(
    targetPackageFile,
    originPackageFile,
  );

  log.info("合并 package.json");

  log.info("fix 成功，尝试重新执行 npm install");

  execSync("npm install");

  log.success("fix 已成功");
}

run();
