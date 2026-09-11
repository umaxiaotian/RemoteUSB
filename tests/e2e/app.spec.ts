import { test, expect, _electron as electron } from "@playwright/test";

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Electron: Ant Design CRUD, connection, persistence, languages and scaling", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "remoteusb-e2e-"));

  writeFileSync(
    join(dataDir, "demo.json"),
    JSON.stringify({ settings: { language: "en" } }),
  );

  const env: Record<string, string> = {
    REMOTEUSB_DATA_DIR: dataDir,
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== "ELECTRON_RUN_AS_NODE") {
      env[key] = value;
    }
  }

  const application = await electron.launch({
    args: [".", "--mock"],
    env,
  });

  try {
    const page = await application.firstWindow();

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page
      .getByRole("button", { name: "Get Started", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("article", { name: "USB Serial CH340", exact: true }),
    ).toBeVisible();

    expect(
      await page.evaluate(() => typeof Reflect.get(window, "require")),
    ).toBe("undefined");

    expect(
      await page.evaluate(() => typeof Reflect.get(window, "process")),
    ).toBe("undefined");

    await page
      .getByRole("menuitem", { name: "Shared Devices", exact: true })
      .click();
    const local = page.getByRole("article", {
      name: "USB Serial CH340",
      exact: true,
    });
    await expect(local.getByRole("status")).toHaveText("Not shared");
    await local.getByRole("button", { name: "Share", exact: true }).click();
    const sharingDialog = page.getByRole("dialog");
    await expect(sharingDialog).toBeVisible();
    await expect(
      page.locator(".ant-modal-wrap.ant-modal-centered:visible"),
    ).toBeVisible();
    await sharingDialog
      .getByRole("button", { name: "Share", exact: true })
      .click();
    await expect(local.getByRole("status")).toHaveText("Shared");
    await local
      .getByRole("button", { name: "Stop Sharing", exact: true })
      .click();
    await sharingDialog
      .getByRole("button", { name: "Stop Sharing", exact: true })
      .click();
    await expect(local.getByRole("status")).toHaveText("Not shared");
    await page.getByRole("menuitem", { name: "Servers", exact: true }).click();
    await page.getByRole("button", { name: "Add Server", exact: true }).click();

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Name", { exact: true }).fill("LAB-PC");
    await dialog.getByLabel("Hostname / IP address").fill("lab.local");

    await dialog.getByRole("button", { name: "Test Connection" }).click();

    await expect(dialog.getByRole("status")).toContainText(
      "Connection successful",
    );

    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole("menuitem", { name: "Devices", exact: true }).click();

    const group = page.locator("section").filter({
      has: page.getByRole("heading", { name: "LAB-PC", exact: true }),
    });

    const card = group.getByRole("article", {
      name: "USB Serial CH340",
      exact: true,
    });

    await card.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(card.getByRole("status")).toHaveText("Connecting…");

    await expect(
      card.getByRole("button", { name: "Disconnect", exact: true }),
    ).toBeEnabled();

    const autoReconnect = card.getByRole("switch", {
      name: "Auto reconnect",
      exact: true,
    });
    await expect(autoReconnect).not.toBeChecked();
    // The controlled switch updates after main-process IPC, not during the click.
    // check() checks immediately; the assertion below retries until IPC is reflected.
    await autoReconnect.click();
    await expect(autoReconnect).toBeChecked();
    await card.getByRole("button", { name: "Disconnect", exact: true }).click();

    await expect(card.getByRole("status")).toHaveText("Available");

    await page.locator("main").evaluate((element) => {
      element.scrollTop = 0;
    });

    await page.screenshot({
      path: "docs/screenshots/devices-light.png",
    });

    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await page.getByLabel("App theme").click();
    await page.getByRole("option", { name: "Dark", exact: true }).click();
    await page.getByRole("button", { name: "Save settings" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("menuitem", { name: "Devices", exact: true }).click();

    await page.locator("main").evaluate((element) => {
      element.scrollTop = 0;
    });

    await page.screenshot({
      path: "docs/screenshots/devices-dark.png",
    });

    for (const factor of [1.25, 1.5, 2]) {
      await application.evaluate(({ BrowserWindow }, zoom) => {
        const w = BrowserWindow.getAllWindows()[0];
        w.setSize(900, 600);
        w.webContents.setZoomFactor(zoom);
      }, factor);

      await expect(
        page.getByRole("heading", { name: "Devices", exact: true }),
      ).toBeVisible();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }

    await application.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.setSize(1120, 760);
      w.webContents.setZoomFactor(1);
    });

    await page.getByRole("menuitem", { name: "Servers", exact: true }).click();
    await page.getByRole("button", { name: "Edit LAB-PC" }).click();

    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: true })
      .fill("LAB-RENAMED");

    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(
      page.getByRole("article", { name: "LAB-RENAMED", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove LAB-RENAMED" }).click();

    await page.getByRole("button", { name: "OK", exact: true }).click();

    await expect(
      page.getByRole("article", { name: "LAB-RENAMED", exact: true }),
    ).not.toBeVisible();

    let settingsMenu = "Settings";
    let languageLabel = "Language";
    let saveLabel = "Save settings";

    for (const locale of [
      {
        code: "ja",
        name: "日本語",
        settings: "設定",
        language: "言語",
        save: "設定を保存",
        devices: "デバイス",
      },
      {
        code: "ko",
        name: "한국어",
        settings: "설정",
        language: "언어",
        save: "설정 저장",
        devices: "장치",
      },
      {
        code: "zh-CN",
        name: "简体中文",
        settings: "设置",
        language: "语言",
        save: "保存设置",
        devices: "设备",
      },
      {
        code: "en",
        name: "English",
        settings: "Settings",
        language: "Language",
        save: "Save settings",
        devices: "Devices",
      },
    ]) {
      await page
        .getByRole("menuitem", { name: settingsMenu, exact: true })
        .click();

      await page.getByLabel(languageLabel, { exact: true }).click();

      await page
        .getByRole("option", { name: locale.name, exact: true })
        .click();

      await page.getByRole("button", { name: saveLabel, exact: true }).click();

      await expect(
        page.getByRole("heading", {
          name: locale.settings,
          exact: true,
        }),
      ).toBeVisible();

      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);

      await page
        .getByRole("menuitem", {
          name: locale.devices,
          exact: true,
        })
        .click();

      await expect(
        page.getByRole("heading", {
          name: locale.devices,
          exact: true,
        }),
      ).toBeVisible();

      await page.locator("main").evaluate((element) => {
        element.scrollTop = 0;
      });

      await page.mouse.move(800, 100);

      await page.screenshot({
        path: `docs/screenshots/devices-${locale.code}.png`,
      });

      settingsMenu = locale.settings;
      languageLabel = locale.language;
      saveLabel = locale.save;
    }

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: "Devices",
        exact: true,
      }),
    ).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    expect(errors).toEqual([]);
  } finally {
    await application.close();

    rmSync(dataDir, {
      recursive: true,
      force: true,
    });
  }
});
