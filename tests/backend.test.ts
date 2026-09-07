import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UsbipWinBackend } from "../packages/usb-backend/usbip-win-backend";
import { runProcess } from "../packages/usb-backend/process";
import { settingsSchema } from "../packages/core/models";
import { demoServers } from "../packages/usb-backend/mock-backend";
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
it("passes validated arguments, custom server port and manages owned attach/detach", async () => {
  const dir = mkdtempSync(join(tmpdir(), "remoteusb-backend-"));
  dirs.push(dir);
  const executablePath = join(dir, "usbip.exe");
  writeFileSync(executablePath, "fixture");
  const settings = settingsSchema.parse({ executablePath });
  const runner = vi.fn(async (_exe: string, args: string[]) => {
    if (args.includes("list"))
      return readFileSync("tests/fixtures/list.txt", "utf8");
    if (args.includes("attach")) return "1";
    if (args.includes("port"))
      return readFileSync("tests/fixtures/ports.txt", "utf8");
    return "";
  });
  const backend = new UsbipWinBackend(() => settings, runner);
  const server = { ...demoServers[0], port: 4321 };
  const devices = await backend.listDevices(server);
  const connection = await backend.attach(server, devices[0]);
  expect(runner).toHaveBeenCalledWith(
    executablePath,
    ["--tcp-port", "4321", "attach", "-r", server.hostname, "-b", "1-2", "-t"],
    10000,
  );
  expect(await backend.listConnections()).toHaveLength(1);
  await backend.detach(connection);
  expect(runner).toHaveBeenCalledWith(
    executablePath,
    ["detach", "-p", "1"],
    10000,
  );
  await expect(backend.detach(connection)).rejects.toThrow("not owned");
  await expect(
    backend.listDevices({ ...server, hostname: "-x" }),
  ).rejects.toThrow();
});
it("process runner rejects nonzero exit, timeout and excess output", async () => {
  await expect(
    runProcess(process.execPath, ["-e", "process.exit(4)"], 1000),
  ).rejects.toThrow();
  await expect(
    runProcess(process.execPath, ["-e", "setTimeout(()=>{}, 5000)"], 30),
  ).rejects.toMatchObject({ code: "TIMEOUT" });
  await expect(
    runProcess(
      process.execPath,
      ["-e", 'process.stdout.write("x".repeat(2000000))'],
      5000,
    ),
  ).rejects.toThrow();
});
it("uses win2 version flag and accepts zero attached devices", async () => {
  const dir = mkdtempSync(join(tmpdir(), "remoteusb-backend-"));
  dirs.push(dir);
  const executablePath = join(dir, "usbip.exe");
  writeFileSync(executablePath, "fixture");
  const runner = vi.fn(async (_exe: string, args: string[]) =>
    args[0] === "--version" ? "0.9.8.0" : "",
  );
  const backend = new UsbipWinBackend(
    () => settingsSchema.parse({ executablePath }),
    runner,
  );
  expect(await backend.checkAvailability()).toMatchObject({ ready: true });
  expect(runner).toHaveBeenCalledWith(executablePath, ["--version"], 10000);
  expect(await backend.listConnections()).toEqual([]);
});
it("does not detach an externally reused port with a different endpoint", async () => {
  const dir = mkdtempSync(join(tmpdir(), "remoteusb-backend-"));
  dirs.push(dir);
  const executablePath = join(dir, "usbip.exe");
  writeFileSync(executablePath, "fixture");
  const runner = vi.fn(async (_exe: string, args: string[]) =>
    args.includes("attach")
      ? "1"
      : args.includes("list")
        ? readFileSync("tests/fixtures/list.txt", "utf8")
        : readFileSync("tests/fixtures/ports.txt", "utf8").replace(
            ":4321/",
            ":5555/",
          ),
  );
  const backend = new UsbipWinBackend(
    () => settingsSchema.parse({ executablePath }),
    runner,
  );
  const server = { ...demoServers[0], port: 4321 };
  const [device] = await backend.listDevices(server);
  const connection = await backend.attach(server, device);
  await backend.detach(connection);
  expect(runner.mock.calls.some(([, args]) => args[0] === "detach")).toBe(
    false,
  );
});
