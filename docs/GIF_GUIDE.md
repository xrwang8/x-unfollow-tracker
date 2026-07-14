# 演示 GIF 制作指南

为 README 和 Chrome Store 制作演示动画。

---

## 方式 1：使用 macOS 自带工具（推荐）

### 工具
- **QuickTime Player**（录屏）+ **gifski**（转 GIF）

### 步骤

#### 1. 安装 gifski
```bash
brew install gifski
```

#### 2. 录制屏幕
1. 打开 QuickTime Player
2. 文件 → 新建屏幕录制
3. 点击红色录制按钮
4. 选择录制区域（拖拽框住扩展 popup）
5. 执行演示操作：
   - 点击扩展图标
   - 点击"检查关注者"
   - 等待进度提示
   - 显示完成消息
6. 停止录制（菜单栏图标）
7. 保存为 `demo.mov`

#### 3. 转换为 GIF
```bash
# 基础转换
gifski --fps 10 --quality 90 --width 600 demo.mov -o demo.gif

# 高质量（文件较大）
gifski --fps 15 --quality 95 --width 800 demo.mov -o demo-hq.gif

# 压缩版（适合 README）
gifski --fps 8 --quality 80 --width 500 demo.mov -o demo-compressed.gif
```

---

## 方式 2：使用 Kap（开源免费）

### 安装
```bash
brew install --cask kap
```

### 使用
1. 打开 Kap
2. 拖拽调整录制区域
3. 点击红色按钮开始录制
4. 执行演示操作
5. 停止录制
6. 导出为 GIF（Kap 自动转换）

**优势**：一步到位，无需手动转换

---

## 方式 3：使用在线工具

### CloudConvert
1. 录制屏幕（QuickTime / 系统截图 Cmd+Shift+5）
2. 访问 https://cloudconvert.com/mov-to-gif
3. 上传 .mov 文件
4. 调整参数（FPS / 质量）
5. 下载 GIF

---

## 需要制作的 GIF

### 1. 主演示（main-demo.gif）
**时长**：15-20 秒  
**内容**：完整流程
- 点击扩展图标
- 点击"检查关注者"
- 进度条变化
- 显示"快照已保存：XXX 人"

**尺寸**：600×400 或 800×600  
**位置**：README 顶部

### 2. 对比分析（compare-demo.gif）
**时长**：10-15 秒  
**内容**：
- 选择分析模式"谁取关了你"
- 选择"过去 7 天"
- 点击"查看结果"
- 显示取关名单

**尺寸**：600×400  
**位置**：README 功能说明部分

### 3. CSV 导出（export-demo.gif）
**时长**：5-10 秒  
**内容**：
- 结果列表显示
- 点击"导出 CSV"按钮
- 下载栏出现文件
- 用 Excel 打开（可选）

**尺寸**：600×400  
**位置**：README 功能说明部分

---

## GIF 优化建议

### 尺寸控制
- README 主演示：≤ 5 MB
- 功能演示：≤ 2 MB
- Chrome Store：≤ 10 MB

### 参数推荐
| 用途 | 宽度 | FPS | 质量 | 预估大小 |
|------|------|-----|------|---------|
| README 主演示 | 600px | 10 | 85 | 3-5 MB |
| 功能演示 | 500px | 8 | 80 | 1-2 MB |
| 高清版本 | 800px | 15 | 95 | 8-10 MB |

### 压缩工具
```bash
# 使用 gifsicle 进一步压缩
brew install gifsicle
gifsicle -O3 --colors 256 demo.gif -o demo-optimized.gif
```

---

## 添加到 README

创建 GIF 后，更新 README：

```markdown
## 演示

### 快速检查关注者（3 秒完成 500 人）

![检查关注者演示](docs/demo/main-demo.gif)

### 对比分析 - 找出取关用户

![对比分析演示](docs/demo/compare-demo.gif)

### 一键导出 CSV

![CSV 导出演示](docs/demo/export-demo.gif)
```

---

## 目录结构

```
x-unfollow-tracker/
├── docs/
│   └── demo/
│       ├── main-demo.gif           # 主演示
│       ├── compare-demo.gif        # 对比分析
│       ├── export-demo.gif         # CSV 导出
│       └── screenshots/            # 静态截图（备用）
│           ├── 01-main.png
│           ├── 02-progress.png
│           └── 03-results.png
```

---

## 录制技巧

### 1. 准备演示数据
- 提前保存 2 个快照（方便演示对比功能）
- 确保关注者数量够多（显示进度更明显）

### 2. 录制设置
- 关闭通知（系统偏好设置 → 通知）
- 关闭其他标签页（避免干扰）
- 使用干净的浏览器主题
- 鼠标移动慢一点（便于观众跟随）

### 3. 后期优化
- 裁剪开头/结尾多余部分
- 加速无关等待时间（如果工具支持）
- 添加简短文字说明（可选，Kap 支持）

---

## 测试清单

录制完成后检查：

- [ ] GIF 能正常播放
- [ ] 文件大小 ≤ 5 MB
- [ ] 画面清晰，文字可读
- [ ] 操作流程完整
- [ ] 无敏感信息（真实用户名/头像可打码）
- [ ] 循环播放流畅（首尾衔接）

---

## 快速制作命令

```bash
# 1. 录制屏幕（QuickTime）
# 保存为 demo.mov

# 2. 转 GIF
cd /Users/xrwang/go/src/github.com/xrwang8/x-unfollow-tracker
mkdir -p docs/demo

gifski --fps 10 --quality 85 --width 600 ~/Desktop/demo.mov -o docs/demo/main-demo.gif

# 3. 优化
gifsicle -O3 --colors 256 docs/demo/main-demo.gif -o docs/demo/main-demo.gif

# 4. 验证大小
ls -lh docs/demo/main-demo.gif
```

---

## 替代方案：静态截图

如果暂时无法录制 GIF，可以先用静态截图：

```markdown
## 界面预览

<table>
  <tr>
    <td><img src="docs/demo/screenshots/01-main.png" width="250"/></td>
    <td><img src="docs/demo/screenshots/02-progress.png" width="250"/></td>
    <td><img src="docs/demo/screenshots/03-results.png" width="250"/></td>
  </tr>
  <tr>
    <td align="center">主界面</td>
    <td align="center">拉取进度</td>
    <td align="center">取关名单</td>
  </tr>
</table>
```

---

制作完成后，提交：

```bash
git add docs/demo/
git commit -m "docs: 添加演示 GIF"
git push
```
