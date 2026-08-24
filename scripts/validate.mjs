import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const manifest = JSON.parse(await read('manifest.json'));
const packageJson = JSON.parse(await read('package.json'));

assert(manifest.manifest_version === 3, 'manifest.json must use Manifest V3.');
assert(manifest.version === packageJson.version, 'Manifest and package versions must match.');
assert(manifest.permissions?.length === 1 && manifest.permissions[0] === 'storage', 'Only the storage extension permission is expected.');
assert(manifest.chrome_url_overrides?.newtab === 'dashboard.html', 'New tab override is missing.');
assert(manifest.options_ui?.page === 'options.html', 'Options page is missing.');

const expectedHosts = [
  'https://api.openweathermap.org/*',
  'https://api.github.com/*',
  'https://leetcode-api-faisal.vercel.app/*',
  'https://dev.to/*',
  'https://hacker-news.firebaseio.com/*',
  'https://api.stackexchange.com/*'
];
expectedHosts.forEach((host) => assert(manifest.host_permissions?.includes(host), `Missing host permission: ${host}`));

const requiredFiles = [
  'dashboard.html',
  'dashboard.css',
  'dashboard.js',
  'options.html',
  'options.css',
  'options.js',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md'
];

await Promise.all(requiredFiles.map((path) => access(new URL(`../${path}`, import.meta.url), constants.R_OK)));

const [dashboardHtml, optionsHtml, dashboardJs, optionsJs, readme] = await Promise.all([
  read('dashboard.html'),
  read('options.html'),
  read('dashboard.js'),
  read('options.js'),
  read('README.md')
]);

assert(dashboardHtml.includes('dashboard.js'), 'dashboard.html must load dashboard.js.');
assert(optionsHtml.includes('options.js'), 'options.html must load options.js.');
assert(!dashboardJs.includes('.innerHTML'), 'dashboard.js must not inject HTML strings.');
assert(!optionsJs.includes('.innerHTML'), 'options.js must not inject HTML strings.');
assert(!readme.includes('google.com/search?q='), 'README contains a search-wrapped or placeholder link.');
assert(!readme.includes('your-username'), 'README contains a username placeholder.');
assert(!dashboardJs.includes('paste your existing functions'), 'Dashboard contains incomplete placeholder logic.');

const assertReferencedIdsExist = (script, html, label) => {
  const ids = [...script.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
  ids.forEach((id) => assert(html.includes(`id="${id}"`), `${label} references missing element #${id}.`));
};

assertReferencedIdsExist(dashboardJs, dashboardHtml, 'dashboard.js');
assertReferencedIdsExist(optionsJs, optionsHtml, 'options.js');

console.log('DevDash validation passed.');
