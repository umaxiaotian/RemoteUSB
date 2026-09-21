# RemoteUSB website

RemoteUSB uses VitePress to publish its product website and guides at <https://remoteusb.ounets.com/>.

## Local development

```powershell
pnpm install
pnpm docs:dev
```

To check the production output:

```powershell
pnpm docs:build
pnpm docs:preview
```

Open the URL printed by VitePress. The site is served from `/` for the custom domain.

## Editing

Edit `docs/site/*.md` for landing-page metadata and `docs/.vitepress/theme/copy.ts` for the four languages of product copy. The shared landing-page component and responsive styles live in `docs/.vitepress/theme/`.

The four root README files supply the guides at `/guide.html`, `/ja/guide.html`, `/ko/guide.html`, and `/zh-CN/guide.html`. Edit public technical Markdown files in `docs/` for the references. Download buttons and navigation links point to [the latest download on SourceForge](https://sourceforge.net/projects/remoteusb/files/latest/download), which starts the download when clicked.
`scripts/prepare-docs.mjs` generates the site content, adjusts links and copies branding and screenshots before development or build. Restart `docs:dev` after editing the source documents to regenerate pages.

Do not edit or commit `docs/.vitepress/content/`, `cache/` or `dist/`. Configuration lives in `docs/.vitepress/config.mts`. The public technical references are limited to Architecture and documentation-site maintenance; implementation-specific USB/IP backend notes remain repository-internal.

## GitHub Pages setup

1. Push these changes to GitHub.
2. In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Run the **Documentation** workflow on the default branch, or push a new commit to that branch.

The workflow builds on pushes and pull requests. Only the default branch can deploy; pull requests never publish. No personal access token is needed. The environment URL in the deployment job links to the published site.

If you rename the repository or configure a custom domain, update `base`, the social image URL, favicon path and documentation links accordingly.

See the [VitePress deployment guide](https://vitepress.dev/guide/deploy#github-pages) for the hosting requirements.
