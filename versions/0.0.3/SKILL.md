---
name: slidev-editable-pptx
description: Export and maintain editable PPTX files from Slidev lecture decks with enforced typography, centered balanced layouts, background-panel sizing, and overlap validation. Use when users ask to generate, regenerate, fix, or audit PPTX exports from Slidev projects, especially in the Chinese exam-prep lecture workspace, or when applying editable-text export rules to Slidev decks.
---

# Slidev Editable Pptx

## Overview

Generate editable PPTX files from Slidev decks by rendering slides in a browser, extracting text and panel geometry, then rebuilding slides as real PPTX text boxes. Native `slidev export --format pptx` produces full-page images, so do not use it when editable text is required.

## Quick Start

Run from the target Slidev project directory:

```powershell
node "C:\Users\HP\.codex\skills\slidev-editable-pptx\scripts\export-editable-pptx.mjs" --entry slides.md --output "../{chapter-title}-exam-lecture.pptx"
```

The script starts Slidev, renders the print page with Playwright and Edge, extracts text and backgrounds, writes the editable PPTX, and validates layout before writing.

If Edge is not installed at the default path, pass an explicit browser:

```powershell
node "C:\Users\HP\.codex\skills\slidev-editable-pptx\scripts\export-editable-pptx.mjs" --entry slides.md --output "../{chapter-title}-exam-lecture.pptx" --executable-path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

## Layout Rules

- Fonts: Latin letters and digits use Times New Roman; Chinese characters use SimSun.
- Text box width must be determined by its background panel and must not exceed the panel content area.
- Shrink font size when text would exceed the panel; do not let text overflow the panel.
- Prevent text box overlaps; every text box must stay inside its corresponding panel.
- Keep text boxes non-wrapping by default. Allow wrapping only when text exceeds the background or the source content is already multiline.
- For bullet or section content outside tables, use a single light background panel to constrain text width; tables keep cell boundaries.
- Center content by default, including tables. Keep small titles (`h1`-`h4`) top-left on ordinary pages. Center the whole slide for cover, module-section, and summary pages.
- Move text boxes and their background panels together as one unit. Distribute whitespace around the page edges instead of leaving blank space on one side.
- Avoid excessive empty background panels; merge or expand panels to keep the page balanced.

## Verification

The script validates before writing and throws when text boxes overlap, leave the slide, or exceed their background panel.

For independent verification, unzip the generated PPTX and check:

- `ppt/slides/slide*.xml` contains `<a:t>` text runs.
- No slide contains a full-page `<p:pic>` image.
- Font runs use `<a:latin typeface="Times New Roman"/>` for Latin/digit text and `<a:ea typeface="SimSun"/>` for Chinese text.
- Text boxes do not overlap and stay inside their panels.

## Maintenance

- Before modifying or versioning this skill, read `references/versioning.md` and follow it exactly in every new conversation.
- Always push updates through the SSH deploy key documented in `references/versioning.md`; do not switch back to HTTPS.
- Keep `scripts/export-editable-pptx.mjs` in sync with the workspace `tools/export-editable-pptx.mjs`.
- Update this SKILL.md and the workspace `AGENTS.md` together when export rules change.
