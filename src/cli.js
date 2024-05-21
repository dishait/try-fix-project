#!/usr/bin/env node

import { loadFile } from "magicast";
import { glob as fg } from "fast-glob";
import { log } from "./log";
import { dirname, join, resolve } from "path";
import { isModernNode } from "./check";
import { execSync } from "child_process";
import {
  defuPackageJson,
  detectInstallCommand,
  ensureEmpty,
  find,
  mayBeBackupFiles,
  mayBeCleanDir,
  readJson,
  readTextFile,
  writeJson,
  writeNpmrc,
} from "./fs";
import { copyFile, ensureFile, exists, outputFile, remove } from "fs-extra";
import { writeFile } from "fs/promises";
import { version } from "process";
import { getPackageInfo } from "local-pkg";
import { fileURLToPath } from "url";

import semver from "semver";

const _dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const isWindows = version.includes("Windows");
  log.success("当前 node 版本为", version);

  const originPackageFile = "package.json";
  const originLockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

  const projectDir = resolve(_dirname, "../projects");
  const projects = await fg("*", {
    onlyDirectories: true,
    cwd: projectDir,
  });
  const choices = projects.map((p) => ({ label: p, value: p }));

  const answer = await log.prompt("选择你当前的课程名称?", {
    type: "select",
    options: choices,
  });

  await writeNpmrc("registry=https://registry.npmmirror.com/");

  log.info("创建 .npmrc 并设置淘宝镜像");

  if (answer === "VueCli 实战商城后台管理系统") {
    const bootstrapCss = "bootstrap.min.css";
    const indexHtmlFile = `public/index.html`;

    const src = join(projectDir, answer, bootstrapCss);
    if ((await exists(src)) && (await exists(indexHtmlFile))) {
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
    try {
      execSync(`git config --global url."https://".insteadOf ssh://git@`);
    } catch (error) {
      log.error(error);
      log.warn(`重写 git url 配置失败，依赖安装可能将失败`);
    }
    // 检查环境变量中是否不包含系统路径 (C:\\WINDOWS\\System32，如果是则关闭配置中的 open
    if (isWindows && process.env.Path.includes("C:\\WINDOWS\\System32")) {
      const configFile = "vue.config.js";
      const configText = await readTextFile(configFile);
      await writeFile(
        configFile,
        configText.replace("open: true", "open: false"),
      );
      log.withTag("windows").warn("未发现系统路径, 关闭浏览器自动打开");
    }
  }

  if (answer === "Nuxt3+Vue3实战在线教育网站") {
    let packageInfo = await getPackageInfo("nuxt");
    if (packageInfo === undefined) {
      log.warn("未发现 nuxt 依赖，安装中...");
      await install();
      packageInfo = await getPackageInfo("nuxt");
    }
    const isOld = packageInfo.version.includes("3.0.0");
    await mayBeCleanDir(".nuxt");
    log.info("已确保清理 .nuxt 缓存");

    const nuxtConfigText = await readTextFile("nuxt.config.ts");

    const newNuxtConfigText = nuxtConfigText
      .replace("autoImports", "imports")
      .replace("buildModules", "modules")
      .replace(/import.*nuxt['"]/, "");

    await writeFile("nuxt.config.ts", newNuxtConfigText);

    if (!isOld) {
      await fixWindicss();
      log.success("修复 windicss 配置成功");

      await fixDateFnsTz();

      log.success("修复 date-fns-tz 成功");
    }

    log.info("已重写 nuxt.config.ts 配置文件");
    const pluginFile = await find([
      "plugins/naive-ui.js",
      "plugins/naive-ui.ts",
    ]);

    const shouldUseModule = semver.gte(packageInfo.version, "3.10.0");
    // 判断 nuxt 版本，修复 naive ui 样式问题
    if (!shouldUseModule) {
      const futurePluginText = await readTextFile(
        join(
          projectDir,
          answer,
          isOld ? "plugins/old-naive-ui.js" : "plugins/naive-ui.js",
        ),
      );

      await writeFile(pluginFile || "plugins/naive-ui.js", futurePluginText);
      log.success("修复 nuxt 样式成功");
      return;
    }

    if (pluginFile) {
      await remove(pluginFile);
    }

    await setupNaiveUiModule();

    return;
  }

  if (answer === "vue3+ts实战打造企业UI组件库") {
    const currentProjectDir = join(projectDir, answer);
    const preCommit = ".husky/pre-commit";
    const settings = ".vscode/settings.json";

    await outputFile(
      settings,
      await readTextFile(join(currentProjectDir, settings)),
    );

    await outputFile(
      preCommit,
      await readTextFile(join(currentProjectDir, preCommit)),
    );

    const originPackageJson = await readJson(originPackageFile);
    // 固定 husky 版本为 8.0.3
    if (originPackageJson.devDependencies["husky"]) {
      originPackageJson.devDependencies["husky"] = "8.0.3";
    } else {
      originPackageJson.dependencies["husky"] = "8.0.3";
    }
    originPackageJson.scripts["prepare"] = "husky install";

    await writeJson(originPackageFile, originPackageJson);
    await install();
    log.success("fix 成功");
    return;
  }

  await mayBeCleanDir("node_modules");

  log.info("清理 node_modules");

  await mayBeBackupFiles([originPackageFile, ...originLockFiles]);

  log.info("备份 package.json 和 lock 文件");

  await Promise.all(originLockFiles.map((f) => ensureEmpty(f)));

  log.info("已确保清空 lock 文件");

  const targetPackageFile = join(
    projectDir,
    answer,
    isModernNode() ? "package.json" : "old-package.json",
  );

  await defuPackageJson(targetPackageFile, originPackageFile);

  log.info("合并 package.json");

  await install();

  log.success("fix 成功");
}

run();

async function install() {
  const install = await detectInstallCommand();

  log.info(`尝试重新执行 ${install}`);

  execSync(install, {
    stdio: "inherit",
  });
}

async function fixWindicss() {
  const mod = await loadFile("nuxt.config.ts");
  const options = mod.exports.default.$type === "function-call"
    ? mod.exports.default.$args[0]
    : mod.exports.default;

  if (!options.css || !options.css.includes("virtual:windi-base.css")) {
    options.css ??= [];
    options.css = [
      ...new Set([
        [
          "virtual:windi-base.css",
          ...options.css,
          "virtual:windi-components.css",
          "virtual:windi-utilities.css",
        ],
      ]),
    ];
    await writeFile("nuxt.config.ts", mod.generate().code);
  }
}

async function fixDateFnsTz() {
  const mod = await readTextFile("nuxt.config.ts");

  await writeFile(
    "nuxt.config.ts",
    mod.replace(
      "date-fns-tz/esm/formatInTimeZone",
      "date-fns-tz/formatInTimeZone",
    ),
  );
}

async function setupNaiveUiModule() {
  const mod = await loadFile("nuxt.config.ts");
  log.info("nuxt 版本大于 3.10.0，使用 @bg-dev/nuxt-naiveui");

  const options = mod.exports.default.$type === "function-call"
    ? mod.exports.default.$args[0]
    : mod.exports.default;

  if (!options.modules) {
    options.modules = ["@bg-dev/nuxt-naiveui"];
  }

  options.modules.push("@bg-dev/nuxt-naiveui");

  options.modules = [...new set(options.modules)];

  // if (options.build && options.build.transpile) {
  //   options.build = undefined;
  // }

  await writeFile("nuxt.config.ts", mod.generate().code);

  const install = await detectInstallCommand() + " @bg-dev/nuxt-naiveui";

  const installCommand = install.includes("yarn")
    ? `yarn add @bg-dev/nuxt-naiveui`
    : `${install} @bg-dev/nuxt-naiveui`;

  log.info(`尝试安装 @bg-dev/nuxt-naiveui → ${installCommand}`);

  execSync(install, {
    stdio: "inherit",
  });
}
