import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "docs/.vitepress/content");
const repository = "https://github.com/umaxiaotian/RemoteUSB/blob/main/";
const pages = new Map([
  ["README.md", "index.md"],
  ["README.ja.md", "ja/index.md"],
  ["README.ko.md", "ko/index.md"],
  ["README.zh-CN.md", "zh-CN/index.md"],
  ["docs/architecture.md", "reference/architecture.md"],
  ["docs/usbip-backend.md", "reference/usbip-backend.md"],
  ["docs/usb-server.md", "reference/usb-server.md"],
  ["docs/documentation.md", "reference/documentation.md"],
]);

// Keep README files and technical notes as the only editable content sources.
for (const [source, target] of pages) {
  let content = await readFile(path.join(root, source), "utf8");
  content = content.replace(
    /(!?\[[^\]]*\]\()([^\s)]+)(\))/g,
    (match, before, href, after) => {
      if (/^(?:[a-z]+:|#|\/)/i.test(href)) return match;
      const [pathname, hash] = href.split("#");
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(source), pathname),
      );
      const suffix = hash ? `#${hash}` : "";
      const page = pages.get(resolved);
      if (page)
        return `${before}/${page.replace(/\.md$/, ".html")}${suffix}${after}`;
      if (
        resolved.startsWith("docs/screenshots/") ||
        resolved === "docs/social-preview.png"
      ) {
        return `${before}/${resolved.slice(5)}${suffix}${after}`;
      }
      return `${before}${repository}${resolved}${suffix}${after}`;
    },
  );
  await mkdir(path.dirname(path.join(destination, target)), {
    recursive: true,
  });
  await writeFile(path.join(destination, target), content);
}
await mkdir(path.join(destination, "public"), { recursive: true });
await cp(
  path.join(root, "docs/screenshots"),
  path.join(destination, "public/screenshots"),
  { recursive: true },
);
await cp(
  path.join(root, "docs/social-preview.png"),
  path.join(destination, "public/social-preview.png"),
);
await cp(
  path.join(root, "build/icon.png"),
  path.join(destination, "public/icon.png"),
);
console.log(`Prepared ${pages.size} documentation pages.`);
