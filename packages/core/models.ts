import { z } from "zod";

export const idSchema = z.string().min(1).max(180);
export const hostnameSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^(?:[a-zA-Z0-9][a-zA-Z0-9.-]*|[0-9a-fA-F]*:[0-9a-fA-F:]+)$/);
export const busIdSchema = z.string().regex(/^\d{1,5}-\d{1,5}(?:\.\d{1,5})*$/);
export const serverSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  hostname: hostnameSchema,
  port: z.number().int().min(1).max(65535),
  enabled: z.boolean(),
  lastSeenAt: z.string().optional(),
});
/** 保存・通信時に検証するサーバー情報。 */
export type UsbServer = z.infer<typeof serverSchema>;
export const settingsSchema = z.object({
  language: z.enum(["system", "en", "ja", "ko", "zh-CN"]).default("system"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  startAtLogin: z.boolean().default(false),
  minimizeToTray: z.boolean().default(true),
  autoRefresh: z.boolean().default(true),
  autoReconnect: z.boolean().default(false),
  executablePath: z.string().max(1024).default(""),
  timeout: z.number().int().min(1000).max(60000).default(10000),
  technicalInfo: z.boolean().default(false),
  debugLogging: z.boolean().default(false),
  mockErrorRate: z.number().min(0).max(1).default(0),
  welcomeComplete: z.boolean().default(false),
});
export type ApplicationSettings = z.infer<typeof settingsSchema>;
export const stateSchema = z.enum([
  "Available",
  "Connecting",
  "Connected",
  "Disconnecting",
  "Unavailable",
  "Error",
]);
export const typeSchema = z.enum([
  "Serial",
  "Storage",
  "Printer",
  "Camera",
  "Audio",
  "HID",
  "Smart Card",
  "Debug Probe",
  "Unknown",
]);
export const errorCodeSchema = z.enum([
  "BACKEND_NOT_FOUND",
  "DRIVER_NOT_INSTALLED",
  "SERVER_UNREACHABLE",
  "DEVICE_NOT_FOUND",
  "DEVICE_BUSY",
  "ATTACH_FAILED",
  "DETACH_FAILED",
  "PERMISSION_DENIED",
  "TIMEOUT",
  "UNKNOWN",
]);
export type UsbBackendErrorCode = z.infer<typeof errorCodeSchema>;
export const errorSchema = z.object({
  code: errorCodeSchema,
  details: z.string(),
});
export type BackendError = z.infer<typeof errorSchema>;
export const deviceSchema = z.object({
  id: idSchema,
  serverId: idSchema,
  busId: busIdSchema,
  name: z.string(),
  manufacturer: z.string(),
  type: typeSchema,
  vid: z.string(),
  pid: z.string(),
  state: stateSchema,
  error: errorSchema.optional(),
});
export type RemoteUsbDevice = z.infer<typeof deviceSchema>;
export const connectionSchema = z.object({
  id: idSchema,
  deviceId: idSchema,
  serverId: idSchema,
  hostname: hostnameSchema,
  busId: busIdSchema,
  port: z.number().int().nonnegative(),
  name: z.string(),
  connectedAt: z.string(),
  windowsDevice: z.string().optional(),
});
export type UsbConnection = z.infer<typeof connectionSchema>;
export const backendStatusSchema = z.object({
  ready: z.boolean(),
  executableFound: z.boolean(),
  driver: z.enum(["ready", "missing", "unknown", "development", "mock"]),
  details: z.string().optional(),
});
export type BackendStatus = z.infer<typeof backendStatusSchema>;
export const reconnectSchema = z.object({
  device: deviceSchema,
  enabled: z.boolean(),
  attempts: z.number().int().nonnegative(),
  nextAttemptAt: z.number(),
  status: z.enum(["idle", "waiting", "connected", "paused"]),
});
export const persistedSchema = z.object({
  version: z.literal(1).default(1),
  servers: z.array(serverSchema).default([]),
  settings: settingsSchema.default(() => settingsSchema.parse({})),
  reconnect: z.array(reconnectSchema).default([]),
  recent: z.array(deviceSchema).max(30).default([]),
  window: z
    .object({
      width: z.number().min(900).max(10000),
      height: z.number().min(600).max(10000),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .default({ width: 1120, height: 760 }),
});
export type PersistedData = z.infer<typeof persistedSchema>;
export const snapshotSchema = z.object({
  servers: z.array(serverSchema),
  settings: settingsSchema,
  devices: z.array(deviceSchema),
  connections: z.array(connectionSchema),
  backend: backendStatusSchema,
  mode: z.enum(["mock", "usbip"]),
  version: z.string(),
  serverErrors: z.record(z.string(), errorSchema),
  reconnect: z.array(reconnectSchema),
  recent: z.array(deviceSchema),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
