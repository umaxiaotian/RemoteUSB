import { defineConfig } from "vitepress";

const repository = "https://github.com/umaxiaotian/RemoteUSB";
const language = (
  label: string,
  lang: string,
  prefix: string,
  guide: string,
  download: string,
  outline: string,
) => ({
  label,
  lang,
  link: prefix,
  themeConfig: {
    nav: [
      { text: guide, link: prefix },
      { text: download, link: repository + "/releases/latest" },
    ],
    sidebar: [
      { text: guide, link: prefix },
      {
        text: "Technical reference",
        items: [
          { text: "Architecture (日本語)", link: "/reference/architecture" },
          { text: "USB/IP client (日本語)", link: "/reference/usbip-backend" },
          { text: "USB/IP server (English)", link: "/reference/usb-server" },
          {
            text: "Documentation site (English)",
            link: "/reference/documentation",
          },
        ],
      },
    ],
    outline: { label: outline, level: [2, 3] as [number, number] },
  },
});

export default defineConfig({
  title: "RemoteUSB",
  description: "USB/IP client & server for Windows — documentation",
  base: "/RemoteUSB/",
  srcDir: ".vitepress/content",
  cleanUrls: false,
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/RemoteUSB/icon.png" }],
    [
      "meta",
      {
        property: "og:image",
        content: "https://umaxiaotian.github.io/RemoteUSB/social-preview.png",
      },
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  locales: {
    root: language("English", "en", "/", "Guide", "Download", "On this page"),
    ja: language("日本語", "ja", "/ja/", "ガイド", "ダウンロード", "目次"),
    ko: language("한국어", "ko", "/ko/", "가이드", "다운로드", "목차"),
    "zh-CN": language(
      "简体中文",
      "zh-CN",
      "/zh-CN/",
      "指南",
      "下载",
      "本页目录",
    ),
  },
  themeConfig: {
    logo: "/icon.png",
    // References retain their source language; switch to each locale's guide.
    i18nRouting: false,
    socialLinks: [{ icon: "github", link: repository }],
    search: { provider: "local" },
    footer: {
      message: "Released under the MIT License.",
      copyright: "YUMA OBATA",
    },
  },
});
