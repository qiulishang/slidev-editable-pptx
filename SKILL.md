---
name: slidev-editable-pptx
description: Export and maintain editable PPTX files from Slidev lecture decks with enforced typography, centered balanced layouts, background-panel sizing, overlap validation, content-density audits, and outline- or user-confirmed time planning. Use when users ask to generate, regenerate, fix, or audit PPTX exports from Slidev projects, especially in the Chinese exam-prep lecture workspace, or when applying editable-text export rules to Slidev decks.
---

# Slidev Editable Pptx

## Overview

Generate editable PPTX files from Slidev decks by rendering slides in a browser, extracting text and panel geometry, then rebuilding slides as real PPTX text boxes. Native `slidev export --format pptx` produces full-page images, so do not use it when editable text is required.

Default behavior does not start a Slidev dev server. Only start `pnpm dev` when the user explicitly asks for a live preview.

## Time Planning

When generating or regenerating deck content, resolve the time plan before deciding section depth and slide allocation:

- If the chapter outline or source materials contain a time arrangement, follow that arrangement for content scope, section depth, and slide allocation.
- If no outline or time arrangement exists, ask the user for their time plan before generating content, then follow that user-provided arrangement.
- Keep the time plan as a generation constraint only. Do not add timings, schedule blocks, or percentage breakdowns to slides unless the user explicitly asks for them.

## Content Depth and Expansion

When the user reports that a deck is too thin, do not fix it by adding more headings alone. Expand the visible body text and keep the presenter script as the full explanation layer.

- Treat the outline time allocation as a depth guide: allocate more body text to major concepts, motor proteins, dynamic mechanisms, drug mechanisms, and clinical/application links.
- Use web or authoritative source material to verify mechanisms and examples before adding them. Do not copy web text verbatim; convert it into exam-oriented Chinese explanations.
- Organize each body page as "conclusion + mechanism + example/application + exam cue". Core mechanisms must appear in visible slide text, not only inside `<!-- ... -->` presenter notes.
- When presenter notes contain an explanation that is essential for answering exam questions, promote a distilled version to the visible slide as a bullet, small `[核心考点]`, `[易错提示]`, or `[考点提示]` block.
- Add scenario pages when the outline has room, such as cell migration, organelle positioning, disease links, and motor coordination, instead of leaving abstract keyword lists.
- Keep the layout rules below: if `--check-only` marks a page dense, split or compress it; if a page remains sparse after expansion, add a framework, table, scenario, or exam-tip block.

## Non-Text Materials and Links

For core mechanisms, key points, and outline prompts, verify the mechanism through web or authoritative sources, then insert relevant demonstration images, video links, or hyperlinks instead of leaving the page as a keyword-only list.

- Search and verify sources before use. Prefer Wikimedia Commons, OpenStax, NIH/PMC, HHMI BioInteractive, and equivalent public or authoritative educational sources.
- Download reused images into the chapter `图/` folder, reference them with local relative paths, and record source URLs and license notes in the presenter notes.
- Prefer clickable links for videos and extended reading. Use local or PowerPoint-compatible online embeds only when they are necessary and have been tested in the export flow.
- Keep non-text elements inside balanced panels. Images and media must participate in body centering, fit calculations, and boundary validation, just like text blocks.
- Run `--check-only` after adding images or links and rebalance pages until the layout audit no longer reports dense, sparse, or one-sided whitespace issues.
- The export script embeds `<img>` elements as real images in the PPTX and preserves `<a href>` text as clickable hyperlinks. Do not rely on raw URL strings as a substitute.

## Quick Start

Run from the shared dependency runner in the lecture workspace:

```powershell
cd "C:\Users\HP\OneDrive\Desktop\课程\slidev-runner"
node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs" --entry "../细生/6/protein-sorting-lecture/slides.md" --output "../细生/6/{chapter-title}-考研精讲.pptx"
```

The script starts Slidev, renders the print page with Playwright and Edge, extracts text, images, media, backgrounds, and hyperlinks, writes the editable PPTX, and validates layout before writing.

Before export, run a lightweight slide-count check:

```powershell
node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs" --entry "../细生/6/protein-sorting-lecture/slides.md" --check-only --expected-slides 28
```

`--check-only` also prints a layout audit with per-slide density, horizontal/vertical whitespace, and dense/sparse warnings. Add `--layout-report <path>` for structured JSON and `--strict-layout` to fail when density or whitespace issues remain.

If Edge is not installed at the default path, pass an explicit browser:

```powershell
node "C:\Users\HP\OneDrive\Desktop\课程\tools\export-editable-pptx.mjs" --entry "../细生/6/protein-sorting-lecture/slides.md" --output "../细生/6/{chapter-title}-考研精讲.pptx" --executable-path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

## Layout Rules

- Fonts: Latin letters and digits use Times New Roman; Chinese characters use 宋体.
- Text box width must be determined by its background panel and must not exceed the panel content area.
- Shrink font size when text would exceed the panel; do not let text overflow the panel.
- Prevent text box overlaps; every text box must stay inside its corresponding panel.
- Keep text boxes non-wrapping by default. Allow wrapping only when text exceeds the background or the source content is already multiline.
- For bullet or section content outside tables, use a single light background panel to constrain text width; tables keep cell boundaries.
- Center content by default, including tables. Keep small titles (`h1`-`h4`) top-left on ordinary pages. Center the whole slide for cover, module-section, and summary pages.
- Move text boxes and their background panels together as one unit. Distribute whitespace around the page edges instead of leaving blank space on one side.
- Treat the body text block as one unit and center it horizontally and vertically in the remaining space below the page title. Card headings inside the body are part of that body block, not page-title decorations.
- Treat images, media, and hyperlink blocks as part of the body layout. Include their rectangles when calculating page fit, horizontal centering, vertical centering, and whitespace balance.
- Keep images and media inside the slide and their intended panels; prevent them from overlapping text boxes or being pushed outside the slide by body centering.
- Keep information density even across the deck. Prefer 4-8 entries or 2-4 short point blocks per body page; dense slides should be split or compressed, sparse slides should be merged or expanded with a concise framework, comparison table, or summary block.
- Avoid excessive empty background panels; merge or expand panels to keep the page balanced.

## Verification

The script validates before writing and throws when text boxes overlap, leave the slide, or exceed their background panel.

The script also fails on blank slides and mismatched `--expected-slides` counts before writing. Use `--allow-blank` only when a blank slide is intentional.

The layout audit flags dense/sparse pages and horizontal/vertical whitespace imbalances. Before final delivery, rebalance the source slides so `dense` and `sparse` pages are brought closer together, and verify again with `--check-only`.

For independent verification, unzip the generated PPTX and check:

- `ppt/slides/slide*.xml` contains `<a:t>` text runs.
- No slide contains a full-page `<p:pic>` image.
- Font runs use `<a:latin typeface="Times New Roman"/>` for Latin/digit text and `<a:ea typeface="宋体"/>` for Chinese text.
- Text boxes do not overlap and stay inside their panels.
- `ppt/media/` contains the expected image files, and slides using images contain `<a:blip>` references.
- Slide relationship files contain external hyperlink relationships for `<a href>` content when links were added in the source.

## Shared Runner

Keep one shared Slidev dependency project at `C:\Users\HP\OneDrive\Desktop\课程\slidev-runner`. Chapter directories only need `slides.md`; do not copy `node_modules`, package manifests, or lockfiles into every new chapter.

## Maintenance

- Before modifying or versioning this skill, read `references/versioning.md` and follow it exactly in every new conversation.
- Before creating any version commit, ask the user what content to include in the commit message and wait for a response.
- Keep only the current version snapshot directly at the repository root; delete obsolete snapshots and tags from local and GitHub as part of each version update.
- Always push updates through the SSH deploy key documented in `references/versioning.md`; do not switch back to HTTPS.
- Keep `scripts/export-editable-pptx.mjs` in sync with the workspace `tools/export-editable-pptx.mjs`.
- Update this SKILL.md and the workspace `AGENTS.md` together when export rules change.
