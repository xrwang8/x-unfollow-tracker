# X 取关追踪器

追踪 X（Twitter）关注者变化，找出取关你的用户。

## 功能

- **手动触发检查** — 点击按钮拉取当前关注者列表（约 500 人 ≈ 3 次分页请求）
- **快照管理** — 每次检查保存一个快照（时间戳 + 用户列表），自动保留 30 天
- **对比分析** — 选择"过去 7 天"或"过去 30 天"，自动找最近的快照对比，显示取关名单
- **本地存储** — 所有数据存 `chrome.storage.local`，不经过任何第三方服务器

## 工作原理

用你的 X 登录态（页面 `ct0` cookie + 站点公开 bearer）调用 X 的 `followers/list.json` 接口，分页拉取关注者列表。限速 1s/页 + 抖动 + 退避，避免触发 X 反滥用。

**API 降级方案**：如果 X 改了接口导致 API 失效（401/403/404），扩展会自动切换到备用方案（DOM 页面滚动抓取），虽然慢但仍能工作。你会在进度提示里看到 `[页面滚动]` 标记。

## 使用

1. 确保已登录 x.com
2. 点击扩展图标打开 popup
3. 点"立即检查关注者"→ 拉取并保存快照
4. 等几天/几周后再次检查，保存第二个快照
5. 选择对比范围（7 天 / 30 天）→ 点"查看取关"→ 显示取关名单

## 开发

```bash
npm install
npm run build      # 构建到 .output/chrome-mv3
npm run dev        # 开发模式（手动加载）
npm run compile    # 类型检查
```

加载方式：Chrome → 扩展 → 开发者模式 → 加载已解压 → 选 `.output/chrome-mv3`

## 结构

```
entrypoints/popup/  # React 界面（检查按钮 + 快照列表 + 对比结果）
lib/
  x-api.ts          # followers/list 调用 + 认证 + 限速
  snapshot.ts       # 快照管理（存储/读取/对比/清理）
```

## 限制

- X 的 `followers/list` 接口可能随时变更（URL/格式/bearer），但扩展会自动降级到备用方案
- Rate limit：每页 1s 间隔，遇到 429 会中断（已拉取部分仍会保存）
- 只追踪关注者（followers），不追踪你关注的人（following）
- DOM 备用方案需要你在对应页面（followers/following）且会看到自动滚动

## 许可

MIT
