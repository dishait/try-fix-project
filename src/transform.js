import { log } from "./log";
import { glob } from "fast-glob";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
/**
 * @description 转换 options
 */
export async function transformOptions() {
    if (!existsSync("pages")) {
        log.error("未发现 pages 目录，请在 uniappx 项目下运行");
        return;
    }

    const files = await glob("pages/**/*.uvue", {
        absolute: true,
        onlyFiles: true,
    });

    for (const file of files) {
        const code = await readFile(file, "utf-8");

        const newCode = code.replace("OnLoadOptions", "UTSJSONObject")
            .replace(
                /options.get\((.*?)\)/g,
                "options.getString($1)",
            ).replace(
                /options.has\((.*?)\)/g,
                "options.getString($1) != ''",
            );

        await writeFile(file, newCode);
        log.success(`转换 ${file} 成功`);
    }
}
