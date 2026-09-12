# Documentation site

RemoteUSB uses VitePress to publish documentation at <https://umaxiaotian.github.io/RemoteUSB/>.

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

Open the URL printed by VitePress, including the `/RemoteUSB/` path.

## Editing

Edit the four root README files and the technical Markdown files in `docs/`.
`scripts/prepare-docs.mjs` generates the site content, adjusts links and copies branding and screenshots before development or build. Restart `docs:dev` after editing the source documents to regenerate pages.

Do not edit or commit `docs/.vitepress/content/`, `cache/` or `dist/`. Configuration lives in `docs/.vitepress/config.mts`. The four guides use their existing translations; technical references retain their original language, indicated in the sidebar.

## GitHub Pages setup

1. Push these changes to GitHub.
2. In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Run the **Documentation** workflow on the default branch, or push a new commit to that branch.

The workflow builds on pushes and pull requests. Only the default branch can deploy; pull requests never publish. No personal access token is needed. The environment URL in the deployment job links to the published site.

If you rename the repository or configure a custom domain, update `base`, the social image URL, favicon path and documentation links accordingly.

See the [VitePress deployment guide](https://vitepress.dev/guide/deploy#github-pages) for the hosting requirements.
