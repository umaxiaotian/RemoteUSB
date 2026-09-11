import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { execFile } from "node:child_process";
import { z } from "zod";
import { runProcess, type Runner } from "../usb-backend/process";
import { UsbBackendError } from "../core/errors";
import {
  localBusIdSchema,
  type SharingState,
  type UsbServerBackend,
} from "./models";

const stateSchema = z.object({
  Devices: z.array(
    z.object({
      BusId: localBusIdSchema.nullable(),
      InstanceId: z.string().min(1).max(2048),
      Description: z.string(),
      PersistedGuid: z.string().nullable(),
      ClientIPAddress: z.string().nullable(),
    }),
  ),
});
export function parseUsbipdState(output: string): SharingState {
  const state = stateSchema.parse(JSON.parse(output.replace(/^\uFEFF/, "")));
  return {
    installed: true,
    devices: state.Devices.flatMap((d) => {
      if (!d.BusId) return [];
      const ids = d.InstanceId.match(/VID_([\da-f]{4})&PID_([\da-f]{4})/i);
      return [
        {
          busId: d.BusId,
          instanceId: d.InstanceId,
          name: d.Description,
          vid: ids?.[1].toLowerCase() ?? "????",
          pid: ids?.[2].toLowerCase() ?? "????",
          shared: d.PersistedGuid !== null,
          client: d.ClientIPAddress,
        },
      ];
    }),
  };
}
function findExecutable() {
  const directories = [process.env.ProgramW6432, process.env.ProgramFiles]
    .filter((p): p is string => !!p)
    .map((p) => join(p, "usbipd-win"));
  directories.push(
    ...(process.env.PATH ?? "").split(";").filter((p) => isAbsolute(p)),
  );
  return directories.map((p) => join(p, "usbipd.exe")).find(existsSync);
}
export type Elevate = (
  exe: string,
  action: "bind" | "unbind",
  busId: string,
) => Promise<void>;
/** Elevate only the fixed bind/unbind operation, never the Electron application. */
export const elevateUsbipd: Elevate = (exe, action, busId) =>
  new Promise((resolve, reject) => {
    localBusIdSchema.parse(busId);
    const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
    const script = `$ErrorActionPreference='Stop'; try { $p=Start-Process -FilePath ${quote(exe)} -ArgumentList @(${quote(action)},'--busid',${quote(busId)}) -Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode } catch { if ($_.Exception.NativeErrorCode -eq 1223 -or $_.Exception.InnerException.NativeErrorCode -eq 1223) { exit 1223 }; Write-Error $_; exit 1 }`;
    const powershell = join(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    );
    // No timeout: retain the operation lock until UAC/the elevated child has finished.
    execFile(
      powershell,
      [
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ],
      { windowsHide: true, shell: false, maxBuffer: 1024 * 1024 },
      (error) => {
        if (!error) resolve();
        else
          reject(
            new UsbBackendError(
              error.code === 1223 ? "PERMISSION_DENIED" : "UNKNOWN",
              error.code === 1223
                ? "Administrator approval was cancelled."
                : "usbipd could not change sharing. The device may have been removed or access denied. Refresh the list and check usbipd-win. Exit code: " +
                    error.code,
            ),
          );
      },
    );
  });
export class UsbipdBackend implements UsbServerBackend {
  private busy = false;
  isBusy() {
    return this.busy;
  }
  constructor(
    private runner: Runner = runProcess,
    private elevate: Elevate = elevateUsbipd,
    private locate: () => string | undefined = findExecutable,
  ) {}
  async list(): Promise<SharingState> {
    const exe = this.locate();
    if (!exe) return { installed: false, devices: [] };
    return parseUsbipdState(await this.runner(exe, ["state"], 10000));
  }
  async setShared(busId: string, instanceId: string, shared: boolean) {
    localBusIdSchema.parse(busId);
    if (this.busy)
      throw new UsbBackendError(
        "DEVICE_BUSY",
        "Another sharing operation is still running.",
      );
    this.busy = true;
    try {
      const exe = this.locate();
      if (!exe)
        throw new UsbBackendError(
          "BACKEND_NOT_FOUND",
          "Install usbipd-win to share local devices.",
        );
      const before = parseUsbipdState(await this.runner(exe, ["state"], 10000));
      const device = before.devices.find(
        (d) => d.busId === busId && d.instanceId === instanceId,
      );
      if (!device)
        throw new UsbBackendError(
          "DEVICE_NOT_FOUND",
          "The local USB device changed. Refresh before sharing.",
        );
      if (device.shared !== shared)
        await this.elevate(exe, shared ? "bind" : "unbind", busId);
      const after = await this.list();
      const current = after.devices.find((d) => d.instanceId === instanceId);
      if (!current || current.shared !== shared)
        throw new UsbBackendError(
          "UNKNOWN",
          "Sharing state could not be confirmed. Refresh the local device list.",
        );
      return after;
    } finally {
      this.busy = false;
    }
  }
}
