import { expect, it, vi } from "vitest";
import {
  parseUsbipdState,
  UsbipdBackend,
} from "../packages/usb-server/usbipd-backend";
import { UsbBackendError } from "../packages/core/errors";
import { requestSchema } from "../packages/shared/ipc";
const device = {
  BusId: "1-7",
  InstanceId: "USB\\VID_1A86&PID_7523\\test",
  Description: "USB Serial CH340",
  PersistedGuid: null as string | null,
  ClientIPAddress: null as string | null,
};
const state = (shared = false) =>
  JSON.stringify({
    Devices: [
      {
        ...device,
        PersistedGuid: shared ? "00000000-0000-0000-0000-000000000001" : null,
      },
    ],
  });
it("parses usbipd JSON, connected clients and excludes unplugged persisted devices", () => {
  const result = parseUsbipdState(
    JSON.stringify({
      Devices: [
        { ...device, PersistedGuid: "guid", ClientIPAddress: "192.168.1.5" },
        { ...device, BusId: null },
      ],
    }),
  );
  expect(result.devices).toHaveLength(1);
  expect(result.devices[0]).toMatchObject({
    vid: "1a86",
    pid: "7523",
    shared: true,
    client: "192.168.1.5",
  });
  expect(() => parseUsbipdState("unsupported output")).toThrow();
  expect(() => parseUsbipdState('{"Devices":[{}]}')).toThrow();
});
it("reports missing installation without executing anything", async () => {
  const run = vi.fn();
  expect(await new UsbipdBackend(run, vi.fn(), () => undefined).list()).toEqual(
    { installed: false, devices: [] },
  );
  expect(run).not.toHaveBeenCalled();
});
it("rejects concurrent sharing operations until the first completes", async () => {
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let shared = false;
  const backend = new UsbipdBackend(
    async () => state(shared),
    async () => {
      entered();
      await gate;
      shared = true;
    },
    () => "C:\\usbipd.exe",
  );
  const pending = backend.setShared("1-7", device.InstanceId, true);
  await started;
  await expect(
    backend.setShared("1-7", device.InstanceId, true),
  ).rejects.toMatchObject({ code: "DEVICE_BUSY" });
  release();
  await pending;
  expect(backend.isBusy()).toBe(false);
});
it("binds and unbinds only the selected bus ID, then verifies state", async () => {
  let shared = false;
  const runner = vi.fn(async () => state(shared));
  const elevate = vi.fn(async (_exe, action) => {
    shared = action === "bind";
  });
  const backend = new UsbipdBackend(runner, elevate, () => "C:\\usbipd.exe");
  expect(
    (await backend.setShared("1-7", device.InstanceId, true)).devices[0].shared,
  ).toBe(true);
  expect(elevate).toHaveBeenLastCalledWith("C:\\usbipd.exe", "bind", "1-7");
  await backend.setShared("1-7", device.InstanceId, false);
  expect(elevate).toHaveBeenLastCalledWith("C:\\usbipd.exe", "unbind", "1-7");
  expect(runner).toHaveBeenCalledWith("C:\\usbipd.exe", ["state"], 10000);
});
it("rejects stale device identity and command injection", async () => {
  const elevate = vi.fn();
  const backend = new UsbipdBackend(
    async () => state(),
    elevate,
    () => "C:\\usbipd.exe",
  );
  await expect(
    backend.setShared("1-7", "different device", true),
  ).rejects.toMatchObject({ code: "DEVICE_NOT_FOUND" });
  expect(
    requestSchema.safeParse({
      action: "shareDevice",
      busId: "1-7;calc",
      instanceId: device.InstanceId,
      shared: true,
    }).success,
  ).toBe(false);
  expect(elevate).not.toHaveBeenCalled();
});
it("preserves cancellation errors and releases the lock", async () => {
  const backend = new UsbipdBackend(
    async () => state(),
    async () => {
      throw new UsbBackendError("PERMISSION_DENIED", "Cancelled");
    },
    () => "C:\\usbipd.exe",
  );
  await expect(
    backend.setShared("1-7", device.InstanceId, true),
  ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  expect(backend.isBusy()).toBe(false);
});
it("does not claim success if the operation did not change the state", async () => {
  const backend = new UsbipdBackend(
    async () => state(),
    async () => {},
    () => "C:\\usbipd.exe",
  );
  await expect(
    backend.setShared("1-7", device.InstanceId, true),
  ).rejects.toThrow("could not be confirmed");
});
