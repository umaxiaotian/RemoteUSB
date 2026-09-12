import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { pid } from "node:process";
import { join, resolve } from "node:path";
import {
  components,
  download,
  remove,
  requestJson,
  root,
  selectAsset,
  sha256,
  stableRelease,
  versionFromTag,
  writeJson,
} from "./vendor-lib.mjs";

const staging = resolve(".tmp/vendor-update");
await remove(staging);
await mkdir(staging, { recursive: true });

try {
  const lock = {};
  for (const component of components) {
    const releases = await requestJson(
      `https://api.github.com/repos/${component.repository}/releases?per_page=100`,
    );
    const release = stableRelease(releases);
    const asset = selectAsset(release, component);
    const bytes = await download(asset.browser_download_url);
    const componentDirectory = join(staging, component.directory);
    await mkdir(componentDirectory, { recursive: true });
    await writeFile(join(componentDirectory, asset.name), bytes);
    lock[component.name] = {
      repository: component.repository,
      version: versionFromTag(release.tag_name),
      tag: release.tag_name,
      asset: asset.name,
      downloadUrl: asset.browser_download_url,
      sha256: sha256(bytes),
      updatedAt: new Date().toISOString(),
    };
  }
  await writeJson(join(staging, "vendor-lock.json"), lock);
  const replacements = [];
  try {
    for (const component of components) {
      const entry = lock[component.name];
      const source = join(staging, component.directory, entry.asset);
      const target = resolve(root, component.directory, entry.asset);
      const backup = `${target}.backup-${pid}`;
      await mkdir(resolve(root, component.directory), { recursive: true });
      await rm(backup, { force: true });
      try {
        await rename(target, backup);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await rename(source, target);
      replacements.push({ target, backup });
    }
  } catch (error) {
    for (const { target, backup } of replacements) {
      await rm(target, { force: true });
      try {
        await rename(backup, target);
      } catch (restoreError) {
        if (restoreError.code !== "ENOENT") throw restoreError;
      }
    }
    throw error;
  }
  for (const { backup } of replacements) {
    await rm(backup, { force: true });
  }
  await writeFile(
    resolve("vendor-lock.json"),
    await readFile(join(staging, "vendor-lock.json")),
  );
  console.log(
    "Vendor components updated from the latest stable GitHub releases.",
  );
} finally {
  await remove(staging);
}
