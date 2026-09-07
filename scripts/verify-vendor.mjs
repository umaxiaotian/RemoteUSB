import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { unzipSync } from 'fflate';
const base = resolve('vendor/usbip-win2');
const manifest = JSON.parse(await readFile(resolve(base, 'manifest.json'), 'utf8'));
for (const required of ['USBip-0.9.8.0-x64.exe', 'source-0.9.8.0.zip', 'LICENSE.txt']) if (!manifest.files[required]) throw Error('Missing vendor entry: ' + required);
for (const [name, expected] of Object.entries(manifest.files)) {
  const path = resolve(base, name);
  if (!path.startsWith(base + sep)) throw Error('Unsafe vendor path');
  if (createHash('sha256').update(await readFile(path)).digest('hex') !== expected) throw Error('Vendor hash mismatch: ' + name);
}
if (Object.keys(unzipSync(await readFile(resolve(base, 'source-0.9.8.0.zip')))).some(n => /\.(pfx|p12)$/i.test(n))) throw Error('Source contains signing key');
console.log('usbip-win2 installer, source and license hashes verified.');
