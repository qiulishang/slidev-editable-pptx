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
  return process.env[`PDF_${name.toUpperCase().replaceAll('-', '_')}`] || fallback;
}

function findBrowser() {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  return candidates.find((file) => existsSync(file)) || undefined;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatMinutes(minutes) {
  return Math.round(minutes * 10) / 10;
}

function buildHtml(scriptEntries, slides) {
  const pages = slides.map((slide, index) => {
    const script = scriptEntries[index];
    const title = script?.title || `第${index + 1}页`;
    const content = script?.content || '';
    const minutes = script?.minutes || 0;
    const words = script?.words || 0;
    const text = script?.script || '';
    const paragraphs = String(text)
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<p>${escapeHtml(item)}</p>`)
      .join('');
    const fontSize = text.length > 1400 ? 15 : text.length > 1000 ? 16 : text.length > 600 ? 18 : 20;
    const lineHeight = fontSize >= 20 ? 1.55 : 1.45;
    return `
<div class="page slide-page">
  <img src="${slide.data}" alt="第${index + 1}页原课件" />
</div>
<div class="page script-page">
  <div class="script-header">
    <span class="script-slide">第${index + 1}页讲稿</span>
    <span class="script-title">${escapeHtml(title)}</span>
  </div>
  <div class="script-content">${escapeHtml(content)}</div>
  <div class="script-body" style="font-size:${fontSize}px;line-height:${lineHeight}">${paragraphs}</div>
  <div class="script-footer">预计约${formatMinutes(minutes)}分钟 · 约${words}字</div>
</div>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
@page {
  size: 1280px 720px;
  margin: 0;
}
html, body {
  margin: 0;
  padding: 0;
}
.page {
  width: 1280px;
  height: 720px;
  page-break-after: always;
  overflow: hidden;
  background: #ffffff;
}
.page:last-child {
  page-break-after: auto;
}
.slide-page img {
  display: block;
  width: 1280px;
  height: 720px;
  object-fit: contain;
}
.script-page {
  box-sizing: border-box;
  padding: 44px 64px 40px;
  font-family: "Microsoft YaHei", "SimSun", sans-serif;
}
.script-header {
  display: flex;
  align-items: baseline;
  gap: 18px;
  border-bottom: 3px solid #d7e6f2;
  padding-bottom: 12px;
}
.script-slide {
  font-size: 24px;
  font-weight: 700;
  color: #1d4ed8;
  white-space: nowrap;
}
.script-title {
  font-size: 20px;
  font-weight: 600;
  color: #172554;
}
.script-content {
  margin-top: 12px;
  font-size: 16px;
  line-height: 1.5;
  color: #475569;
}
.script-body {
  margin-top: 12px;
  color: #111827;
  text-align: justify;
}
.script-body p {
  margin: 0 0 10px;
}
.script-footer {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1e3a8a;
}
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

const entry = arg('entry', 'slides.md');
const output = arg('output');
const scriptPath = arg('script') || arg('lecture-script');
const executablePath = arg('executable-path') || findBrowser();
const portArg = Number(arg('port', '0')) || 0;

const entryPath = path.resolve(process.cwd(), entry);
const resolvedScriptPath = scriptPath
  ? path.resolve(process.cwd(), scriptPath)
  : path.join(path.dirname(entryPath), '讲稿内容.json');
const resolvedOutput = output
  ? path.resolve(process.cwd(), output)
  : path.join(path.dirname(entryPath), `${path.basename(entryPath, '.md')}-讲稿.pdf`);

const requireFromProject = createRequire(path.resolve(process.cwd(), 'package.json'));
const cliPackagePath = requireFromProject.resolve('@slidev/cli/package.json');
const cliIndexPath = path.join(path.dirname(cliPackagePath), 'dist/index.mjs');
const { createServer, resolveOptions } = await import(pathToFileURL(cliIndexPath).href);
const playwrightModule = await import(pathToFileURL(requireFromProject.resolve('playwright-chromium')).href);
const chromium = playwrightModule.chromium || playwrightModule.default?.chromium;

const scriptEntries = JSON.parse(await fs.readFile(resolvedScriptPath, 'utf8'));
if (!Array.isArray(scriptEntries) || scriptEntries.length === 0) {
  throw new Error(`Lecture script JSON is empty or invalid: ${resolvedScriptPath}`);
}

const options = await resolveOptions({ entry: entryPath, theme: undefined }, 'export');
const server = await createServer(options, { server: { port: portArg }, clearScreen: false });
let browser;

try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${port}/print?print=true`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.print-slide-container');
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
  await page.waitForFunction(() => document.querySelectorAll('.slidev-slide-loading').length === 0);

  const locator = page.locator('.print-slide-container');
  const slideCount = await locator.count();
  if (scriptEntries.length !== slideCount) {
    throw new Error(
      `Lecture PDF validation failed: expected ${scriptEntries.length} script entries, found ${slideCount} slides.`,
    );
  }

  const slides = [];
  for (let index = 0; index < slideCount; index += 1) {
    const current = locator.nth(index);
    await current.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const screenshot = await current.screenshot({ type: 'png' });
    slides.push({
      data: `data:image/png;base64,${screenshot.toString('base64')}`,
    });
  }

  await page.setContent(buildHtml(scriptEntries, slides), { waitUntil: 'load' });
  await page.pdf({
    path: resolvedOutput,
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log(`Exported lecture PDF with ${slideCount} paired pages to ${resolvedOutput}`);
} finally {
  await browser?.close();
  await server.close();
}
