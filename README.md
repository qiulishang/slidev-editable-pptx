# slidev-editable-pptx

把 Slidev / Markdown 讲义导出为**文本可编辑**的 PPTX。原生 `slidev export --format pptx` 会输出整页图片，本仓库提供替代方案：先由浏览器渲染 Slidev 打印页，提取文字与背景板几何信息，再用 `pptxgenjs` 重建为真实文本框、形状和表格，并在写出前做重叠、越界、空白页和布局密度校验。

## 适合谁

- 使用 Slidev 制作中文讲义、课件、考研精讲、企业培训或公开课的讲师。
- 需要 AI 自动生成课件，并输出可在 PowerPoint、WPS、Word 中继续编辑的 PPTX。
- 需要把 Markdown 幻灯片纳入自动化流程，检查页数、空白页、文字溢出和信息密度。
- 想复用“浏览器渲染 + 几何提取 + PPTX 重建”思路的开发者。

## 主要能力

- 可编辑文本：导出内容为真实文本对象，不是整页图片。
- 中文排版：汉字使用宋体，英文和数字使用 Times New Roman。
- 背景板跟随：文本框按背景面板约束宽度和位置，避免文字越界。
- 自动校验：写文件前检查文本框重叠、超出幻灯片、超出背景面板、空白页、页数不匹配。
- 布局审计：`--check-only` 输出 dense/sparse、水平/垂直留白不均衡报告；`--strict-layout` 可让问题导致失败。
- 图片与链接：`<img>` 会作为真实图片嵌入 PPTX，`<a href>` 会保留为可点击链接，并支持视频/iframe 导出。
- 非文本排版：图片、媒体与文字一起参与页面居中、越界和留白校验。
- 时间规划：有大纲时遵循大纲时间安排生成内容；没有大纲时先询问用户时间规划，再按用户安排控制内容深度与篇幅。
- 讲稿 PDF：导出 PPTX 后默认生成配套讲稿 PDF，按“原课件页 + 讲稿页”交替排版，讲稿按大纲时间规划字数。
- AI Agent 可用：`SKILL.md` 可直接作为 Codex skill 加载，脚本也可作为独立 CLI 使用。

## 为什么不用原生 PPTX 导出

原生 `slidev export --format pptx` 会把每页导出为整页图片，PPT 中不能继续编辑文字，也不能被 Word/WPS 当作文本对象处理。本工具通过浏览器渲染后重建文本对象，适合需要二次编辑、校对、改版和批量交付的场景。

## 工作方式

1. 启动 Slidev 本地服务并打开打印视图。
2. 使用 Playwright 加载 `/print?print=true`，等待幻灯片渲染完成。
3. 提取每页的文本、背景板、卡片、表格、图片、媒体、超链接和坐标。
4. 对文本做 CJK/Latin 字体拆分。
5. 使用 `pptxgenjs` 重建 PPTX，包含文本、形状、表格、图片、媒体和可点击链接。
6. 导出前校验空白页、页数、文本框重叠/越界/超出背景板，以及布局密度。
7. 读取讲稿 JSON，按原课件页数生成 2 倍页数的讲稿 PDF，每页原课件后紧跟一页讲稿。

## 快速开始

前置要求：Node.js >= 18，一个可运行 Slidev 的项目，项目中可解析 `@slidev/cli` 和 `playwright-chromium`。

```bash
cd my-slidev-project
node /path/to/export-editable-pptx.mjs --entry slides.md --check-only --expected-slides 28
```

预检输出包括：

- 每页信息密度
- 水平/垂直留白情况
- dense/sparse 警告
- 实际页数与空白页数

确认后导出：

```bash
node /path/to/export-editable-pptx.mjs \
  --entry slides.md \
  --output output/考研精讲.pptx
```

严格布局检查：

```bash
node /path/to/export-editable-pptx.mjs \
  --entry slides.md \
  --check-only \
  --strict-layout \
  --layout-report layout.json
```

生成配套讲稿 PDF：

```bash
node /path/to/export-lecture-pdf.mjs \
  --entry slides.md \
  --script 讲稿内容.json \
  --output output/考研精讲-讲稿.pdf
```

如果默认浏览器路径不可用，通过 `--executable-path` 指定 Edge、Chrome 或 Chromium。

## CLI 参数

| 参数 | 作用 |
| --- | --- |
| `--entry <path>` | Slidev 入口 `slides.md`，默认 `slides.md` |
| `--output <path>` | 导出 PPTX 路径 |
| `--check-only` | 只做检查与布局审计，不写文件 |
| `--expected-slides <n>` | 校验实际页数，不匹配则失败 |
| `--allow-blank` | 允许有意的空白页 |
| `--strict-layout` | dense/sparse 或留白不均衡时失败 |
| `--layout-report <path>` | 输出结构化 JSON 布局报告 |
| `--executable-path <path>` | 指定浏览器可执行文件 |
| `--port <port>` | 指定 Slidev 本地服务端口 |

带值参数也可用环境变量，例如 `PPTX_ENTRY`、`PPTX_OUTPUT`、`PPTX_EXECUTABLE_PATH`。

## 布局规则

- 文本框宽度不超过对应背景板内容区。
- 文本超出背景板时优先缩小字号，不强行换行或溢出。
- 默认不换行；源内容本身多行或长度超限时可换行。
- 普通分点内容使用单一浅色背景板；表格保留单元格边界。
- 封面、模块页和总结页整体居中；普通页正文块在标题下方水平、垂直居中。
- 卡片标题属于正文块，不按页面标题处理。
- 图片、媒体和链接块按正文布局处理，参与整体居中、越界和留白校验。
- 信息密度保持均匀：正文页优先 4-8 个条目或 2-4 个短要点块。
- 背景板可合并或扩展，避免整页留白或单侧空白。

## AI Agent 使用

通过 Codex 等 Agent 使用本 skill 时：

1. 读取 `SKILL.md`，按其中规则处理时间规划、导出与布局审核。
2. 先运行 `--check-only` 预检页数和布局，再按审计结果调整 `slides.md`。
3. 有 `大纲.txt` 时遵循大纲时间安排；没有时先询问用户时间规划，再生成对应内容。
4. 在核心机制、重难点或大纲提示处检索并插入图片、动画/视频链接或超链接，记录来源与授权。
5. 调整后重新预检，再导出可编辑 PPTX。
6. 导出 PPTX 后默认再生成配套讲稿 PDF，并校验其页数为原课件页数的 2 倍。

## 可复用实现思路

- 用浏览器作为渲染引擎，避免手写 Markdown/Slidev AST 到 PPTX 的解析。
- 通过 DOM 坐标读取文本和背景板，建立统一的 slide model。
- 用 fit 和 offset 做整体缩放，而不是逐字猜测字号。
- 用 CJK/Latin 正则拆分字体，满足中英文混排。
- 在写出前做几何校验和布局审计，把排版问题挡在交付前。

## 目录结构

```text
.
├── SKILL.md                    # AI Agent skill 说明
├── agents/openai.yaml          # Agent 元信息
├── scripts/
│   ├── export-editable-pptx.mjs
│   └── export-lecture-pdf.mjs
└── references/
    └── versioning.md
```

## 检索关键词

Slidev, PPTX, editable PPTX, Markdown slides, Slidev 导出 PPTX, 可编辑 PPTX, AI 生成课件, 考研讲义, 中文课件, Playwright, pptxgenjs, PowerPoint, WPS, layout audit, slide export。

## 版本

- `0.1.0`

## 维护

- 当前仓库保留最新版本快照。
- 版本发布与提交规则见 `references/versioning.md`。
