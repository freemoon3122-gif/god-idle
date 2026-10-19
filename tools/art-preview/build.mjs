// 미리보기 빌드: esbuild로 render.tsx를 묶고(react-native-svg → svg-shim), HTML을 만들어 Playwright로 PNG를 찍는다
import { build } from 'esbuild';
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(here, 'render.tsx')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(out, 'render.mjs'),
  jsx: 'automatic',
  alias: { 'react-native-svg': join(here, 'svg-shim.tsx') },
  external: ['react', 'react-dom'],
  logLevel: 'error',
});
const { html } = await import(pathToFileURL(join(out, 'render.mjs')).href + '?' + Date.now());
const names = process.argv.slice(2);
const page = html(names);
writeFileSync(join(out, 'preview.html'), page);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await p.goto(pathToFileURL(join(out, 'preview.html')).href);
await p.screenshot({ path: join(out, 'preview.png'), fullPage: true });
await browser.close();
console.log('saved', join(out, 'preview.png'));
