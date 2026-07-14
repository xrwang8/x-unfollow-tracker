# Chrome Web Store 上架完整流程

从零到发布的完整步骤。

---

## 前置要求

- [ ] Google 账号（用于开发者后台）
- [ ] 支付 $5 开发者注册费（一次性，可用信用卡）
- [ ] 准备好所有素材（截图、图标、文案）

---

## 步骤 1：注册开发者账号

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 使用 Google 账号登录
3. 阅读并同意开发者协议
4. 支付 $5 注册费（一次性，永久有效）
5. 等待支付确认（通常即时）

---

## 步骤 2：准备扩展包

在项目根目录执行：

```bash
# 构建生产版本
npm run build

# 打包为 zip（如果 wxt 支持）
npm run zip

# 或手动打包
cd .output/chrome-mv3
zip -r ../../x-unfollow-tracker.zip .
cd ../..
```

**检查清单**：
- [ ] manifest.json 中 `version` 字段正确（如 `0.1.0`）
- [ ] 所有图标文件存在（16, 32, 48, 128）
- [ ] zip 文件不超过 128 MB
- [ ] zip 根目录直接包含 manifest.json（不能有额外文件夹层级）

---

## 步骤 3：创建商店列表

在开发者后台点击"New Item"：

### 3.1 上传扩展包
- 上传刚才生成的 zip 文件
- 系统会自动读取 manifest.json 并验证

### 3.2 填写商品详情

**基本信息**（从 `store/LISTING.md` 复制）：
- 扩展名称：X 取关追踪器 - 关注变化 & 未回关检测
- 简短描述：（132 字符）
- 详细描述：（见 LISTING.md）
- 分类：社交与通讯（Social & Communication）
- 语言：中文（简体）

### 3.3 上传图片素材

**必需**：
- [ ] 扩展图标 128×128（自动从 manifest 读取）
- [ ] 小图块 440×280（从 `store/assets/promo/` 上传）
- [ ] 至少 1 张截图 1280×800（从 `store/assets/screenshots/` 上传）

**可选**：
- [ ] 大图块 1400×560
- [ ] 更多截图（最多 5 张）

### 3.4 隐私声明

**单一用途（Single purpose）**：
```
追踪 X（Twitter）关注者变化，帮助用户找出取关账号和未回关账号。
```

**权限说明（Permissions justification）**：

| 权限 | 理由 |
|------|------|
| `storage` | 本地存储关注者快照，用于历史对比分析 |
| `cookies` | 读取 x.com 的会话 cookie 以调用其公开接口 |
| `host_permissions (x.com)` | 访问 X 的 followers/list 接口获取关注者列表 |
| `scripting` | API 失效时注入降级抓取脚本（仅在用户主动点击时） |

**远程代码（Remote code）**：
- ❌ 否，本扩展不加载任何远程代码

**数据使用声明**：
- ❌ 不收集任何个人身份信息
- ✅ 仅在本地存储关注者列表快照，用于对比分析
- ❌ 数据不会离开用户设备
- ❌ 不会被分享、出售或用于其他用途

**隐私政策 URL**：
```
https://github.com/xrwang8/x-unfollow-tracker/blob/main/PRIVACY.md
```

---

## 步骤 4：发布设置

### 4.1 发布范围
- **可见性**：公开（Public）
- **地区**：所有地区（或仅选中国）

### 4.2 定价
- **价格**：免费

### 4.3 开发者信息
- **联系邮箱**：（你的邮箱）
- **网站**：https://github.com/xrwang8/x-unfollow-tracker
- **支持 URL**：https://github.com/xrwang8/x-unfollow-tracker/issues

---

## 步骤 5：提交审核

1. 检查所有必填项已完成
2. 点击"Submit for review"
3. 等待审核结果（通常 1-3 个工作日）

**审核重点**：
- 隐私政策是否清晰
- 权限申请是否合理
- 功能描述是否与实际一致
- 截图是否真实

---

## 步骤 6：审核通过后

1. 扩展会自动发布到 Chrome Web Store
2. 获得商店链接：`https://chrome.google.com/webstore/detail/[扩展ID]`
3. 更新 README 添加安装链接
4. 在社交媒体推广

---

## 常见审核拒绝原因及解决方案

### 1. 权限申请过多
**问题**：申请了功能不需要的权限  
**解决**：检查 manifest.json，移除多余权限

### 2. 隐私政策不完整
**问题**：未说明数据如何使用  
**解决**：使用项目中的 PRIVACY.md，托管到 GitHub Pages

### 3. 功能描述不清
**问题**：审核员看不懂扩展做什么  
**解决**：优化描述，增加更清晰的截图

### 4. 截图与实际不符
**问题**：截图夸大或伪造功能  
**解决**：使用真实扩展的截图，不要 PS

### 5. 单一用途不明确
**问题**：功能太杂，看起来像"Swiss Army Knife"  
**解决**：强调核心功能（追踪关注者变化），其他功能作为辅助

---

## 更新已发布的扩展

发布后如需更新：

1. 修改代码
2. 更新 manifest.json 中的 `version`（必须递增，如 0.1.0 → 0.1.1）
3. 重新构建并打包
4. 在开发者后台点击扩展 → Upload New Package
5. 更新更新说明（What's new）
6. 提交审核

**版本号规则**：
- 小改动（bug 修复）：0.1.0 → 0.1.1
- 新功能：0.1.0 → 0.2.0
- 重大更新：0.1.0 → 1.0.0

---

## 发布清单

最终检查：

- [ ] $5 注册费已支付
- [ ] zip 包已构建并验证
- [ ] 所有文案已填写（LISTING.md）
- [ ] 隐私政策已托管（PRIVACY.md）
- [ ] 至少 3 张截图已上传
- [ ] 小图块 440×280 已上传
- [ ] 权限说明已填写
- [ ] 开发者信息已填写
- [ ] 最后测试：在本地加载 zip 验证功能正常

---

## 发布后推广

- [ ] 更新 GitHub README 添加 Chrome Store 徽章
- [ ] 在 ProductHunt 提交
- [ ] 在 V2EX / Twitter / 微博分享
- [ ] 在相关 Reddit / Discord 社区推广
- [ ] 写一篇使用指南博客

---

## 有用的链接

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [发布政策](https://developer.chrome.com/docs/webstore/program-policies/)
- [最佳实践](https://developer.chrome.com/docs/webstore/best-practices/)
- [审核时间统计](https://developer.chrome.com/docs/webstore/review-process/)
