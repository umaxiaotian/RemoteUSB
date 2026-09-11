import { z } from "zod";
export const localBusIdSchema = z.string().regex(/^\d{1,5}-\d{1,5}$/);
export const localDeviceSchema = z.object({
  busId: localBusIdSchema,
  instanceId: z.string().min(1).max(2048),
  name: z.string(),
  vid: z.string(),
  pid: z.string(),
  shared: z.boolean(),
  client: z.string().nullable(),
});
export type LocalUsbDevice = z.infer<typeof localDeviceSchema>;
export const sharingStateSchema = z.object({
  installed: z.boolean(),
  devices: z.array(localDeviceSchema),
});
export type SharingState = z.infer<typeof sharingStateSchema>;
export interface UsbServerBackend {
  list(): Promise<SharingState>;
  setShared(
    busId: string,
    instanceId: string,
    shared: boolean,
  ): Promise<SharingState>;
}
