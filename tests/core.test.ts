import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseAttachedPort,
  parseDeviceList,
  parsePorts,
  parseImportedDevices,
} from "../packages/usb-backend/parsers/usbip";
import { demoServers } from "../packages/usb-backend/mock-backend";
import {
  busIdSchema,
  hostnameSchema,
  persistedSchema,
  serverSchema,
  settingsSchema,
} from "../packages/core/models";
import { mapError } from "../packages/core/errors";
import { detectDeviceType } from "../packages/core/device-type";
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/${name}.txt`, "utf8");
describe("CLI fixtures", () => {
  it("parses devices, dotted bus IDs and CRLF", () => {
    const devices = parseDeviceList(
      fixture("list").replace(/\n/g, "\r\n"),
      demoServers[0],
    );
    expect(devices).toHaveLength(2);
    expect(devices[0]).toMatchObject({
      vid: "1a86",
      pid: "7523",
      type: "Serial",
    });
    expect(devices[1]).toMatchObject({ busId: "1-4.2", type: "Debug Probe" });
  });
  it("does not depend on English headings", () =>
    expect(
      parseDeviceList(
        fixture("list").replace("Exportable USB devices", "公開デバイス"),
        demoServers[0],
      ),
    ).toHaveLength(2));
  it("handles an empty server and rejects unknown output", () => {
    expect(
      parseDeviceList(
        "usbip: info: no exportable devices found on host",
        demoServers[0],
      ),
    ).toEqual([]);
    expect(() =>
      parseDeviceList("unexpected format", demoServers[0]),
    ).toThrow();
  });
  it("parses only healthy occupied ports", () =>
    expect(parsePorts(fixture("ports"))).toEqual([1]));
  it("accepts win2 empty output and rejects legacy ports", () => {
    expect(parsePorts("")).toEqual([]);
    expect(() => parsePorts("Port 01: <Port in Use>")).toThrow();
  });
  it("parses centered bus IDs used by win2", () => {
    expect(
      parseDeviceList(
        "    1-2    : Vendor : Product (1234:5678)\n           : class (03/00/00)",
        demoServers[0],
      )[0],
    ).toMatchObject({ busId: "1-2", vid: "1234" });
  });
  it("retains IPv6 endpoint and server port", () => {
    expect(
      parseImportedDevices(
        fixture("ports").replace("home-server.local", "2001:db8::1"),
      )[0],
    ).toMatchObject({
      hostname: "2001:db8::1",
      service: 4321,
      busId: "1-2",
      port: 1,
    });
  });
  it("accepts terse and upstream misspelled success output", () => {
    expect(parseAttachedPort("12\r\n")).toBe(12);
    expect(parseAttachedPort("succesfully attached to port 2")).toBe(2);
    expect(() => parseAttachedPort("unknown")).toThrow();
  });
});
describe("validation and errors", () => {
  it.each(["-r", "host;calc", "a b", "$(calc)", "a\nfoo"])(
    "rejects unsafe hostname %s",
    (value) => expect(hostnameSchema.safeParse(value).success).toBe(false),
  );
  it("accepts IPv6 and validates port and bus ID", () => {
    expect(hostnameSchema.safeParse("::1").success).toBe(true);
    expect(serverSchema.safeParse({ ...demoServers[0], port: 0 }).success).toBe(
      false,
    );
    expect(busIdSchema.safeParse("1-2 & calc").success).toBe(false);
  });
  it("validates settings and stored schema version", () => {
    expect(settingsSchema.parse({}).theme).toBe("system");
    expect(settingsSchema.safeParse({ timeout: -1 }).success).toBe(false);
    expect(settingsSchema.safeParse({ mockErrorRate: 2 }).success).toBe(false);
    expect(persistedSchema.safeParse({ version: 99 }).success).toBe(false);
  });
  it.each([
    ["ENOENT", "BACKEND_NOT_FOUND"],
    ["already used bus id", "DEVICE_BUSY"],
    ["vhci driver is not loaded", "DRIVER_NOT_INSTALLED"],
    ["access denied", "PERMISSION_DENIED"],
    ["timed out", "TIMEOUT"],
    ["non-existent bus id", "DEVICE_NOT_FOUND"],
    ["failed to connect a remote host", "SERVER_UNREACHABLE"],
  ])("maps %s", (message, code) =>
    expect(mapError(new Error(message)).code).toBe(code),
  );
  it.each([
    ["Arduino Uno", "Serial"],
    ["USB Smart Card Reader", "Smart Card"],
    ["Brother Printer", "Printer"],
    ["USB Storage Device", "Storage"],
    ["webcam", "Camera"],
    ["audio", "Audio"],
    ["keyboard", "HID"],
    ["unidentified", "Unknown"],
  ])("classifies %s", (name, type) =>
    expect(detectDeviceType(name)).toBe(type),
  );
});
