// naive-ui 必备的插件，不需要修改它
import { setup } from "@css-render/vue3-ssr";

export default defineNuxtPlugin({
  name: "naive-ui",
  enforce: "pre",
  setup(nuxtApp) {
    if (process.server) {
      const { collect } = setup(nuxtApp.vueApp);
      nuxtApp.ssrContext?.head.hooks.hook("tags:resolve", (ctx) => {
        const lastMetaIndex = ctx.tags.map((x) => x.tag).lastIndexOf("meta");
        const styleTags = collect().split("</style>").filter(Boolean).map(
          (x) => {
            const id = x.match(/cssr-id="(.+?)"/)?.[1];
            const style = (x.match(/>(.*)/s)?.[1] || "").trim();
            return {
              tag: "style",
              props: { "cssr-id": id },
              innerHTML: style,
            };
          },
        );
        ctx.tags.splice(lastMetaIndex + 1, 0, ...styleTags);
      });
    }
  },
});
