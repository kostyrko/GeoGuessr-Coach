import { readFile } from 'node:fs/promises';

const indexPath = new URL('../dist/geoguessr-coach/browser/index.html', import.meta.url);
const indexHtml = await readFile(indexPath, 'utf8');

if (/\son(?:load|error)\s*=/i.test(indexHtml)) {
  throw new Error(
    'The extension index contains an inline event handler blocked by Manifest V3 CSP.',
  );
}
