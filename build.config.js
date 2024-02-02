import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  failOnWarn: false,
  rollup: {
    esbuild: {
      minify: true,
      target: "ES2020",
      platform: "node",
      sourcemap: false,
      treeShaking: true,
      legalComments: "none",
    },
  },
});
