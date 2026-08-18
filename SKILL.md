---
name: slidev-editable-pptx
description: 根据大纲.txt生成考研辅导演示文稿（PPTX）与配套讲稿（PDF）。适用于深圳大学生物学考研课程工作区（C:\Users\HP\OneDrive\Desktop\课程），输入章节大纲，输出可编辑PPTX课件与讲稿PDF。触发词：PPT、演示文稿、课件、讲稿、导出、大纲生成。
---

# Slidev Editable PPTX

## Overview

Generate editable PPTX files from Slidev decks by rendering slides in a browser, extracting text and panel geometry, then rebuilding slides as real PPTX text boxes. Native `slidev export --format pptx` produces full-page images, so do not use it when editable text is required.

Default behavior does not start a Slidev dev server. Only start `pnpm dev` when the user explicitly asks for a live preview.

## When to Use

- User asks to generate a PPT/presentation/lecture deck from an outline (`大纲.txt`)
- User asks to export editable PPTX from Slidev projects
- User asks to generate paired lecture PDF (original slide + script page alternating)
- User asks to fix, audit, or rebalance PPTX exports

## Time Planning

When generating or regenerating deck content, resolve the time plan before deciding section depth and slide allocation:

- If the chapter outline or source materials contain a time arrangement, follow that arrangement for content scope, section depth, and slide allocation.
- If no outline or time arrangement exists, ask the user for their time plan before generating content, then follow that user-provided arrangement.
- Keep the time plan as a generation constraint only. Do not add timings, schedule blocks, or percentage breakdowns to slides unless the user explicitly asks for them.

## Content Conventions (Mandatory)

- Chinese language, exam-oriented, professional and rigorous tone
- Clearly mark `[核心考点]`, `[重难点]`, `[易错点]`, `[考研实验分析题]`, `[考研避坑]` etc.
- **No Emoji or emoticons** anywhere in slides or scripts
- **No Mermaid or diagram code syntax**; use standard Markdown lists, tables, and indentation
- Organize each body page as "conclusion + mechanism + example + exam cue"
- Core mechanisms must appear in visible slide text, not only inside `<!-- -->` presenter notes
- Lecture title format: `《教材名》第X-X章 · 主题`
- Tables: keep text concise, split long sentences into short phrases, remove unnecessary English parenthetical annotations

## Content Depth and Expansion

When the user reports that a deck is too thin, do not fix it by adding more headings alone. Expand the visible body text and keep the presenter script as the full explanation layer.

- Treat the outline time allocation as a depth guide: allocate more body text to major concepts, mechanisms, and application links.
- Use web or authoritative source material to verify mechanisms and examples before adding them. Do not copy web text verbatim; convert it into exam-oriented Chinese explanations.
- When presenter notes contain an explanation essential for answering exam questions, promote a distilled version to the visible slide as a bullet or small `[核心考点]` block.
- Add scenario pages when the outline has room, instead of leaving abstract keyword lists.
- Keep the layout rules below: if `--check-only` marks a page dense, split or compress it; if a page remains sparse after expansion, add a framework, table, scenario, or exam-tip block.

## Slide Component Conventions

Use colored card components to distinguish content types:

| Card Color | Border | Usage |
|------------|--------|-------|
| `bg-sky-50` | `border-sky-400` | Basic concepts, structures |
| `bg-emerald-50` | `border-emerald-400` | Supplementary notes, comparisons |
| `bg-amber-50` | `border-amber-400` | Key points, difficult topics |
| `bg-rose-50` | `border-rose-400` | Special topics, high-frequency exam points |
| `bg-teal-50` | `border-teal-400` | Summaries, frameworks |
| `bg-indigo-50` | `border-indigo-400` | References, supplementary resources |

For dense content pages, use `text-sm` or `text-xs` with `p-2`/`p-3`, `pt-1`/`pt-2`, `gap-2`/`gap-3` to control padding.

## Complete Pipeline

### Step 1: Read Outline

Read the target chapter's `大纲.txt`, extract:
- Chapter topic and total duration
- Module breakdown (number, topic, suggested duration, core exam points)
- Per-slide titles, key points, image/diagram hints

### Step 2: Generate slides.md

Create `slides.md` in the chapter directory with this mandatory header:

```yaml
---
theme: default
title: {章节主题}
titleTemplate: '%s - 考研精讲'
highlighter: shiki
transition: slide-left
css: unocss
layout: center
---
```

Page structure:
1. Cover page (`layout: center`): chapter title + key topics
2. Course map page (`layout: default`): module overview cards
3. Module sections separated by `layout: section`
4. Content pages use `layout: two-cols-header` or `layout: default`
5. Each module ends with a summary page
6. Final page: mind-map summary + core exam points reference table

Every page must include `<!-- 【讲师逐字稿】... -->` presenter notes with the complete lecture script for that page.

### Step 3: Build Verification

```powershell
cmd /c "cd /d "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner" && pnpm exec slidev build "{absolute-path}\slides.md""
```

### Step 4: Generate Lecture Script JSON

Create `讲稿内容.json` in the chapter directory. Format: JSON array, one object per slide:

```json
[
  {
    "title": "幻灯片标题",
    "content": "该页核心内容摘要",
    "minutes": 2.5,
    "words": 200,
    "script": "完整的讲师逐字稿文本"
  }
]
```

- `minutes`: estimated speaking time (~150 chars/min)
- `words`: character count of the script
- `script`: extracted from slides.md `<!-- -->` comments, remove `【讲师逐字稿】` prefix
- Use `『』` instead of `""` for Chinese quotes inside JSON strings to avoid parse errors
- Total entries must equal total slide count

### Step 5: Export Editable PPTX

**Critical**: Always copy slides.md to slidev-runner as a temp file before exporting. The export script resolves `@slidev/cli` from `process.cwd()`, so it must run from the slidev-runner directory with the entry file in the same directory.

```powershell
Copy-Item "{chapter-dir}\slides.md" "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md"

cmd /c "cd /d "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner" && node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs" --entry "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md" --output "{chapter-dir}\{章节主题}-考研精讲.pptx""

Remove-Item "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md" -Force
```

Before export, run a layout check:

```powershell
cmd /c "cd /d "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner" && node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs" --entry "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md" --check-only"
```

`--check-only` prints per-slide density, horizontal/vertical whitespace, and dense/sparse warnings. Add `--layout-report <path>` for structured JSON and `--strict-layout` to fail on issues.

### Step 6: Export Lecture PDF

```powershell
Copy-Item "{chapter-dir}\slides.md" "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md"

cmd /c "cd /d "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner" && node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-lecture-pdf.mjs" --entry "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md" --script "{chapter-dir}\讲稿内容.json" --output "{chapter-dir}\{章节主题}-讲稿.pdf""

Remove-Item "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner\slides-temp.md" -Force
```

### Step 7: Cleanup and Report

- Remove temp files from `slidev-runner/`
- Remove `dist/` build artifacts from chapter directory if present
- Report generated files with page counts

## Output File Naming

| File | Naming | Description |
|------|--------|-------------|
| Slidev source | `slides.md` | Intermediate, not shown separately |
| Lecture script | `讲稿内容.json` | Data source for lecture PDF |
| PPTX deck | `{章节主题}-考研精讲.pptx` | Editable text PPTX |
| Lecture PDF | `{章节主题}-讲稿.pdf` | Original slide + script page alternating |

## Layout Rules

### Body Centering (Critical)

The export script's `fitSlide()` function in `tools/export-editable-pptx.mjs` controls horizontal centering. The rule is:

- **Pages WITH a title** (`layout: default`, `layout: two-cols-header`): Do NOT horizontally center the body content. The title is left-aligned (with Slidev's content-area padding), and the body must stay at its natural position below it. Centering the body independently shifts it to the right of the title, creating a visual mismatch.
- **Pages WITHOUT a title** (`layout: center`, `layout: section`, `layout: cover`): Center all content as a unit (`centerAll = true`).

The `centerOffsetX` calculation in `fitSlide()` must enforce this:

```js
const centerOffsetX = !headingGroups.length && bodyWidth < data.width
  ? (data.width - bodyWidth) / 2 - bodyMinX
  : 0;
```

If the export script is modified, this rule MUST be preserved. The three copies that must stay in sync are:
- `C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs`
- `C:\Users\HP\.codex\skills\slidev-editable-pptx\scripts\export-editable-pptx.mjs`
- `C:\Users\HP\.agents\skills\slidev-editable-pptx\scripts\export-editable-pptx.mjs`

### Font Rules

- Fonts: Latin letters and digits use Times New Roman; Chinese characters use 宋体.
- Text box width must be determined by its background panel and must not exceed the panel content area.
- Shrink font size when text would exceed the panel; do not let text overflow the panel.

### Element Positioning

- Prevent text box overlaps; every text box must stay inside its corresponding panel.
- Keep text boxes non-wrapping by default. Allow wrapping only when text exceeds the background or the source content is already multiline.
- For bullet or section content outside tables, use a single light background panel to constrain text width; tables keep cell boundaries.
- Keep small titles (`h1`-`h4`) top-left on ordinary pages. Center the whole slide for cover, module-section, and summary pages.
- Move text boxes and their background panels together as one unit. Distribute whitespace around the page edges instead of leaving blank space on one side.
- Treat the body text block as one unit and keep it in the remaining space below the page title.
- Treat images, media, and hyperlink blocks as part of the body layout. Include their rectangles when calculating page fit and whitespace balance.

### Density Rules

- Keep information density even across the deck. Prefer 4-8 entries or 2-4 short point blocks per body page.
- The `--check-only` audit flags pages as `dense` when any of: `boundingFill >= 0.72`, `chars >= 420`, or `bodyCount >= 14`.
- Dense slides should be split or compressed; sparse slides should be merged or expanded.
- Tables with 14+ items (including header) trigger the dense flag. Consider splitting into sub-tables or using `text-xs` with tighter padding.

### Horizontal Balance (H Ratio)

- The layout audit reports H ratio as `leftSpace/rightSpace` percentages. A 50/50 ratio means content is horizontally centered on the slide.
- For `layout: default` pages with a left-aligned title, the body content naturally sits slightly left of center (due to Slidev's content-area padding). This is correct behavior -- do NOT force-center the body to achieve 50/50.
- Pages without titles (`centerAll = true`) should show 50/50.

## Non-Text Materials and Links

For core mechanisms, key points, and outline prompts, verify the mechanism through web or authoritative sources, then insert relevant images, video links, or hyperlinks.

- Prefer Wikimedia Commons, OpenStax, NIH/PMC, HHMI BioInteractive as sources.
- Download images into the chapter `图/` folder, reference with `./图/...` relative paths.
- The export script embeds `<img>` as real PPTX images and preserves `<a href>` as clickable hyperlinks.
- Local image paths must be resolvable by the Slidev dev server; keep images under the same subproject as `slides.md`.
- The export script rejects invalid assets: fetched asset must have `image/*` MIME type, and every `<img>` must have nonzero `naturalWidth` and `naturalHeight`.

## Verification

The script validates before writing and throws when text boxes overlap, leave the slide, or exceed their background panel. It also fails on blank slides and mismatched `--expected-slides` counts.

For independent verification, unzip the generated PPTX and check:
- `ppt/slides/slide*.xml` contains `<a:t>` text runs
- No slide contains a full-page `<p:pic>` image
- Font runs use `<a:latin typeface="Times New Roman"/>` for Latin/digit and `<a:ea typeface="宋体"/>` for Chinese
- `ppt/media/` contains expected image files
- The paired lecture PDF has `2 * slideCount` pages

## Content Depth Reference

Allocate pages by outline time:
- 25 min module: ~8-10 pages, each exam point on its own page
- 20 min module: ~6-7 pages
- 15 min module: ~5-6 pages
- 10 min module: ~4-5 pages
- Total 80 min: ~30-40 pages, ~12000 chars of lecture script

## Troubleshooting

- **Theme not found**: Ensure execution from `slidev-runner/` directory AND entry file copied there as temp file
- **Playwright not installed**: Run `pnpm exec playwright install chromium` in `slidev-runner/`
- **JSON parse error**: Check for unescaped ASCII double quotes in `讲稿内容.json`, use `『』` instead
- **PPTX text overflow**: Run `--check-only`, adjust font size or split pages
- **Image load failed**: Confirm images are in the same subproject as slides.md, use `./图/...` paths
- **Body content shifted right**: The export script must NOT apply `centerOffsetX` to pages with a heading. See "Body Centering" in Layout Rules.
- **Body content shifted left**: This is expected for `layout: default` pages. The body sits at its natural position below the left-aligned title. Do NOT force-center to fix this.

## Shared Runner

Keep one shared Slidev dependency project at `C:\Users\HP\OneDrive\Desktop\课程\slidev-runner`. Chapter directories only need `slides.md`; do not copy `node_modules`, package manifests, or lockfiles into every new chapter.

## Maintenance

- Before modifying or versioning this skill, read `references/versioning.md` and follow it exactly.
- Before creating any version commit, ask the user what content to include in the commit message.
- Keep only the current version snapshot directly at the repository root.
- Always push updates through the SSH deploy key documented in `references/versioning.md`.
- Keep `scripts/export-editable-pptx.mjs` in sync with `tools/export-editable-pptx.mjs`.
- Keep `scripts/export-lecture-pdf.mjs` in sync with `tools/export-lecture-pdf.mjs`.
- Update this SKILL.md and the workspace AGENTS.md together when export rules change.
