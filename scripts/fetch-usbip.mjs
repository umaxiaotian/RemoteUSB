import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { unzipSync, zipSync } from 'fflate';
const base = resolve('vendor/usbip-win2');
const artifacts = [
  { name: 'USBip-0.9.8.0-x64.exe', url: 'https://github.com/vadimgrn/usbip-win2/releases/download/v.0.9.8.0/USBip-0.9.8.0-x64.exe', sha256: '81f426741f7ee2ed991febe24a22daca8400b6ae2f171054e3fb404897e15d39' },
  { name: 'source-original.zip', url: 'https://api.github.com/repos/vadimgrn/usbip-win2/zipball/v.0.9.8.0', sha256: 'b3fc7f567e1e1fac2d8776d4f93f4aaccbce04889fd3da9cc2d3131e72942d8c' }
];
const hash = b => createHash('sha256').update(b).digest('hex');
await mkdir(base, { recursive: true });
await mkdir('.cache/win2', { recursive: true });
const manifest = { project: 'vadimgrn/usbip-win2', version: '0.9.8.0', license: 'BSD-2-Clause', artifacts, files: {} };
for (const [i, a] of artifacts.entries()) {
  const cache = resolve('.cache/win2', a.name);
  let bytes;
  try { bytes = await readFile(cache); } catch {
    const response = await fetch(a.url);
    if (!response.ok) throw Error('Download failed: ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (hash(bytes) !== a.sha256) throw Error('Download hash mismatch: ' + a.name);
  await writeFile(cache, bytes);
  if (!i) { await writeFile(resolve(base, a.name), bytes); manifest.files[a.name] = hash(bytes); }
  else {
    const entries = unzipSync(bytes), source = {};
    for (const [name, data] of Object.entries(entries)) {
      if (name.includes('\\') || name.startsWith('/') || name.split('/').includes('..')) throw Error('Unsafe archive');
      if (!/\.(pfx|p12)$/i.test(name)) source[name] = [data, { mtime: new Date('2026-01-01T00:00:00Z') }];
    }
    const archive = zipSync(source, { level: 9 });
    await writeFile(resolve(base, 'source-0.9.8.0.zip'), archive);
    manifest.files['source-0.9.8.0.zip'] = hash(archive);
    const license = Object.entries(entries).find(([n]) => /^[^/]+\/LICENSE.txt$/.test(n))?.[1];
    if (!license) throw Error('Missing license');
    await writeFile(resolve(base, 'LICENSE.txt'), license); manifest.files['LICENSE.txt'] = hash(license);
  }
}
await writeFile(resolve(base, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Pinned official usbip-win2 installer, source and license prepared. Nothing was installed.');
