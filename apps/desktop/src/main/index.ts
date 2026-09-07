import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  shell,
  Tray,
  screen,
  dialog,
} from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { release } from "node:os";
import { mkdirSync } from "node:fs";
import {
  IPC,
  requestSchema,
  responseSchema,
  type Response,
} from "../../../../packages/shared/ipc";
import { mapError, UsbBackendError } from "../../../../packages/core/errors";
import {
  demoServers,
  MockUsbBackend,
} from "../../../../packages/usb-backend/mock-backend";
import { UsbipWinBackend } from "../../../../packages/usb-backend/usbip-win-backend";
import { UsbService } from "./service";
import { Store } from "./store";
import { Logger } from "./logger";
import {
  resolveLanguage,
  translations,
} from "../../../../packages/shared/i18n";

let window: BrowserWindow | undefined,
  tray: Tray | undefined,
  service: UsbService,
  logger: Logger;
let quitting = false,
  timer: ReturnType<typeof setInterval> | undefined,
  ticking = false;
app.setName("RemoteUSB");
if (process.platform === "win32") app.setAppUserModelId("io.remoteusb.desktop");
const iconPath = join(
  app.isPackaged
    ? join(process.resourcesPath, "branding")
    : join(app.getAppPath(), "build"),
  "icon.ico",
);
const mock =
  process.argv.includes("--mock") || process.env.REMOTEUSB_BACKEND === "mock";
if (process.env.REMOTEUSB_DATA_DIR)
  app.setPath("userData", process.env.REMOTEUSB_DATA_DIR);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    window?.show();
    window?.focus();
  });
  void app
    .whenReady()
    .then(start)
    .catch((error) => {
      dialog.showErrorBox("RemoteUSB could not start", String(error));
      app.quit();
    });
}
/** 初期化からセキュリティ境界・ネイティブ統合を構築する。 */
async function start() {
  const dataDir = app.getPath("userData");
  mkdirSync(dataDir, { recursive: true });
  const store = new Store(join(dataDir, mock ? "demo.json" : "settings.json"));
  if (
    mock &&
    !store.data.settings.welcomeComplete &&
    !store.data.servers.length
  )
    store.data.servers = structuredClone(demoServers);
  logger = new Logger(
    join(dataDir, "remoteusb.log"),
    () => service.store.data.settings.debugLogging,
  );
  service = new UsbService(
    store,
    mock
      ? new MockUsbBackend(() => store.data.settings)
      : new UsbipWinBackend(
          () => store.data.settings,
          undefined,
          (text) => logger.write("DEBUG", text),
        ),
    mock ? "mock" : "usbip",
    app.getVersion(),
    changed,
    notify,
  );
  nativeTheme.themeSource = store.data.settings.theme;
  const bounds = store.data.window;
  const visible = screen
    .getAllDisplays()
    .some(
      (d) =>
        (bounds.x ?? d.workArea.x) < d.workArea.x + d.workArea.width &&
        (bounds.y ?? d.workArea.y) < d.workArea.y + d.workArea.height &&
        (bounds.x ?? d.workArea.x) + bounds.width > d.workArea.x &&
        (bounds.y ?? d.workArea.y) + bounds.height > d.workArea.y,
    );
  const mica =
    process.platform === "win32" && Number(release().split(".")[2]) >= 22621;
  window = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(visible ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "RemoteUSB",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#00000000",
      symbolColor: nativeTheme.shouldUseDarkColors ? "#ffffff" : "#202020",
      height: 40,
    },
    backgroundMaterial: mica ? "mica" : "none",
    backgroundColor: mica
      ? "#00000000"
      : nativeTheme.shouldUseDarkColors
        ? "#202020"
        : "#f3f3f3",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  window.setIcon(iconPath);
  if (process.platform === "win32")
    window.setAppDetails({
      appId: "io.remoteusb.desktop",
      appIconPath: iconPath,
      appIconIndex: 0,
      relaunchDisplayName: "RemoteUSB",
    });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  const rendererFile = join(__dirname, "../renderer/index.html");
  const devUrl = !app.isPackaged
    ? process.env.ELECTRON_RENDERER_URL
    : undefined;
  const trustedUrl = devUrl ?? pathToFileURL(rendererFile).href;
  ipcMain.handle(
    IPC.request,
    async (event, input: unknown): Promise<Response> => {
      try {
        if (
          event.sender !== window?.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          (event.senderFrame.url !== trustedUrl &&
            event.senderFrame.url !== `${trustedUrl}/`)
        )
          throw new Error("Untrusted IPC sender");
        const request = requestSchema.parse(input);
        let deviceCount: number | undefined;
        switch (request.action) {
          case "snapshot":
            break;
          case "refresh":
            service.backendStatus = await service.backend.checkAvailability();
            await service.refresh();
            break;
          case "saveServer": {
            await service.refresh();
            service.assertServerEditable(request.server.id);
            service.store.data.servers = [
              ...service.store.data.servers.filter(
                (s) => s.id !== request.server.id,
              ),
              request.server,
            ];
            service.store.save();
            await service.refresh();
            break;
          }
          case "removeServer":
            await service.refresh();
            service.assertServerEditable(request.id);
            service.store.data.servers = service.store.data.servers.filter(
              (s) => s.id !== request.id,
            );
            service.devices = service.devices.filter(
              (d) => d.serverId !== request.id,
            );
            service.store.data.reconnect = service.store.data.reconnect.filter(
              (p) => p.device.serverId !== request.id,
            );
            service.store.save();
            break;
          case "testServer":
            deviceCount = (await service.backend.listDevices(request.server))
              .length;
            break;
          case "connect":
            await service.connect(request.id);
            break;
          case "disconnect":
            await service.disconnect(request.id);
            break;
          case "disconnectAll":
            await service.disconnectAll();
            break;
          case "reconnect":
            service.setReconnect(request.id, request.enabled);
            break;
          case "settings": {
            if (
              request.settings.executablePath !==
                service.store.data.settings.executablePath &&
              (service.connections.length || service.isBusy())
            )
              throw new UsbBackendError(
                "DEVICE_BUSY",
                "Disconnect devices before changing backend",
              );
            if (
              app.isPackaged &&
              process.platform === "win32" &&
              request.settings.startAtLogin !==
                service.store.data.settings.startAtLogin
            )
              app.setLoginItemSettings({
                openAtLogin: request.settings.startAtLogin,
              });
            service.store.data.settings = request.settings;
            service.store.save();
            nativeTheme.themeSource = request.settings.theme;
            service.backendStatus = await service.backend.checkAvailability();
            break;
          }
          case "demo": {
            if (service.connections.length || service.isBusy())
              throw new UsbBackendError("DEVICE_BUSY", "Disconnect first");
            const demoStore = new Store(join(dataDir, "demo.json"));
            if (!demoStore.data.servers.length)
              demoStore.data.servers = structuredClone(demoServers);
            demoStore.data.settings.welcomeComplete = true;
            demoStore.save();
            service = new UsbService(
              demoStore,
              new MockUsbBackend(() => demoStore.data.settings),
              "mock",
              app.getVersion(),
              changed,
              notify,
            );
            await service.initialize();
            break;
          }
          case "openLink": {
            if (request.target === "licenses")
              await dialog.showMessageBox(window, {
                title: localize("licenses"),
                message: "RemoteUSB — MIT",
                detail:
                  "Ant Design, i18next, React, Electron, Zod: MIT\nLucide: ISC\nusbip-win2 0.9.8.0: BSD-2-Clause\n" +
                  localize("sourceCode") +
                  ": " +
                  vendorPath(),
              });
            else if (request.target === "guide")
              await dialog.showMessageBox(window, {
                title: localize("Setup Guide"),
                message: localize("setupHint"),
                detail:
                  localize("driverNotice") +
                  "\n\n" +
                  join(vendorPath(), "README.md"),
              });
            else if (
              request.target === "tools" ||
              request.target === "sources"
            ) {
              const error = await shell.openPath(vendorPath());
              if (error) throw new Error(error);
            } else
              await shell.openExternal(
                "https://github.com/umaxiaotian/RemoteUSB",
              );
            break;
          }
        }
        if (!["snapshot", "testServer", "openLink"].includes(request.action))
          changed();
        return responseSchema.parse({
          ok: true,
          snapshot: service.snapshot(),
          deviceCount,
        });
      } catch (error) {
        const mapped = mapError(error);
        logger.write("ERROR", mapped.details);
        return { ok: false, error: mapped };
      }
    },
  );
  window.once("ready-to-show", () => window?.show());
  window.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      if (service.store.data.settings.minimizeToTray) window?.hide();
      else void exit();
    }
  });
  window.on("resize", saveBounds);
  window.on("move", saveBounds);
  nativeTheme.on("updated", () =>
    window?.setTitleBarOverlay({
      symbolColor: nativeTheme.shouldUseDarkColors ? "#ffffff" : "#202020",
    }),
  );
  tray = new Tray(
    nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 }),
  );
  tray.setToolTip("RemoteUSB");
  tray.on("double-click", () => window?.show());
  if (devUrl) await window.loadURL(devUrl);
  else await window.loadFile(rendererFile);
  await service.initialize();
  timer = setInterval(() => {
    if (ticking || quitting) return;
    ticking = true;
    void service
      .tick()
      .catch((error) => logger.write("WARN", String(error)))
      .finally(() => {
        ticking = false;
      });
  }, 5000);
}
function saveBounds() {
  if (window && !window.isMaximized() && !window.isMinimized()) {
    service.store.data.window = window.getBounds();
    service.store.save();
  }
}
function vendorPath() {
  return app.isPackaged
    ? join(process.resourcesPath, "vendor", "usbip-win2")
    : join(app.getAppPath(), "vendor", "usbip-win2");
}
function localize(key: string, name?: string) {
  return translations.t(key, {
    lng: resolveLanguage(
      service.store.data.settings.language === "system"
        ? app.getLocale()
        : service.store.data.settings.language,
    ),
    name,
  });
}
function notify(message: string, name?: string) {
  const body = localize(message, name);
  logger.write("INFO", body);
  if (Notification.isSupported())
    new Notification({ title: "RemoteUSB", body, icon: iconPath }).show();
}
function changed() {
  if (window && !window.isDestroyed()) window.webContents.send(IPC.changed);
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: "RemoteUSB", enabled: false },
      { label: localize("Open RemoteUSB"), click: () => window?.show() },
      { type: "separator" },
      ...service.connections.map((c) => ({ label: c.name, enabled: false })),
      {
        label: localize("Disconnect all"),
        enabled: service.connections.length > 0,
        click: () => {
          void service
            .disconnectAll()
            .catch((error) => notify(mapError(error).code));
        },
      },
      { type: "separator" },
      {
        label: localize("Exit"),
        click: () => {
          void exit();
        },
      },
    ]),
  );
}
async function exit() {
  if (quitting) return;
  if (service.isBusy()) {
    notify("waitOperation");
    return;
  }
  try {
    await service.disconnectAll();
    quitting = true;
    if (timer) clearInterval(timer);
    app.quit();
  } catch (error) {
    window?.show();
    await dialog.showMessageBox({
      type: "error",
      message: localize("exitFailed"),
      detail: mapError(error).details,
    });
  }
}
app.on("before-quit", (event) => {
  if (!quitting && service) {
    event.preventDefault();
    void exit();
  }
});
app.on("window-all-closed", () => {
  if (quitting) app.quit();
});
