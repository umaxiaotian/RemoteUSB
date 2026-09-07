import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  busIdSchema,
  serverSchema,
  type ApplicationSettings,
  type BackendStatus,
  type RemoteUsbDevice,
  type UsbConnection,
  type UsbServer,
} from "../core/models";
import { mapError, UsbBackendError } from "../core/errors";
import {
  parseAttachedPort,
  parseDeviceList,
  parseImportedDevices,
} from "./parsers/usbip";
import { runProcess, type Runner } from "./process";
import type { UsbBackend } from "./usb-backend";
/** vadimgrn/usbip-win2 0.9.8.0 CLIをプロセス境界で利用する。 */
export class UsbipWinBackend implements UsbBackend {
  private connections: UsbConnection[] = [];
  private services = new Map<string, number>();
  constructor(
    private settings: () => ApplicationSettings,
    private runner: Runner = runProcess,
    private debug: (text: string) => void = () => {},
  ) {}
  private executable() {
    const configured = this.settings().executablePath;
    if (configured) {
      if (
        !isAbsolute(configured) ||
        !/\.exe$/i.test(configured) ||
        !existsSync(configured)
      )
        throw new UsbBackendError(
          "BACKEND_NOT_FOUND",
          "Choose an existing absolute path to usbip.exe",
        );
      return configured;
    }
    const paths = [process.env.ProgramW6432, process.env.ProgramFiles]
      .filter((p): p is string => !!p)
      .map((p) => join(p, "USBip"));
    paths.push(
      ...(process.env.PATH ?? "").split(";").filter((p) => isAbsolute(p)),
    );
    const found = paths
      .map((p) => join(p, "usbip.exe"))
      .find((p) => existsSync(p));
    if (!found)
      throw new UsbBackendError(
        "BACKEND_NOT_FOUND",
        "Install the bundled USBip setup, or select usbip-win2 usbip.exe in Settings",
      );
    return found;
  }
  private async run(args: string[]) {
    const text = await this.runner(
      this.executable(),
      args,
      this.settings().timeout,
    );
    this.debug(text);
    return text;
  }
  async checkAvailability(): Promise<BackendStatus> {
    let executableFound = false;
    try {
      await this.run(["--version"]);
      executableFound = true;
      parseImportedDevices(await this.run(["port"]));
      return {
        ready: true,
        executableFound,
        driver: "ready",
        details: "Driver responded. Signing status is not exposed by this CLI.",
      };
    } catch (error) {
      const mapped = mapError(error);
      return {
        ready: false,
        executableFound,
        driver: mapped.code === "DRIVER_NOT_INSTALLED" ? "missing" : "unknown",
        details: mapped.details,
      };
    }
  }
  async listDevices(server: UsbServer) {
    serverSchema.parse(server);
    if (server.port < 1024)
      throw new UsbBackendError(
        "UNKNOWN",
        "usbip-win2 requires a TCP port between 1024 and 65535",
      );
    return parseDeviceList(
      await this.run([
        "--tcp-port",
        String(server.port),
        "list",
        "-r",
        server.hostname,
      ]),
      server,
    );
  }
  async attach(
    server: UsbServer,
    device: RemoteUsbDevice,
  ): Promise<UsbConnection> {
    serverSchema.parse(server);
    busIdSchema.parse(device.busId);
    if (server.port < 1024)
      throw new UsbBackendError(
        "UNKNOWN",
        "usbip-win2 requires a TCP port between 1024 and 65535",
      );
    const port = parseAttachedPort(
      await this.run([
        "--tcp-port",
        String(server.port),
        "attach",
        "-r",
        server.hostname,
        "-b",
        device.busId,
        "-t",
      ]),
    );
    const connection: UsbConnection = {
      id: `usbip-${port}-${Date.now()}`,
      deviceId: device.id,
      serverId: server.id,
      hostname: server.hostname,
      busId: device.busId,
      port,
      name: device.name,
      connectedAt: new Date().toISOString(),
    };
    this.services.set(connection.id, server.port);
    this.connections.push(connection);
    return connection;
  }
  async detach(connection: UsbConnection) {
    if (!this.connections.some((c) => c.id === connection.id))
      throw new UsbBackendError(
        "DETACH_FAILED",
        "Connection is not owned by this app session",
      );
    const ports = parseImportedDevices(await this.run(["port"]));
    if (ports.some((p) => this.matches(connection, p)))
      await this.run(["detach", "-p", String(connection.port)]);
    this.services.delete(connection.id);
    this.connections = this.connections.filter((c) => c.id !== connection.id);
  }
  async listConnections() {
    const ports = parseImportedDevices(await this.run(["port"]));
    this.connections = this.connections.filter((c) => {
      const alive = ports.some((p) => this.matches(c, p));
      if (!alive) this.services.delete(c.id);
      return alive;
    });
    return [...this.connections];
  }
  private matches(
    c: UsbConnection,
    p: ReturnType<typeof parseImportedDevices>[number],
  ) {
    return (
      p.port === c.port &&
      p.hostname.toLowerCase() === c.hostname.toLowerCase() &&
      p.busId === c.busId &&
      p.service === this.services.get(c.id)
    );
  }
}
