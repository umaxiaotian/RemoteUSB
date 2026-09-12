import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { env } from "node:process";

export const root = resolve("vendor");
export const lockPath = resolve("vendor-lock.json");

export const components = [
  {
    name: "usbip-win2",
    repository: "vadimgrn/usbip-win2",
    directory: "usbip-win2",
    matches: (asset) => /usbip.*x64\.(exe|zip)$/i.test(asset.name),
  },
  {
    name: "usbipd-win",
    repository: "dorssel/usbipd-win",
    directory: "usbipd-win",
    matches: (asset) => /usbipd.*x64\.msi$/i.test(asset.name),
  },
];

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function stableRelease(releases) {
  const stable = releases.filter(
    (release) => !release.draft && !release.prerelease,
  );
  if (!stable.length) throw new Error("No stable GitHub release is available.");
  return stable.sort(
    (left, right) =>
      Date.parse(right.published_at ?? right.created_at ?? 0) -
      Date.parse(left.published_at ?? left.created_at ?? 0),
  )[0];
}

export function selectAsset(release, component) {
  const candidates = release.assets.filter(component.matches);
  if (candidates.length !== 1) {
    throw new Error(
      `${component.name}: expected exactly one x64 release asset, found ${candidates.length}`,
    );
  }
  return candidates[0];
}

export async function readLock() {
  return JSON.parse(await readFile(lockPath, "utf8"));
}

export async function requestJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RemoteUSB-vendor-updater",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const response = await fetch(url, {
    headers,
    signal: globalThis.AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`GitHub request failed (${response.status}): ${url}`);
  return response.json();
}

export async function download(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "RemoteUSB-vendor-updater" },
    redirect: "follow",
    signal: globalThis.AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export function versionFromTag(tag) {
  return tag.replace(/^v\.?/, "");
}

export function assetPath(component, assetName) {
  return join(root, component.directory, assetName);
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function remove(path) {
  await rm(path, { recursive: true, force: true });
}
