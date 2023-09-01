#!/usr/bin/env node

const fg = require("fast-glob");
const { join, resolve } = require("path");
const { log } = require("./log");
const { nodeIsLts } = require("./check");
const { select } = require("@inquirer/prompts");
const { execSync } = require("child_process");
const {
  writeNpmrc,
  mayBeCleanDir,
  readTextFile,
  mayBeBackupFiles,
  defuPackageJson,
  ensureRemove,
  detectInstallCommand,
} = require("./fs");
const { copyFile, exists, ensureFile } = require("fs-extra");
const { writeFile } = require("fs/promises");
const { version } = require("process");

async function run() {
  log.success("当前 node 版本为", version);

  const originPackageFile = "package.json";
  const originLockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

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

  await writeNpmrc("registry=https://registry.npmmirror.com/");

  log.info("创建 .npmrc 并设置淘宝镜像");

  if (answer === "VueCli 实战商城后台管理系统") {
    const bootstrapCss = "bootstrap.min.css";
    const indexHtmlFile = `public/index.html`;

    const src = join(projectDir, answer, bootstrapCss);
    if (await exists(src)) {
      const output = `public/${bootstrapCss}`;
      await ensureFile(output);
      await copyFile(src, output);
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
    await writeNpmrc(
      "sass_binary_site=https://npm.taobao.org/mirrors/node-sass/",
    );
    log.success("重定向 node-sass 远程地址为淘宝镜像源");
  }

  // https://github.com/PanJiaChen/vue-element-admin/issues/4078
  if (answer === "vue-element在线教育后台系统") {
    log.info("重写 git url 配置");
    execSync(
      `git config --global url."https://".insteadOf ssh://git@`,
    );
  }

  if (answer === "Nuxt3+Vue3实战在线教育网站") {
    await mayBeCleanDir(".nuxt");
    log.info("已确保清理 .nuxt 缓存");

    const nuxtConfigText = await readTextFile("nuxt.config.ts");

    const newNuxtConfigText = nuxtConfigText.replace("autoImports", "imports")
      .replace("buildModules", "modules").replace(/import.*nuxt['"]/, "");

    await writeFile("nuxt.config.ts", newNuxtConfigText);

    log.info("已重写 nuxt.config.ts 配置文件");
  }

  await mayBeCleanDir("node_modules");

  log.info("清理 node_modules");

  await mayBeBackupFiles([
    originPackageFile,
    ...originLockFiles,
  ]);

  log.info("备份 package.json 和 lock 文件");

  await Promise.all(originLockFiles.map((f) => ensureRemove(f)));

  log.info("已确保移除 lock 文件");

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

  const install = await detectInstallCommand();

  log.info(`尝试重新执行 ${install}`);

  execSync(install, {
    stdio: "inherit",
  });

  log.success("fix 成功");
}

run();
