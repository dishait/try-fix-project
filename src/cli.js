#!/usr/bin/env node

const fg = require("fast-glob");
const { join, resolve } = require("path");
const { log } = require("./log");
const { nodeIsLts } = require("./check");
const { select } = require("@inquirer/prompts");
const { execSync } = require("child_process");
const {
  mayBeCleanDir,
  readTextFile,
  mayBeBackupFiles,
  defuPackageJson,
  ensureRemove,
  mayBeCreateNpmrcTaobao,
} = require("./fs");
const { copyFile } = require("fs-extra");
const { writeFile } = require("fs/promises");
const { version } = require("process");

async function run() {
  log.success("当前 node 版本为", version);

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

  await mayBeCreateNpmrcTaobao();

  log.info("创建 .npmrc 并设置淘宝镜像");

  if (answer === "VueCli 实战商城后台管理系统") {
    const bootstrapCss = "bootstrap.min.css";
    const indexHtmlFile = `public/index.html`;
    await copyFile(
      join(projectDir, answer, bootstrapCss),
      `public/${bootstrapCss}`,
    );
    const indexHtmlText = await readTextFile(indexHtmlFile);

    await writeFile(
      indexHtmlFile,
      indexHtmlText.replace(
        /https.*bootstrap.min.css[\w\W]*?>/,
        `/${bootstrapCss}">`,
      ),
    );
    log.success("bootstrap 已本地化");
  }

  // https://github.com/PanJiaChen/vue-element-admin/issues/4078
  if (answer === "vue-element在线教育后台系统") {
    log.info("重写 git url 配置");
    execSync(
      `git config --global url."https://".insteadOf ssh://git@`,
    );
  }

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

  // log.info("尝试重新执行 npm install");

  // execSync("npm install", {
  //   stdio: "inherit",
  // });

  log.success("fix 成功");
}

run();
