#!/usr/bin/env node

const fg = require("fast-glob");
const { resolve, join } = require("path");
const { ensureDir } = require("fs-extra");

const { select } = require("@inquirer/prompts");
const { copyFile, lstat, readFile, writeFile } = require("fs/promises");
const { defu } = require("defu");

async function run() {
  const backups = "backups";
  const originPackageJson = "package.json";
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

  const time = await getFileFormatTime(originPackageJson);

  await copyFile(
    "package.json",
    join(
      backups,
      `${time}-package.json`,
    ),
  );

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
}

run();

async function getFileFormatTime(file) {
  const { mtime } = await lstat(file);
  return mtime.toLocaleString().replace(/:|\/|\\| /g, "-");
}

function nodeIsLts() {
  const [major] = process.version.slice(1).split(".");
  return Number(major) >= 18;
}
