import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
const base = resolve("vendor/usbipd-win");
const artifacts = [
  {
    name: "usbipd-win_5.3.0_x64.msi",
    url: "https://github.com/dorssel/usbipd-win/releases/download/v5.3.0/usbipd-win_5.3.0_x64.msi",
    sha256: "1c984914aec944de19b64eff232421439629699f8138e3ddc29301175bc6d938",
  },
  {
    name: "source-5.3.0.zip",
    url: "https://api.github.com/repos/dorssel/usbipd-win/zipball/v5.3.0",
    sha256: "6fdf3db4824f2df9a7c93f6031bf2bea96d8bd5f65777ca6a66e0a35a3f39fb7",
  },
];
const hash = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(base, { recursive: true });
await mkdir(".cache/usbipd", { recursive: true });
const manifest = {
  project: "dorssel/usbipd-win",
  version: "5.3.0",
  license: "GPL-3.0-only",
  artifacts,
  files: {},
};
for (const artifact of artifacts) {
  const cache = resolve(".cache/usbipd", artifact.name);
  let bytes;
  try {
    bytes = await readFile(cache);
  } catch {
    const response = await fetch(artifact.url);
    if (!response.ok) throw Error("Download failed: " + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (hash(bytes) !== artifact.sha256)
    throw Error("Hash mismatch: " + artifact.name);
  await writeFile(cache, bytes);
  await writeFile(resolve(base, artifact.name), bytes);
  manifest.files[artifact.name] = hash(bytes);
  if (artifact.name.endsWith(".zip")) {
    const entries = unzipSync(bytes);
    for (const [source, target] of [
      ["COPYING.md", "COPYING.md"],
      ["Drivers/README.md", "DRIVER-SOURCES.md"],
      ["Usbipd/WSL/README.md", "WSL-SOURCES.md"],
    ]) {
      const data = Object.entries(entries).find(
        ([name]) => name.split("/").slice(1).join("/") === source,
      )?.[1];
      if (!data) throw Error("Missing notice: " + source);
      await writeFile(resolve(base, target), data);
      manifest.files[target] = hash(data);
    }
  }
}
await writeFile(
  resolve(base, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Official usbipd-win MSI, matching source and license notices prepared. Nothing installed.",
);
