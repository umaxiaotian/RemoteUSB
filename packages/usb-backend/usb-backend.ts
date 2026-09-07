import type {
  BackendStatus,
  RemoteUsbDevice,
  UsbConnection,
  UsbServer,
} from "../core/models";
/** 実装依存のUSB操作をmainプロセスから隔離する契約。 */
export interface UsbBackend {
  checkAvailability(): Promise<BackendStatus>;
  listDevices(server: UsbServer): Promise<RemoteUsbDevice[]>;
  attach(server: UsbServer, device: RemoteUsbDevice): Promise<UsbConnection>;
  detach(connection: UsbConnection): Promise<void>;
  listConnections(): Promise<UsbConnection[]>;
}
