#!/usr/bin/env node
/**
 * Prerender the landing page ("/") into dist/index.html after `vite build`.
 *
 * The site is a client-rendered SPA, so without this step crawlers that don't
 * execute JavaScript (Bing, social scrapers, LLM crawlers) see an empty
 * <div id="root">. This script renders the built site in headless Chrome and
 * bakes the landing page HTML into dist/index.html. React's createRoot()
 * replaces the static content on mount, and an inline guard clears it on
 * non-"/" paths (the SPA fallback serves index.html for every route).
 *
 * Fails soft: if Chrome is missing or rendering fails, the SPA still works —
 * we log loudly and exit 0 so deploys are never blocked.
 *
 * Usage: node scripts/prerender.mjs   (run from autodash-fe/, after vite build)
 */
import { spawn, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = join(root, 'dist', 'index.html');
const PORT = 4173;
const URL_TO_RENDER = `http://localhost:${PORT}/`;

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  // Linux / CI (GitHub ubuntu runners ship google-chrome)
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium']) {
    try {
      return execSync(`command -v ${bin}`, { encoding: 'utf8' }).trim() || null;
    } catch { /* keep looking */ }
  }
  return null;
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`preview server did not become ready at ${url}`);
}

function fail(msg) {
  console.error(`\n[prerender] WARNING: ${msg}`);
  console.error('[prerender] Skipping prerender — the site still works as a plain SPA.\n');
  process.exit(0);
}

if (!existsSync(distIndex)) fail('dist/index.html not found — run `npx vite build` first.');

const chrome = findChrome();
if (!chrome) fail('no Chrome/Chromium binary found (set CHROME_PATH to override).');

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
  detached: false,
});
const killServer = () => { try { server.kill('SIGTERM'); } catch { /* already dead */ } };
process.on('exit', killServer);

try {
  await waitForServer(URL_TO_RENDER);

  // --virtual-time-budget fast-forwards timers (typewriter animation, auth
  // check) so the page settles before the DOM is serialized.
  const dom = execSync(
    [
      JSON.stringify(chrome),
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--window-size=1280,1024',
      '--virtual-time-budget=15000',
      '--dump-dom',
      JSON.stringify(URL_TO_RENDER),
    ].join(' '),
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 }
  );

  // Extract the rendered #root subtree from the serialized body.
  const bodyMatch = dom.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) fail('could not find <body> in Chrome output.');
  const body = bodyMatch[1];
  const rootStart = body.indexOf('<div id="root">');
  const rootEnd = body.lastIndexOf('</div>');
  if (rootStart === -1 || rootEnd === -1) fail('could not find #root in rendered output.');
  const renderedRoot = body.slice(rootStart, rootEnd + '</div>'.length);

  // Sanity check: the landing page actually rendered (not a blank auth gate).
  if (!renderedRoot.includes('lr-hero')) {
    fail('rendered output does not contain the landing page (lr-hero not found).');
  }

  // The SPA fallback serves index.html on every path; the guard script clears
  // the baked-in landing HTML on non-"/" paths before React (a deferred module
  // script) mounts, so /login and /view/* don't flash landing content.
  const guard =
    '<script>if(location.pathname!=="/"){var __r=document.getElementById("root");if(__r)__r.textContent="";}</script>';

  const indexHtml = readFileSync(distIndex, 'utf8');
  if (!indexHtml.includes('<div id="root"></div>')) {
    fail('dist/index.html has no empty <div id="root"></div> to replace (already prerendered?).');
  }
  writeFileSync(distIndex, indexHtml.replace('<div id="root"></div>', renderedRoot + guard));
  console.log(`[prerender] OK — baked ${(renderedRoot.length / 1024).toFixed(1)} kB of landing HTML into dist/index.html`);
} catch (e) {
  fail(e.message);
} finally {
  killServer();
}
