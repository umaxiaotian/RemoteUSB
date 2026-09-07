# Third-party software

RemoteUSB本体はMIT Licenseです。BSD-2-Clauseのusbip-win2公式インストーラーを別プロセスのツールとして同梱します。
依存バージョンは `pnpm-lock.yaml` を参照してください。配布時は同梱する各パッケージのLICENSEとElectronの `LICENSE` / `LICENSES.chromium.html` を保持してください。

| Software | License | Source |
| --- | --- | --- |
| Electron | MIT; Chromium等は同梱notice参照 | https://github.com/electron/electron |
| React / React DOM | MIT | https://github.com/facebook/react |
| Ant Design | MIT | https://github.com/ant-design/ant-design |
| i18next / react-i18next | MIT | https://github.com/i18next |
| fflate (build tooling) | MIT | https://github.com/101arrowz/fflate |
| Zod | MIT | https://github.com/colinhacks/zod |
| Lucide React | ISC | https://github.com/lucide-icons/lucide |
| Node.js | MIT and bundled third-party licenses | https://github.com/nodejs/node |
| pnpm | MIT | https://github.com/pnpm/pnpm |
| TypeScript | Apache-2.0 | https://github.com/microsoft/TypeScript |
| Vite / plugin-react | MIT | https://github.com/vitejs/vite |
| electron-vite | MIT | https://github.com/alex8088/electron-vite |
| electron-builder | MIT | https://github.com/electron-userland/electron-builder |
| ESLint / @eslint/js | MIT | https://github.com/eslint/eslint |
| typescript-eslint | MIT | https://github.com/typescript-eslint/typescript-eslint |
| Vitest | MIT | https://github.com/vitest-dev/vitest |
| React Testing Library / jest-dom | MIT | https://github.com/testing-library |
| Playwright | Apache-2.0 | https://github.com/microsoft/playwright |
| jsdom | MIT | https://github.com/jsdom/jsdom |
| cross-env | MIT | https://github.com/kentcdodds/cross-env |
| @types/node / @types/react / @types/react-dom | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |

## External backend

[vadimgrn/usbip-win2 0.9.8.0](https://github.com/vadimgrn/usbip-win2/releases/tag/v.0.9.8.0) はBSD-2-Clauseです。著作権表示、条件、免責条項を含む全文を `vendor/usbip-win2/LICENSE.txt` に保持します。未改変の公式インストーラーと来歴・ハッシュ・対応タグのソースを同梱します。ソースの公開開発用PFX/P12は省略しています。上流インストーラー内の第三者配布物はそのまま保持します。RemoteUSBはlibusbipをリンクせず、導入済みCLIを別プロセスで利用します。再配布時も著作権・ライセンス表示を保持してください。

テストfixtureは上流の出力形式に合わせて作成した架空のデバイスデータです。

## Distribution audit

`pnpm licenses list --json` で直接・推移依存のライセンス一覧を取得できます。リリース前にロックファイルと配布内容の対応を確認してください。
