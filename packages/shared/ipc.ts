import { z } from "zod";
import { localBusIdSchema, sharingStateSchema } from "../usb-server/models";
import {
  idSchema,
  serverSchema,
  settingsSchema,
  snapshotSchema,
  errorSchema,
} from "../core/models";
export const IPC = {
  request: "remoteusb:request",
  changed: "remoteusb:changed",
} as const;
export const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("localDevices") }),
  z.object({
    action: z.literal("shareDevice"),
    busId: localBusIdSchema,
    instanceId: z.string().min(1).max(2048),
    shared: z.boolean(),
  }),
  z.object({ action: z.literal("snapshot") }),
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("saveServer"), server: serverSchema }),
  z.object({ action: z.literal("testServer"), server: serverSchema }),
  z.object({ action: z.literal("removeServer"), id: idSchema }),
  z.object({ action: z.literal("connect"), id: idSchema }),
  z.object({ action: z.literal("disconnect"), id: idSchema }),
  z.object({ action: z.literal("disconnectAll") }),
  z.object({ action: z.literal("settings"), settings: settingsSchema }),
  z.object({
    action: z.literal("reconnect"),
    id: idSchema,
    enabled: z.boolean(),
  }),
  z.object({ action: z.literal("demo") }),
  z.object({
    action: z.literal("openLink"),
    target: z.enum([
      "guide",
      "github",
      "licenses",
      "tools",
      "sources",
      "serverGuide",
      "serverTools",
    ]),
  }),
]);
export type Request = z.infer<typeof requestSchema>;
export const responseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    snapshot: snapshotSchema,
    sharing: sharingStateSchema.optional(),
    deviceCount: z.number().int().nonnegative().optional(),
  }),
  z.object({ ok: z.literal(false), error: errorSchema }),
]);
export type Response = z.infer<typeof responseSchema>;
/** rendererに公開する限定API。汎用IPC・任意コマンドを公開しない。 */
export interface RemoteUsbApi {
  request(request: Request): Promise<Response>;
  subscribe(listener: () => void): () => void;
}
