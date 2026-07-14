import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// X 取关追踪器 — 手动触发拉取关注者列表，保存快照，对比历史找出取关的人。
// 用你的 X 登录态调 followers/list 接口，数据仅存本地（chrome.storage），
// 不经过任何第三方服务器。
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [tailwindcss()] }),
  webExt: { disabled: true },
  manifestVersion: 3,
  manifest: () => ({
    name: "X 取关追踪器",
    description:
      "追踪 X 关注者变化，找出取关你的用户。手动触发，保留 30 天历史快照。",
    permissions: ["storage", "cookies", "scripting"],
    host_permissions: ["*://x.com/*", "*://twitter.com/*"],
    action: { default_title: "X 取关追踪器", default_popup: "popup.html" },
  }),
});
