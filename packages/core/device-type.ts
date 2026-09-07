import type { RemoteUsbDevice } from "./models";
/** 既知の製品ID・クラスと名称からデバイスの用途を推定する。 */
export function detectDeviceType(
  name: string,
  vid = "",
  pid = "",
  usbClass = "",
): RemoteUsbDevice["type"] {
  if (
    /st-?link|jtag|debug probe/i.test(name) ||
    (vid === "0483" && ["3748", "374b"].includes(pid))
  )
    return "Debug Probe";
  if (
    /serial|arduino|esp32|ftdi|ch340|cdc acm/i.test(name) ||
    ["1a86", "0403", "2341", "10c4"].includes(vid) ||
    usbClass === "02"
  )
    return "Serial";
  if (/smart.?card/i.test(name) || usbClass === "0b") return "Smart Card";
  if (/storage|flash|disk/i.test(name) || usbClass === "08") return "Storage";
  if (/printer/i.test(name) || usbClass === "07") return "Printer";
  if (/camera|webcam/i.test(name) || usbClass === "0e") return "Camera";
  if (/audio|headphone/i.test(name) || usbClass === "01") return "Audio";
  if (/mouse|keyboard|hid/i.test(name) || usbClass === "03") return "HID";
  return "Unknown";
}
