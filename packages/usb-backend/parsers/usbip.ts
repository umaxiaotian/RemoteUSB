import { detectDeviceType } from "../../core/device-type";
import { UsbBackendError } from "../../core/errors";
import type { RemoteUsbDevice, UsbServer } from "../../core/models";
/** CLIの見出しではなくBus IDと数値識別子を基準にデバイスを解析する。 */
export function parseDeviceList(
  output: string,
  server: UsbServer,
): RemoteUsbDevice[] {
  const devices: RemoteUsbDevice[] = [];
  for (const block of output
    .replace(/\r/g, "")
    .split(/(?=^\s*\d+-\d+(?:\.\d+)*\s*:)/m)) {
    const match = block.match(/^\s*(\d+-\d+(?:\.\d+)*)\s*:\s*(.+)/);
    if (!match) continue;
    const [, busId, description] = match;
    const ids = description.match(/\(([\da-f]{4}):([\da-f]{4})\)/i);
    const vid = ids?.[1].toLowerCase() ?? "0000",
      pid = ids?.[2].toLowerCase() ?? "0000";
    const cleaned = description
      .replace(/\s*\([\da-f]{4}:[\da-f]{4}\)\s*$/i, "")
      .trim();
    const split = cleaned.indexOf(" : ");
    const manufacturer =
      split >= 0 ? cleaned.slice(0, split) : "Unknown manufacturer";
    const name = split >= 0 ? cleaned.slice(split + 3) : cleaned;
    const usbClass = block
      .match(/\(([\da-f]{2})\/[\da-f]{2}\/[\da-f]{2}\)/i)?.[1]
      .toLowerCase();
    devices.push({
      id: `${server.id}:${busId}`,
      serverId: server.id,
      busId,
      name,
      manufacturer,
      vid,
      pid,
      type: detectDeviceType(name, vid, pid, usbClass),
      state: "Available",
    });
  }
  if (
    !devices.length &&
    output.trim() &&
    !/no exportable devices|Exportable USB devices/i.test(output)
  )
    throw new UsbBackendError(
      "UNKNOWN",
      "Unsupported device list output: " + output.slice(0, 2000),
    );
  return devices;
}
/** terse出力と上流CLIの成功メッセージから割り当てポートを取得する。 */
export function parseAttachedPort(output: string): number {
  const match =
    output.trim().match(/^(\d+)$/) ??
    output.match(/attach(?:ed)?\s+to\s+port\s+(\d+)/i);
  if (!match)
    throw new UsbBackendError(
      "ATTACH_FAILED",
      "Attach result is ambiguous; inspect usbip port before retrying. " +
        output,
    );
  return Number(match[1]);
}
/** win2は0接続時に空出力。接続先も照合し、再利用されたポートの誤切断を防ぐ。 */
export function parseImportedDevices(
  output: string,
): { port: number; hostname: string; service: number; busId: string }[] {
  if (!output.trim()) return [];
  const devices: ReturnType<typeof parseImportedDevices> = [];
  for (const block of output.replace(/\r/g, "").split(/(?=^Port\s+\d+:)/m)) {
    const port = block.match(/^Port\s+(\d+): device in use at /);
    if (!port) continue;
    const location = block.match(
      /-> usbip:\/\/(.+):(\d+)\/(\d+-\d+(?:\.\d+)*)\s*$/m,
    );
    if (!location)
      throw new UsbBackendError(
        "UNKNOWN",
        "Unsupported usbip-win2 device location: " + block.slice(0, 2000),
      );
    devices.push({
      port: Number(port[1]),
      hostname: location[1],
      service: Number(location[2]),
      busId: location[3],
    });
  }
  if (!devices.length)
    throw new UsbBackendError(
      "UNKNOWN",
      "Unsupported usbip-win2 port output: " + output.slice(0, 2000),
    );
  return devices;
}
/** ポート番号のみを使う呼び出し元向け。 */
export function parsePorts(output: string): number[] {
  return parseImportedDevices(output).map((p) => p.port);
}
