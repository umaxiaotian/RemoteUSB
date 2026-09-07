import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../apps/desktop/src/main/store";
import { UsbService, reconnectDelay } from "../apps/desktop/src/main/service";
import {
  demoServers,
  MockUsbBackend,
} from "../packages/usb-backend/mock-backend";
const directories: string[] = [];
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "remoteusb-test-"));
  directories.push(dir);
  const store = new Store(join(dir, "settings.json"));
  store.data.servers = structuredClone(demoServers);
  const backend = new MockUsbBackend(() => store.data.settings, 0);
  const notify = vi.fn();
  const service = new UsbService(
    store,
    backend,
    "mock",
    "0.1.0",
    vi.fn(),
    notify,
  );
  return { service, store, backend, notify, dir };
}
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
describe("mock integration", () => {
  it("adds a server, lists devices, connects, persists preferences and disconnects", async () => {
    const { service, store, dir } = setup();
    await service.initialize();
    expect(service.devices).toHaveLength(6);
    const id = service.devices[0].id;
    const task = service.connect(id);
    expect(service.devices[0].state).toBe("Connecting");
    await expect(service.connect(id)).rejects.toThrow();
    await task;
    expect(service.devices[0].state).toBe("Connected");
    service.setReconnect(id, true);
    expect(
      new Store(join(dir, "settings.json")).data.reconnect[0].enabled,
    ).toBe(true);
    await service.disconnect(id);
    expect(service.connections).toHaveLength(0);
    expect(store.data.reconnect[0].status).toBe("paused");
    expect(
      JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")).recent,
    ).toHaveLength(1);
  });
  it("preserves connection ownership on a detach failure", async () => {
    const { service, store } = setup();
    await service.initialize();
    const id = service.devices[0].id;
    await service.connect(id);
    store.data.settings.mockErrorRate = 1;
    await expect(service.disconnect(id)).rejects.toThrow();
    expect(service.connections).toHaveLength(1);
    expect(service.devices[0].state).toBe("Error");
  });
  it("blocks server edits with active devices and keeps errors on cards", async () => {
    const { service, store } = setup();
    await service.initialize();
    await service.connect(service.devices[0].id);
    expect(() => service.assertServerEditable("home")).toThrow();
    store.data.settings.mockErrorRate = 1;
    await expect(service.connect(service.devices[1].id)).rejects.toThrow();
    expect(service.devices[1].error?.code).toBe("DEVICE_BUSY");
  });
  it("detects connection loss and retries with a bounded delay", async () => {
    const { service, backend, store, notify } = setup();
    await service.initialize();
    const id = service.devices[0].id;
    await service.connect(id);
    service.setReconnect(id, true);
    store.data.settings.autoReconnect = true;
    await backend.detach(service.connections[0]);
    await service.refresh();
    expect(notify).toHaveBeenCalledWith("lostNotification", "USB Serial CH340");
    expect(store.data.reconnect[0].status).toBe("waiting");
    store.data.reconnect[0].nextAttemptAt = 0;
    await service.tick();
    expect(service.connections).toHaveLength(1);
    expect(reconnectDelay(100)).toBe(300000);
  });
  it("backs up invalid persistence without accepting invalid settings", () => {
    const { dir } = setup();
    const path = join(dir, "bad.json");
    writeFileSync(path, "{bad");
    expect(new Store(path).data.servers).toEqual([]);
  });
});
