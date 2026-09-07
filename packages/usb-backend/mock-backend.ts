import type { UsbBackend } from "./usb-backend";
import type {
  ApplicationSettings,
  RemoteUsbDevice,
  UsbConnection,
  UsbServer,
} from "../core/models";
import { detectDeviceType } from "../core/device-type";
import { UsbBackendError } from "../core/errors";
export const demoServers: UsbServer[] = [
  {
    id: "home",
    name: "HOME-SERVER",
    hostname: "home-server.local",
    port: 3240,
    enabled: true,
  },
  {
    id: "office",
    name: "OFFICE-PC",
    hostname: "office-pc.local",
    port: 3240,
    enabled: true,
  },
];
const samples = [
  ["USB Serial CH340", "QinHeng Electronics", "1a86", "7523"],
  ["Arduino Uno", "Arduino", "2341", "0043"],
  ["ST-Link V2", "STMicroelectronics", "0483", "3748"],
  ["USB Smart Card Reader", "ACS", "072f", "2200"],
  ["Brother Printer", "Brother", "04f9", "0042"],
  ["USB Storage Device", "SanDisk", "0781", "5581"],
];
/** 実機なしで遅延・障害を再現する交換可能なバックエンド。 */
export class MockUsbBackend implements UsbBackend {
  private connections: UsbConnection[] = [];
  private nextPort = 1;
  constructor(
    private settings: () => ApplicationSettings,
    private delay = 750,
  ) {}
  async checkAvailability() {
    return { ready: true, executableFound: true, driver: "mock" as const };
  }
  async listDevices(server: UsbServer): Promise<RemoteUsbDevice[]> {
    return (
      server.hostname.includes("office")
        ? samples.slice(4)
        : samples.slice(0, 4)
    ).map(([name, manufacturer, vid, pid], index) => ({
      id: `${server.id}:1-${index + 1}`,
      serverId: server.id,
      busId: `1-${index + 1}`,
      name,
      manufacturer,
      vid,
      pid,
      type: detectDeviceType(name, vid, pid),
      state: "Available",
    }));
  }
  private async wait() {
    await new Promise((resolve) => setTimeout(resolve, this.delay));
    if (Math.random() < this.settings().mockErrorRate)
      throw new UsbBackendError("DEVICE_BUSY", "Simulated backend failure");
  }
  async attach(
    server: UsbServer,
    device: RemoteUsbDevice,
  ): Promise<UsbConnection> {
    await this.wait();
    if (this.connections.some((c) => c.deviceId === device.id))
      throw new UsbBackendError("DEVICE_BUSY", "Already attached");
    const connection: UsbConnection = {
      id: `mock-${this.nextPort}`,
      deviceId: device.id,
      serverId: server.id,
      hostname: server.hostname,
      busId: device.busId,
      port: this.nextPort++,
      name: device.name,
      connectedAt: new Date().toISOString(),
      ...(device.type === "Serial" ? { windowsDevice: "COM6 (demo)" } : {}),
    };
    this.connections.push(connection);
    return connection;
  }
  async detach(connection: UsbConnection) {
    await this.wait();
    this.connections = this.connections.filter((c) => c.id !== connection.id);
  }
  async listConnections() {
    return [...this.connections];
  }
}
