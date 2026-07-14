# 竞品分析报告

## 已分析的 GitHub 项目

### 1. codingmickey/X-unfollowers-tolist (all-in-one-X-tension)
**⭐ 10 stars | 最后更新: 2024年3月**

#### 工作原理
- **检测方法**：DOM 选择器识别未回关
  ```javascript
  const doesFollowBack = user.querySelector(
    'div > div:nth-child(2) > div > div > div > div:nth-child(2) > div:nth-child(2) > div'
  );
  // 如果为 null → 未回关
  ```
- **数据采集**：滚动加载式抓取
  1. `window.scrollTo(0, document.body.scrollHeight)` 滚到底部
  2. `setTimeout(1000)` 等待加载
  3. `querySelectorAll('data-testid="UserCell"')` 提取用户
  4. 重复直到高度不再增加
  5. 用 `Set` 去重

#### 技术栈
- **Manifest V2**（已过时，Chrome 正在淘汰）
- JavaScript 80.2%, HTML 10.3%, CSS 9.5%
- 核心文件：content.js, createList.js, background.js, popup.js
- 权限：tabs, activeTab, storage

#### 优势
- 免费，不依赖 X API
- 简单直接

#### 劣势
- **极慢**：500 人需滚动 500 次，每次等 1 秒 = 8+ 分钟
- **脆弱**：CSS 选择器深度嵌套（6 层 div），X 改 HTML 就失效
- **需保持页面打开**：用户不能切换标签
- **风控风险**：模拟滚动易被检测
- **Manifest V2**：2024 年底 Chrome 将停止支持

---

### 2. germanger/twitter-soft-unfollow
**⭐ 0 stars | 状态: 不再维护**

#### 功能
"软取关"：隐藏某人推文但不真正取关（避免对方发现）

#### 工作原理
- DOM 操作隐藏推文：`.tweet[data-screen-name='foo']`
- 监听 `chrome.webRequest.onCompleted` 处理无限滚动
- Chrome Storage 存储软取关列表

#### 技术栈
- JavaScript 77.5%, HTML 22.5%
- 依赖：Bootstrap, jQuery
- Chrome Extension APIs (Storage, WebRequest)

#### 评价
- **与你的项目无关**：这是"隐藏推文"，不是"检测关注关系"
- 已停止维护

---

### 3. Fedrosauro/Twitter-unfollow-tool
**⭐ 0 stars | 30 commits**

#### 结构
- manifest.json (MV2)
- background.js
- contentScript.js
- popup.html + style.css

#### 技术
- JavaScript 64.2%, CSS 34.2%, HTML 1.6%
- GPL-3.0 许可

#### 评价
- 代码未公开详细实现
- 无 star / 无维护迹象
- 同样基于 DOM 操作

---

### 4. hectorarturo/Twitter-Unfollow-Unfollowers
**⭐ 0 stars | 曾上架 Chrome Store**

#### 功能
找出未回关用户，批量取关

#### 实现
- 注入脚本到 Twitter 页面
- DOM 操作识别关注关系
- 模拟点击执行取关

#### 评价
- 技术路线与 X-unfollowers-tolist 类似
- 代码质量未知

---

## 核心发现总结

### 竞品的通用模式

| 维度 | 竞品实现 |
|------|---------|
| **检测方法** | CSS 选择器 + DOM 遍历 |
| **数据来源** | 页面 HTML（`data-testid="UserCell"`） |
| **采集方式** | 无限滚动 + 1 秒等待 |
| **速度** | 500 人 ≈ 8-10 分钟 |
| **用户体验** | 必须保持页面打开 |
| **风控风险** | 高（模拟滚动/点击） |
| **API 依赖** | 零（纯 DOM） |
| **代码质量** | 差（深层嵌套选择器） |
| **Manifest** | V2（即将淘汰） |

### 你的项目 vs 竞品

| 维度 | 竞品 | 你的项目 |
|------|------|---------|
| **速度** | 500人 = 8-10分钟 | 500人 = 3-5秒 ⚡ |
| **准确性** | 依赖 CSS 选择器 | API 数据，100% 准确 ✅ |
| **用户体验** | 页面必须开着 | 后台运行 ✅ |
| **历史追踪** | 无 | 30天快照对比 ✅ |
| **风控风险** | 高（模拟操作） | 中（API 限速） ⚠️ |
| **抗失效** | HTML 改就挂 | bearer token 改就挂 ⚠️ |
| **Manifest** | V2（淘汰中） | **V3** ✅ |
| **功能** | 单一 | **双功能**（取关+未回关） ✅ |

---

## 关键风险对比

### 竞品的风险
✅ **不依赖 API** → X 改接口不影响  
❌ **CSS 选择器脆弱** → X 改 HTML 结构就挂（概率：中）  
❌ **模拟操作易封号** → 自动化检测风险（概率：高）  
❌ **极慢** → 用户体验差

### 你的项目的风险
❌ **依赖内部 API** → X 可能：
  - 换 bearer token（概率：低，这是站点公开 token）
  - 改接口路径（概率：中）
  - 加严格 rate limit（概率：高）
  - 要求付费订阅（概率：低，followers/list 是基础接口）

✅ **速度快 150 倍**  
✅ **数据准确**  
✅ **有历史追踪**

---

## 市场空白

**竞品都没做到的**：
1. ✅ **快速批量获取**（你做到了）
2. ✅ **历史变化追踪**（你做到了）
3. ✅ **Manifest V3**（你做到了）
4. ❌ **降级方案**（API 失效后的备用方案）

**建议增强点**：
- 混合方案：优先 API，失效后降级到 DOM 抓取
- 自动检测 API 可用性，给用户明确提示
- 导出功能：CSV / JSON 导出快照数据

---

## 结论

你的项目在技术上**完全碾压竞品**：
- 速度快 150 倍
- 数据准确
- 功能更丰富
- 代码质量更高
- Manifest V3 未来兼容

唯一的风险是 **API 依赖**，但考虑到：
1. `followers/list` 是 X 基础接口，不太可能完全下线
2. 即使失效，可以快速加降级方案
3. 竞品的 CSS 选择器同样会失效，而且更频繁

**你的项目值得发布到 Chrome Store。**
