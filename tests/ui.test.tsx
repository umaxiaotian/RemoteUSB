// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render as renderRaw,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider } from "../apps/desktop/src/renderer/components/AppProvider";
import "@testing-library/jest-dom/vitest";
import { DeviceCard } from "../apps/desktop/src/renderer/components/DeviceCard";
import { ServerCard } from "../apps/desktop/src/renderer/components/ServerCard";
import { App } from "../apps/desktop/src/renderer/App";
import {
  demoServers,
  MockUsbBackend,
} from "../packages/usb-backend/mock-backend";
import {
  settingsSchema,
  type RemoteUsbDevice,
  type Snapshot,
} from "../packages/core/models";
const device: RemoteUsbDevice = {
  id: "home:1-1",
  serverId: "home",
  busId: "1-1",
  name: "USB Serial CH340",
  manufacturer: "QinHeng",
  type: "Serial",
  vid: "1a86",
  pid: "7523",
  state: "Available",
};
beforeAll(() => {
  window.matchMedia = vi
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
});
const render = (node: ReactNode) =>
  renderRaw(node, {
    wrapper: ({ children }) => (
      <AppProvider settings={settingsSchema.parse({ language: "en" })}>
        {children}
      </AppProvider>
    ),
  });
afterEach(cleanup);
it("renders accessible device action and connecting state", () => {
  const onConnect = vi.fn();
  const props = {
    device,
    autoReconnect: false,
    technical: false,
    onConnect,
    onDisconnect: vi.fn(),
    onReconnect: vi.fn(),
  };
  const view = render(<DeviceCard {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));
  expect(onConnect).toHaveBeenCalledOnce();
  view.rerender(
    <DeviceCard {...props} device={{ ...device, state: "Connecting" }} />,
  );
  expect(screen.getByRole("button", { name: /Connecting/ })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Connecting");
});
it("keeps raw errors in technical details and offers retry", () => {
  render(
    <DeviceCard
      device={{
        ...device,
        state: "Error",
        error: { code: "ATTACH_FAILED", details: "raw backend output" },
      }}
      autoReconnect={false}
      technical={false}
      onConnect={vi.fn()}
      onDisconnect={vi.fn()}
      onReconnect={vi.fn()}
    />,
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("raw backend output");
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
});
it("renders server controls", () => {
  const onToggle = vi.fn();
  render(
    <ServerCard
      server={demoServers[0]}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
      onTest={vi.fn()}
      onToggle={onToggle}
    />,
  );
  fireEvent.click(screen.getByRole("switch"));
  expect(onToggle).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Test Connection" })).toBeVisible();
});
it("shows loading and empty states", async () => {
  let complete: (value: { ok: true; snapshot: Snapshot }) => void = () => {};
  window.remoteUsb = {
    request: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
    subscribe: () => () => {},
  };
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  const settings = settingsSchema.parse({ welcomeComplete: true });
  const backend = await new MockUsbBackend(() => settings).checkAvailability();
  complete({
    ok: true,
    snapshot: {
      servers: [],
      devices: [],
      connections: [],
      settings,
      backend,
      mode: "mock",
      version: "0.1.0",
      reconnect: [],
      recent: [],
      serverErrors: {},
    },
  });
  expect(await screen.findByText("No USB servers yet")).toBeVisible();
});
