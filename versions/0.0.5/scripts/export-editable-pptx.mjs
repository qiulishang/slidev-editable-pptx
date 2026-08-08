import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function arg(name, fallback = '') {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index >= 0 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return process.env[`PPTX_${name.toUpperCase().replaceAll('-', '_')}`] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function findBrowser() {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  return candidates.find((file) => existsSync(file)) || undefined;
}

function pxToInch(value, scale = 1, offset = 0) {
  return (value * scale + offset) / 96;
}

function pxToPt(value, scale = 1) {
  return (value * scale * 72) / 96;
}

function splitByFont(text) {
  const cjkPattern = /[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u2014\u2018-\u201D\u2026\u00B7\u2192]+/g;
  const parts = [];
  let lastIndex = 0;
  for (const match of text.matchAll(cjkPattern)) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), font: 'Times New Roman' });
    }
    parts.push({ text: match[0], font: '宋体' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), font: 'Times New Roman' });
  }
  return parts.length ? parts : [{ text, font: 'Times New Roman' }];
}

async function extractFromBrowser(page) {
  return page.evaluate(() => {
    const slideContainers = Array.from(document.querySelectorAll('.print-slide-container'));

    function parseColor(value, opacity = 1) {
      const match = /rgba?\(([^)]+)\)/.exec(value || '');
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      const r = parts[0] || 0;
      const g = parts[1] || 0;
      const b = parts[2] || 0;
      const a = parts.length >= 4 ? parts[3] : 1;
      const alpha = Math.max(0, Math.min(1, a * opacity));
      const blend = (channel) => Math.round(channel * alpha + 255 * (1 - alpha));
      return {
        hex: [r, g, b].map((channel) => blend(channel).toString(16).padStart(2, '0')).join('').toUpperCase(),
        alpha,
      };
    }

    function findPanel(element, slide, slideWidth) {
      let current = element;
      while (current && current !== slide) {
        const style = getComputedStyle(current);
        const rect = current.getBoundingClientRect();
        const tag = (current.tagName || '').toLowerCase();
        const className = typeof current.className === 'string' ? current.className : '';
        const background = parseColor(style.backgroundColor, 1);
        const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
        const isColumn = className.includes('col-left') || className.includes('col-right');
        const isCell = tag === 'td' || tag === 'th';
        const isCard = (background && background.alpha > 0 && rect.width < slideWidth - 2)
          || (borderLeft > 0 && rect.width < slideWidth - 2);
        if (isColumn || isCell || isCard) return current;
        current = current.parentElement;
      }
      current = element;
      while (current && current !== slide) {
        const tag = (current.tagName || '').toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          let outer = current;
          let parent = outer.parentElement;
          while (parent && parent !== slide && ['UL', 'OL'].includes((parent.tagName || '').toUpperCase())) {
            outer = parent;
            parent = outer.parentElement;
          }
          return outer;
        }
        current = current.parentElement;
      }
      return slide;
    }

    function getPanelData(panel, slide, slideRect, slideWidth, slideHeight, synthetic = false) {
      if (panel === slide) {
        return {
          key: 'slide',
          x: 0,
          y: 0,
          w: slideWidth,
          h: slideHeight,
          contentLeft: 10,
          contentRight: slideWidth - 10,
          contentTop: 10,
          contentBottom: slideHeight - 10,
        };
      }
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      return {
        key: `${rect.left}:${rect.top}:${rect.width}:${rect.height}`,
        x: rect.left - slideRect.left,
        y: rect.top - slideRect.top,
        w: rect.width,
        h: rect.height,
        contentLeft: rect.left - slideRect.left + paddingLeft,
        contentRight: rect.right - slideRect.left - paddingRight,
        contentTop: rect.top - slideRect.top + paddingTop,
        contentBottom: rect.bottom - slideRect.top - paddingBottom,
        synthetic,
      };
    }

    function mergeSyntheticPanels(panelMap, slideWidth) {
      const merged = [];
      for (const panel of panelMap.values()) {
        let target = null;
        for (const item of merged) {
          const itemContainsPanel = item.x <= panel.x + 1
            && item.y <= panel.y + 1
            && item.x + item.w >= panel.x + panel.w - 1
            && item.y + item.h >= panel.y + panel.h - 1;
          const panelContainsItem = panel.x <= item.x + 1
            && panel.y <= item.y + 1
            && panel.x + panel.w >= item.x + item.w - 1
            && panel.y + panel.h >= item.y + item.h - 1;
          const overlapX = panel.x < item.x + item.w - 1 && item.x < panel.x + panel.w - 1;
          const overlapY = panel.y < item.y + item.h - 1 && item.y < panel.y + panel.h - 1;
          const verticalNear = overlapX && panel.y >= item.y - 16 && panel.y <= item.y + item.h + 16;
          if (itemContainsPanel || panelContainsItem || (overlapX && overlapY) || verticalNear) {
            target = item;
            break;
          }
        }
        if (target) {
          target.x = Math.min(target.x, panel.x);
          target.y = Math.min(target.y, panel.y);
          target.w = Math.max(target.x + target.w, panel.x + panel.w) - target.x;
          target.h = Math.max(target.y + target.h, panel.y + panel.h) - target.y;
          target.keys.add(panel.key);
          target.key = `merged:${target.x}:${target.y}:${target.w}:${target.h}`;
        }
        else {
          merged.push({
            ...panel,
            keys: new Set([panel.key]),
            key: `merged:${panel.x}:${panel.y}:${panel.w}:${panel.h}`,
          });
        }
      }

      const margin = 12;
      for (const panel of merged) {
        panel.x = margin;
        panel.w = Math.max(10, slideWidth - margin * 2);
        panel.contentLeft = margin + 8;
        panel.contentRight = slideWidth - margin - 8;
        panel.key = `expanded:${panel.x}:${panel.y}:${panel.w}:${panel.h}`;
      }

      const map = new Map();
      for (const panel of merged) {
        for (const key of panel.keys) map.set(key, panel);
      }
      return map;
    }

    return slideContainers.map((slide) => {
      const slideRect = slide.getBoundingClientRect();
      const slideWidth = slideRect.width;
      const slideHeight = slideRect.height;
      const items = [];
      const syntheticPanels = new Map();
      let domOrder = 0;

      const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const raw = node.nodeValue || '';
        const text = raw.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const element = node.parentElement;
        if (!element || element.closest('.monaco-editor, .katex-mathml, script, style')) continue;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const range = document.createRange();
        range.selectNodeContents(node);
        const fontSize = Number.parseFloat(style.fontSize) || 16;
        const panel = findPanel(element, slide, slideWidth);
        const synthetic = panel !== slide && ['UL', 'OL'].includes((panel.tagName || '').toUpperCase());
        const panelInfo = getPanelData(panel, slide, slideRect, slideWidth, slideHeight, synthetic);
        if (panelInfo.synthetic && !syntheticPanels.has(panelInfo.key)) {
          syntheticPanels.set(panelInfo.key, panelInfo);
        }
        const color = parseColor(style.color, Number.parseFloat(style.opacity) || 1) || { hex: '000000', alpha: 1 };
        const rect = range.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        items.push({
          domOrder: domOrder++,
          text,
          tag: (element.tagName || '').toLowerCase(),
          rawLead: /^\s/.test(raw),
          rawTail: /\s$/.test(raw),
          x: rect.left - slideRect.left,
          y: rect.top - slideRect.top,
          w: rect.width,
          h: rect.height,
          fontSize,
          bold: (Number.parseInt(style.fontWeight, 10) || 400) >= 600,
          italic: style.fontStyle === 'italic',
          fontFace: (style.fontFamily.split(',')[0] || 'Microsoft YaHei').replace(/["']/g, '').trim(),
          color,
          align: style.textAlign,
          lineHeight: Number.parseFloat(style.lineHeight) || fontSize * 1.4,
          isListItem: Boolean(element.closest('li')),
          panel: panelInfo,
        });
      }

      const finalSyntheticPanels = mergeSyntheticPanels(syntheticPanels, slideWidth);
      for (const item of items) {
        if (item.panel.synthetic) {
          item.panel = finalSyntheticPanels.get(item.panel.key) || item.panel;
        }
      }

      const groupsByPanel = new Map();
      for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
        const panelGroups = groupsByPanel.get(item.panel.key) || [];
        let placed = false;
        for (const group of panelGroups) {
          if (item.y < group.maxBottom && group.y < item.y + item.h) {
            group.items.push(item);
            group.maxBottom = Math.max(group.maxBottom, item.y + item.h);
            placed = true;
            break;
          }
        }
        if (!placed) {
          panelGroups.push({ y: item.y, maxBottom: item.y + item.h, items: [item] });
          groupsByPanel.set(item.panel.key, panelGroups);
        }
      }

      const groupData = Array.from(groupsByPanel.values()).flatMap((panelGroups) => panelGroups.map(({ items: runs }) => {
        const sorted = [...runs].sort((a, b) => a.domOrder - b.domOrder);
        const panel = sorted[0].panel;
        const minX = Math.min(...sorted.map((run) => run.x));
        const minY = Math.min(...sorted.map((run) => run.y));
        const maxRight = Math.max(...sorted.map((run) => run.x + run.w));
        const maxBottom = Math.max(...sorted.map((run) => run.y + run.h));
        const x = Math.max(minX, panel.contentLeft);
        const desiredWidth = Math.max(1, maxRight - minX);
        const availableWidth = Math.max(1, panel.contentRight - x);
        const fontScale = Math.min(1, availableWidth / desiredWidth);
        const width = Math.max(1, Math.min(availableWidth, desiredWidth * fontScale));
        const height = Math.max(8, (maxBottom - minY) * fontScale);
        const first = sorted[0];
        const align = first.align === 'center'
          ? 'center'
          : first.align === 'right' || first.align === 'end'
            ? 'right'
            : 'left';

        let previousTail = false;
        const textRuns = sorted.map((run, index) => {
          let text = run.text;
          if (index > 0 && (previousTail || run.rawLead) && !text.startsWith(' ')) text = ` ${text}`;
          previousTail = run.rawTail || text.endsWith(' ');
          return {
            text,
            opts: {
              fontSize: run.fontSize,
              bold: run.bold,
              italic: run.italic,
              color: run.color.hex,
              fontFace: run.fontFace || 'Microsoft YaHei',
            },
          };
        });

        if (sorted.some((run) => run.isListItem)) {
          const firstOpts = textRuns[0]?.opts || { color: '000000' };
          textRuns.unshift({ text: '\u2022 ', opts: { ...firstOpts, bold: false } });
        }

        return {
          x,
          y: minY,
          w: width,
          h: height,
          fontScale,
          panelKey: panel.key,
          panelLeft: panel.contentLeft,
          panelRight: panel.contentRight,
          wraps: fontScale < 1 || (maxBottom - minY) > first.lineHeight * 1.4,
          isHeading: sorted.some((run) => ['h1', 'h2', 'h3', 'h4'].includes(run.tag)),
          align,
          lineSpacingMultiple: Math.max(1, first.lineHeight / first.fontSize),
          textRuns,
        };
      }));

      const shapes = [];
      slide.querySelectorAll('*').forEach((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        if (width < 2 || height < 2) return;
        const x = rect.left - slideRect.left;
        const y = rect.top - slideRect.top;
        const background = parseColor(style.backgroundColor, Number.parseFloat(style.opacity) || 1);
        const fullSlide = width >= slideWidth - 2 && height >= slideHeight - 2;
        if (background && background.alpha > 0 && !fullSlide) {
          const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
          shapes.push({
            type: radius > 0 ? 'roundRect' : 'rect',
            x,
            y,
            w: width,
            h: height,
            fill: background.hex,
            radius,
          });
        }
        const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
        if (borderLeft > 0) {
          const borderColor = parseColor(style.borderLeftColor, Number.parseFloat(style.opacity) || 1);
          if (borderColor && borderColor.alpha > 0) {
            shapes.push({ type: 'rect', x, y, w: borderLeft, h: height, fill: borderColor.hex, radius: 0 });
          }
        }
      });

      const uniqueSyntheticPanels = new Map(
        Array.from(finalSyntheticPanels.values()).map((panelInfo) => [panelInfo.key, panelInfo]),
      );
      const syntheticShapes = Array.from(uniqueSyntheticPanels.values()).map((panelInfo) => ({
        type: 'rect',
        x: panelInfo.x,
        y: panelInfo.y,
        w: panelInfo.w,
        h: panelInfo.h,
        fill: 'F5F7FA',
        radius: 0,
      }));

      return {
        width: slideWidth,
        height: slideHeight,
        centerAll: Boolean(slide.querySelector('.slidev-layout.section, .slidev-layout.cover'))
          || /总结|总复习/.test(slide.textContent || ''),
        groups: groupData,
        shapes: [...syntheticShapes, ...shapes],
      };
    });
  });
}

function fitSlide(data) {
  if (!data.groups.length) {
    return {
      scale: 1,
      layoutOffsetX: 0,
      layoutOffsetY: 0,
      centerOffsetX: 0,
      centerOffsetY: 0,
      centerAll: false,
    };
  }
  const allMinX = Math.min(...data.groups.map((group) => group.x));
  const allMinY = Math.min(...data.groups.map((group) => group.y));
  const allMaxRight = Math.max(...data.groups.map((group) => group.x + group.w));
  const allMaxBottom = Math.max(...data.groups.map((group) => group.y + group.h));
  const overflows = allMaxBottom > data.height || allMaxRight > data.width;
  const hasBodyContent = data.groups.some((group) => !group.isHeading);
  const centerAll = Boolean(data.centerAll) || !hasBodyContent;
  const measureGroups = !overflows && !centerAll
    ? data.groups.filter((group) => !group.isHeading)
    : data.groups;
  const groups = measureGroups.length ? measureGroups : data.groups;
  const minX = Math.min(...groups.map((group) => group.x));
  const minY = Math.min(...groups.map((group) => group.y));
  const maxRight = Math.max(...groups.map((group) => group.x + group.w));
  const maxBottom = Math.max(...groups.map((group) => group.y + group.h));
  const contentWidth = maxRight - minX;
  const contentHeight = maxBottom - minY;
  if (overflows) {
    const margin = 8;
    const scaleX = (data.width - margin * 2) / Math.max(1, contentWidth);
    const scaleY = (data.height - margin * 2) / Math.max(1, contentHeight);
    const scale = Math.min(1, scaleX, scaleY);
    return {
      scale,
      layoutOffsetX: margin - minX * scale,
      layoutOffsetY: margin - minY * scale,
      centerOffsetX: 0,
      centerOffsetY: 0,
      centerAll,
    };
  }

  const centerOffsetX = contentWidth < data.width * 0.85
      ? (data.width - contentWidth) / 2 - minX
      : 0;
  const centerOffsetY = centerAll && contentHeight < data.height * 0.8
    ? (data.height - contentHeight) / 2 - minY
    : 0;
  return {
    scale: 1,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
    centerOffsetX,
    centerOffsetY,
    centerAll,
  };
}

function validateSlideLayout(data, fit, slideIndex = 0) {
  const boxes = data.groups.map((group) => {
    const centerX = group.isHeading && !fit.centerAll ? 0 : fit.centerOffsetX;
    const centerY = group.isHeading && !fit.centerAll ? 0 : fit.centerOffsetY;
    return {
      group,
      x1: group.x * fit.scale + fit.layoutOffsetX + centerX,
      y1: group.y * fit.scale + fit.layoutOffsetY + centerY,
      x2: (group.x + group.w) * fit.scale + fit.layoutOffsetX + centerX,
      y2: (group.y + group.h) * fit.scale + fit.layoutOffsetY + centerY,
      panelLeft: group.panelLeft * fit.scale + fit.layoutOffsetX + fit.centerOffsetX,
      panelRight: group.panelRight * fit.scale + fit.layoutOffsetX + fit.centerOffsetX,
    };
  });

  for (let i = 0; i < boxes.length; i += 1) {
    const a = boxes[i];
    if (a.x1 < -1 || a.y1 < -1 || a.x2 > data.width + 1 || a.y2 > data.height + 1) {
      throw new Error(`Editable PPTX validation failed on slide ${slideIndex + 1}: text box is outside the slide.`);
    }
    const isCenteredHeading = a.group.isHeading && !fit.centerAll;
    if (!isCenteredHeading && (a.x1 < a.panelLeft - 2 || a.x2 > a.panelRight + 2)) {
      throw new Error(`Editable PPTX validation failed on slide ${slideIndex + 1}: text box exceeds its background panel.`);
    }
    for (let j = i + 1; j < boxes.length; j += 1) {
      const b = boxes[j];
      const overlapX = a.x1 < b.x2 - 1 && b.x1 < a.x2 - 1;
      const overlapY = a.y1 < b.y2 - 1 && b.y1 < a.y2 - 1;
      if (overlapX && overlapY) {
        const textA = a.group.textRuns.map((run) => run.text).join('');
        const textB = b.group.textRuns.map((run) => run.text).join('');
        throw new Error(`Editable PPTX validation failed on slide ${slideIndex + 1}: text boxes overlap "${textA}" / "${textB}".`);
      }
    }
  }
}

function validateNoBlankSlides(slides, allowBlank = false) {
  if (!slides.length) {
    throw new Error('Editable PPTX validation failed: no slides found.');
  }
  if (allowBlank) {
    return;
  }
  const blank = slides
    .map((data, index) => (data.groups.length ? null : index + 1))
    .filter(Boolean);
  if (blank.length) {
    throw new Error(`Editable PPTX validation failed: blank slide(s) ${blank.join(', ')}. Use --allow-blank to permit intentional blank slides.`);
  }
}

const entry = arg('entry', 'slides.md');
const output = arg('output');
const executablePath = arg('executable-path') || findBrowser();
const portArg = Number(arg('port', '0')) || 0;
const checkOnly = hasFlag('check-only');
const allowBlank = hasFlag('allow-blank');
const expectedSlides = Number(arg('expected-slides', '0')) || 0;

const requireFromProject = createRequire(path.resolve(process.cwd(), 'package.json'));
const cliPackagePath = requireFromProject.resolve('@slidev/cli/package.json');
const cliIndexPath = path.join(path.dirname(cliPackagePath), 'dist/index.mjs');
const { createServer, resolveOptions } = await import(pathToFileURL(cliIndexPath).href);
const playwrightModule = await import(pathToFileURL(requireFromProject.resolve('playwright-chromium')).href);
const chromium = playwrightModule.chromium || playwrightModule.default?.chromium;
const requireFromCli = createRequire(cliPackagePath);
const PptxGenJS = requireFromCli('pptxgenjs');

const options = await resolveOptions({ entry, theme: undefined }, 'export');
const server = await createServer(options, { server: { port: portArg }, clearScreen: false });
let browser;

try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://localhost:${port}/print?print=true`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.print-slide-container');
  await page.waitForFunction(() => document.querySelectorAll('.slidev-slide-loading').length === 0);

  const slides = await extractFromBrowser(page);
  validateNoBlankSlides(slides, allowBlank);
  if (expectedSlides && slides.length !== expectedSlides) {
    throw new Error(`Editable PPTX validation failed: expected ${expectedSlides} slides, found ${slides.length}.`);
  }
  if (checkOnly) {
    const blankSlides = slides.filter((data) => data.groups.length === 0).length;
    console.log(`Checked ${slides.length} editable slides (${blankSlides} blank).`);
  } else {
    if (!output) {
      throw new Error('Missing required --output path.');
    }
    const first = slides[0];
    const layoutName = 'slidev-editable';
    const pptx = new PptxGenJS();
    pptx.defineLayout({
      name: layoutName,
      width: first.width / 96,
      height: first.height / 96,
    });
    pptx.layout = layoutName;
    pptx.author = 'Slidev editable export';
    pptx.company = 'Created using Slidev';

    for (const [slideIndex, data] of slides.entries()) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      const fit = fitSlide(data);
      validateSlideLayout(data, fit, slideIndex);

      for (const shape of data.shapes) {
        const shapeOptions = {
          x: pxToInch(shape.x, fit.scale, fit.layoutOffsetX + fit.centerOffsetX),
          y: pxToInch(shape.y, fit.scale, fit.layoutOffsetY + fit.centerOffsetY),
          w: pxToInch(shape.w, fit.scale),
          h: pxToInch(shape.h, fit.scale),
          fill: { color: shape.fill },
        };
        if (shape.type === 'roundRect') {
          shapeOptions.rectRadius = Math.min(0.5, shape.radius / Math.min(shape.w, shape.h));
        }
        slide.addShape(shape.type, shapeOptions);
      }

      for (const group of data.groups) {
        const centerX = group.isHeading && !fit.centerAll ? 0 : fit.centerOffsetX;
        const centerY = group.isHeading && !fit.centerAll ? 0 : fit.centerOffsetY;
        const textRuns = [];
        for (const run of group.textRuns) {
          const fontParts = splitByFont(run.text);
          for (const part of fontParts) {
            textRuns.push({
              text: part.text,
              options: {
                fontSize: pxToPt(run.opts.fontSize * group.fontScale, fit.scale),
                bold: run.opts.bold,
                italic: run.opts.italic,
                color: run.opts.color,
                fontFace: part.font,
              },
            });
          }
        }
        slide.addText(textRuns, {
          x: pxToInch(group.x, fit.scale, fit.layoutOffsetX + centerX),
          y: pxToInch(group.y, fit.scale, fit.layoutOffsetY + centerY),
          w: pxToInch(group.w, fit.scale),
          h: pxToInch(group.h, fit.scale),
          margin: 0,
          valign: 'top',
          align: group.align,
          fit: 'none',
          wrap: group.wraps,
          isTextBox: true,
          lineSpacingMultiple: group.lineSpacingMultiple,
        });
      }
    }

    const target = path.resolve(process.cwd(), output || 'slides-editable.pptx');
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    await fs.writeFile(target, buffer);
    console.log(`Exported ${slides.length} editable slides to ${target}`);
  }
} finally {
  await browser?.close();
  await server.close();
}
