import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { unzipSync } from "fflate";

const vendorLock = JSON.parse(
  await readFile(resolve("vendor-lock.json"), "utf8"),
);

for (const [component, entry] of Object.entries(vendorLock)) {
  if (!/^[\w.-]+$/.test(component) || !/^[\w.-]+$/.test(entry.asset))
    throw Error("Unsafe vendor lock entry");
  const assetPath = resolve("vendor", component, entry.asset);
  if (!(await verifyHash(assetPath, entry.sha256)))
    throw Error(`Vendor lock hash mismatch: ${component}/${entry.asset}`);
}

/**
 * Calculates a SHA-256 hash.
 *
 * @param {Buffer|string} data Data to hash.
 * @returns {string} SHA-256 hash.
 */
function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Verifies a file hash.
 *
 * For text files, LF and CRLF line endings are treated as equivalent.
 * Binary files must match the expected hash exactly.
 *
 * @param {string} path File path.
 * @param {string} expected Expected SHA-256 hash.
 * @param {boolean} text Whether the file is a text file.
 * @returns {Promise<boolean>} True when the hash matches.
 */
async function verifyHash(path, expected, text = false) {
  const data = await readFile(path);

  if (sha256(data) === expected) {
    return true;
  }

  if (!text) {
    return false;
  }

  const content = data.toString("utf8");

  const lfContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (sha256(Buffer.from(lfContent, "utf8")) === expected) {
    return true;
  }

  const crlfContent = lfContent.replace(/\n/g, "\r\n");

  return sha256(Buffer.from(crlfContent, "utf8")) === expected;
}

const base = resolve("vendor/usbip-win2");

const manifest = JSON.parse(
  await readFile(resolve(base, "manifest.json"), "utf8"),
);

const clientRequiredFiles = [
  "USBip-0.9.8.0-x64.exe",
  "source-0.9.8.0.zip",
  "LICENSE.txt",
];

const clientTextFiles = new Set(["LICENSE.txt"]);

for (const required of clientRequiredFiles) {
  if (!manifest.files[required]) {
    throw Error("Missing vendor entry: " + required);
  }
}

for (const [name, expected] of Object.entries(manifest.files)) {
  const path = resolve(base, name);

  if (!path.startsWith(base + sep)) {
    throw Error("Unsafe vendor path");
  }

  if (!(await verifyHash(path, expected, clientTextFiles.has(name)))) {
    throw Error("Vendor hash mismatch: " + name);
  }
}

if (
  Object.keys(
    unzipSync(await readFile(resolve(base, "source-0.9.8.0.zip"))),
  ).some((name) => /\.(pfx|p12)$/i.test(name))
) {
  throw Error("Source contains signing key");
}

console.log("usbip-win2 installer, source and license hashes verified.");

const serverBase = resolve("vendor/usbipd-win");

const serverManifest = JSON.parse(
  await readFile(resolve(serverBase, "manifest.json"), "utf8"),
);

const serverRequiredFiles = [
  "usbipd-win_5.3.0_x64.msi",
  "source-5.3.0.zip",
  "COPYING.md",
  "DRIVER-SOURCES.md",
  "WSL-SOURCES.md",
];

const serverTextFiles = new Set([
  "COPYING.md",
  "DRIVER-SOURCES.md",
  "WSL-SOURCES.md",
]);

for (const required of serverRequiredFiles) {
  if (!serverManifest.files[required]) {
    throw Error("Missing server vendor entry: " + required);
  }
}

for (const [name, expected] of Object.entries(serverManifest.files)) {
  const path = resolve(serverBase, name);

  if (!path.startsWith(serverBase + sep)) {
    throw Error("Unsafe server vendor path");
  }

  if (!(await verifyHash(path, expected, serverTextFiles.has(name)))) {
    throw Error("Server vendor hash mismatch: " + name);
  }
}

console.log("usbipd-win MSI, source and license hashes verified.");