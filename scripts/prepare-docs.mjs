import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "docs/.vitepress/content");
const repository = "https://github.com/umaxiaotian/RemoteUSB/blob/main/";
const pages = new Map([
  ["README.md", "guide.md"],
  ["README.ja.md", "ja/guide.md"],
  ["README.ko.md", "ko/guide.md"],
  ["README.zh-CN.md", "zh-CN/guide.md"],
  ["docs/architecture.md", "reference/architecture.md"],
  ["docs/documentation.md", "reference/documentation.md"],
]);

// Landing pages have their own sources; README files remain the guides.
for (const locale of ["en", "ja", "ko", "zh-CN"]) {
  const target = path.join(destination, locale === "en" ? "" : locale, "index.md");
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, "docs/site", `${locale}.md`), target);
}
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
await cp(
  path.join(root, "docs/public/google88e0fcc7977f473f.html"),
  path.join(destination, "public/google88e0fcc7977f473f.html"),
);
console.log(`Prepared 4 landing pages and ${pages.size} guide/reference pages.`);
