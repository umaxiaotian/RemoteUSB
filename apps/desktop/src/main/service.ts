import type { UsbBackend } from "../../../../packages/usb-backend/usb-backend";
import { mapError, UsbBackendError } from "../../../../packages/core/errors";
import type {
  BackendError,
  BackendStatus,
  RemoteUsbDevice,
  Snapshot,
  UsbConnection,
} from "../../../../packages/core/models";
import type { Store } from "./store";
/** 再接続間隔は最大5分。失敗した操作を高頻度で繰り返さない。 */
export function reconnectDelay(attempt: number) {
  return Math.min(300000, 2000 * 2 ** Math.min(attempt, 8));
}
/** USB状態をmainで一元管理し、操作競合と画面更新を調停する。 */
export class UsbService {
  devices: RemoteUsbDevice[] = [];
  connections: UsbConnection[] = [];
  backendStatus: BackendStatus = {
    ready: false,
    executableFound: false,
    driver: "unknown",
  };
  serverErrors: Record<string, BackendError> = {};
  private pending = new Set<string>();
  private refreshTask?: Promise<void>;
  constructor(
    public store: Store,
    public backend: UsbBackend,
    public mode: "mock" | "usbip",
    private version: string,
    private changed: () => void,
    private notify: (message: string, name?: string) => void,
  ) {}
  snapshot(): Snapshot {
    return {
      servers: this.store.data.servers,
      settings: this.store.data.settings,
      devices: this.devices,
      connections: this.connections,
      backend: this.backendStatus,
      mode: this.mode,
      version: this.version,
      serverErrors: this.serverErrors,
      reconnect: this.store.data.reconnect,
      recent: this.store.data.recent,
    };
  }
  async initialize() {
    this.backendStatus = await this.backend.checkAvailability();
    await this.refresh();
  }
  refresh() {
    if (!this.refreshTask)
      this.refreshTask = this.doRefresh().finally(() => {
        this.refreshTask = undefined;
      });
    return this.refreshTask;
  }
  private async doRefresh() {
    await Promise.all(
      this.store.data.servers.map(async (server) => {
        if (!server.enabled) {
          this.devices = this.devices.filter(
            (d) => d.serverId !== server.id || this.pending.has(d.id),
          );
          return;
        }
        try {
          const listed = await this.backend.listDevices(server);
          const current = this.devices.filter((d) => d.serverId === server.id);
          const merged = listed.map(
            (d) =>
              current.find(
                (old) => old.id === d.id && this.pending.has(d.id),
              ) ?? {
                ...d,
                state: this.connections.some((c) => c.deviceId === d.id)
                  ? ("Connected" as const)
                  : d.state,
              },
          );
          for (const device of current)
            if (
              !merged.some((d) => d.id === device.id) &&
              (this.pending.has(device.id) ||
                this.connections.some((c) => c.deviceId === device.id))
            )
              merged.push(device);
          this.devices = [
            ...this.devices.filter((d) => d.serverId !== server.id),
            ...merged,
          ];
          server.lastSeenAt = new Date().toISOString();
          delete this.serverErrors[server.id];
        } catch (error) {
          this.serverErrors[server.id] = mapError(error, "SERVER_UNREACHABLE");
          this.devices = this.devices.map((d) =>
            d.serverId === server.id &&
            !this.pending.has(d.id) &&
            !this.connections.some((c) => c.deviceId === d.id)
              ? { ...d, state: "Unavailable" }
              : d,
          );
        }
      }),
    );
    if (!this.pending.size && this.backendStatus.ready) {
      try {
        const actual = await this.backend.listConnections();
        // 待機中に開始された接続操作の結果を上書きしない。
        if (!this.pending.size) {
          for (const lost of this.connections.filter(
            (c) => !actual.some((a) => a.id === c.id),
          )) {
            this.notify("lostNotification", lost.name);
            const policy = this.store.data.reconnect.find(
              (p) => p.device.id === lost.deviceId,
            );
            if (policy?.enabled) {
              policy.status = "waiting";
              policy.nextAttemptAt =
                Date.now() + reconnectDelay(policy.attempts);
            }
          }
          this.connections = actual;
          this.devices = this.devices.map((d) => ({
            ...d,
            state: actual.some((c) => c.deviceId === d.id)
              ? "Connected"
              : d.state === "Connected"
                ? "Available"
                : d.state,
          }));
        }
      } catch (error) {
        this.backendStatus = {
          ...this.backendStatus,
          details: mapError(error).details,
        };
      }
    }
    this.store.save();
    this.changed();
  }
  async connect(id: string) {
    if (this.pending.has(id) || this.connections.some((c) => c.deviceId === id))
      throw new UsbBackendError(
        "DEVICE_BUSY",
        "An operation is already active",
      );
    const device = this.devices.find((d) => d.id === id);
    const server = this.store.data.servers.find(
      (s) => s.id === device?.serverId && s.enabled,
    );
    if (!device || !server)
      throw new UsbBackendError(
        "DEVICE_NOT_FOUND",
        "Device or enabled server not found",
      );
    this.pending.add(id);
    this.setState(id, "Connecting");
    try {
      const connection = await this.backend.attach(server, device);
      this.connections.push(connection);
      this.setState(id, "Connected");
      this.store.data.recent = [
        device,
        ...this.store.data.recent.filter((d) => d.id !== id),
      ].slice(0, 30);
      const policy = this.store.data.reconnect.find((p) => p.device.id === id);
      if (policy) {
        policy.status = "connected";
        policy.attempts = 0;
      }
      this.store.save();
      this.notify("connectedNotification", device.name);
    } catch (error) {
      this.setState(id, "Error", mapError(error, "ATTACH_FAILED"));
      throw error;
    } finally {
      this.pending.delete(id);
      this.changed();
    }
  }
  async disconnect(id: string) {
    if (this.pending.has(id))
      throw new UsbBackendError(
        "DEVICE_BUSY",
        "An operation is already active",
      );
    const connection = this.connections.find((c) => c.deviceId === id);
    if (!connection) return;
    this.pending.add(id);
    this.setState(id, "Disconnecting");
    const policy = this.store.data.reconnect.find((p) => p.device.id === id);
    if (policy) policy.status = "paused"; // 明示的な切断は自動再接続の対象外。
    try {
      await this.backend.detach(connection);
      this.connections = this.connections.filter((c) => c.id !== connection.id);
      this.setState(id, "Available");
      this.store.save();
      this.notify("disconnectedNotification", connection.name);
    } catch (error) {
      this.setState(id, "Error", mapError(error, "DETACH_FAILED"));
      throw error;
    } finally {
      this.pending.delete(id);
      this.changed();
    }
  }
  async disconnectAll() {
    for (const connection of [...this.connections])
      await this.disconnect(connection.deviceId);
  }
  isBusy(serverId?: string) {
    return [...this.pending].some(
      (id) =>
        !serverId ||
        this.devices.find((d) => d.id === id)?.serverId === serverId,
    );
  }
  assertServerEditable(id: string) {
    if (this.isBusy(id) || this.connections.some((c) => c.serverId === id))
      throw new UsbBackendError(
        "DEVICE_BUSY",
        "Disconnect devices before changing this server",
      );
  }
  setReconnect(id: string, enabled: boolean) {
    const device = this.devices.find((d) => d.id === id);
    if (!device)
      throw new UsbBackendError("DEVICE_NOT_FOUND", "Unknown device");
    this.store.data.reconnect = this.store.data.reconnect.filter(
      (p) => p.device.id !== id,
    );
    this.store.data.reconnect.push({
      device,
      enabled,
      attempts: 0,
      nextAttemptAt: 0,
      status: this.connections.some((c) => c.deviceId === id)
        ? "connected"
        : "idle",
    });
    this.store.save();
    this.changed();
  }
  async tick() {
    if (this.store.data.settings.autoRefresh) await this.refresh();
    if (!this.store.data.settings.autoReconnect) return;
    for (const policy of this.store.data.reconnect) {
      if (
        !policy.enabled ||
        policy.status !== "waiting" ||
        Date.now() < policy.nextAttemptAt ||
        this.pending.has(policy.device.id)
      )
        continue;
      if (
        !this.store.data.servers.some(
          (s) => s.id === policy.device.serverId && s.enabled,
        )
      )
        continue;
      if (!this.devices.some((d) => d.id === policy.device.id))
        this.devices.push({ ...policy.device, state: "Unavailable" });
      try {
        await this.connect(policy.device.id);
      } catch {
        policy.attempts++;
        policy.nextAttemptAt = Date.now() + reconnectDelay(policy.attempts);
      }
      this.store.save();
      this.changed();
    }
  }
  private setState(
    id: string,
    state: RemoteUsbDevice["state"],
    error?: BackendError,
  ) {
    this.devices = this.devices.map((d) =>
      d.id === id ? { ...d, state, error } : d,
    );
    this.changed();
  }
}
