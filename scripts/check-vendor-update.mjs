import {
  components,
  readLock,
  requestJson,
  selectAsset,
  stableRelease,
  versionFromTag,
} from "./vendor-lib.mjs";

const lock = await readLock();
for (const component of components) {
  const releases = await requestJson(
    `https://api.github.com/repos/${component.repository}/releases?per_page=100`,
  );
  const release = stableRelease(releases);
  selectAsset(release, component);
  const latest = versionFromTag(release.tag_name);
  const current = lock[component.name]?.version;
  console.log(
    current === latest
      ? `${component.name}: up to date (${latest})`
      : `${component.name}: ${current ?? "missing"} -> ${latest} available`,
  );
}
