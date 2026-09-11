import { UsbBackendError } from "../core/errors";
import type { SharingState, UsbServerBackend } from "./models";
export class MockUsbServerBackend implements UsbServerBackend {
  private state: SharingState = {
    installed: true,
    devices: [
      {
        busId: "1-7",
        instanceId: "USB\\VID_1A86&PID_7523\\DEMO",
        vid: "1a86",
        pid: "7523",
        name: "USB Serial CH340",
        shared: false,
        client: null,
      },
      {
        busId: "2-4",
        instanceId: "USB\\VID_1234&PID_5678\\DEMO",
        vid: "1234",
        pid: "5678",
        name: "USB Smart Card Reader",
        shared: true,
        client: null,
      },
    ],
  };
  async list() {
    return structuredClone(this.state);
  }
  async setShared(busId: string, instanceId: string, shared: boolean) {
    const d = this.state.devices.find(
      (d) => d.busId === busId && d.instanceId === instanceId,
    );
    if (!d)
      throw new UsbBackendError("DEVICE_NOT_FOUND", "Demo device not found");
    await new Promise((resolve) => setTimeout(resolve, 400));
    d.shared = shared;
    d.client = null;
    return this.list();
  }
}
