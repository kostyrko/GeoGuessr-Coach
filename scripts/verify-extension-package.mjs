import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const packageDirectory = resolve('dist/geoguessr-coach/browser');
const requiredFiles = [
  'index.html',
  'background.js',
  'popup.html',
  'popup.js',
  'content-bridge.js',
  'collector-main.js',
  'maplibre-gl-shared.mjs',
  'maplibre-gl-worker.mjs',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

for (const relativePath of requiredFiles) {
  const filePath = resolve(packageDirectory, relativePath);
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`Extension package is missing required asset: ${relativePath}`);
  }
}

const manifest = JSON.parse(await readFile(resolve(packageDirectory, 'manifest.json'), 'utf8'));

const expected = {
  manifest_version: 3,
  background: 'background.js',
  popup: 'popup.html',
  optionsPage: 'index.html',
};

if (manifest.manifest_version !== expected.manifest_version) {
  throw new Error('Extension package must use Manifest V3.');
}
if (manifest.background?.service_worker !== expected.background) {
  throw new Error('Manifest background service worker does not match the packaged worker.');
}
if (manifest.action?.default_popup !== expected.popup) {
  throw new Error('Manifest action popup does not match the packaged popup.');
}
if (manifest.options_page !== expected.optionsPage) {
  throw new Error('Manifest options page does not match the packaged dashboard.');
}
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage'])) {
  throw new Error('Manifest permissions must remain limited to storage.');
}
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://www.geoguessr.com/*'])) {
  throw new Error('Manifest host permission must remain limited to GeoGuessr.');
}

console.log(`Verified unpacked Chrome extension package: ${packageDirectory}`);
