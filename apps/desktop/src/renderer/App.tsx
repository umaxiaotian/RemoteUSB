import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Collapse,
  Flex,
  Layout,
  Menu,
  Space,
  Spin,
  Typography,
} from "antd";
import {
  Usb,
  Server,
  Link2,
  Settings2,
  Info,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRemoteUsb } from "./hooks/useRemoteUsb";
import { AppProvider } from "./components/AppProvider";
import { DeviceCard } from "./components/DeviceCard";
import { ServerCard } from "./components/ServerCard";
import { ServerDialog } from "./components/ServerDialog";
import { Welcome } from "./components/Welcome";
import { Settings } from "./pages/Settings";
import { Devices } from "./pages/Devices";
import { Connections } from "./pages/Connections";
import type {
  UsbServer,
  RemoteUsbDevice,
} from "../../../../packages/core/models";
const navigation = [
  { key: "Devices", icon: Usb, subtitle: "deviceSubtitle" },
  { key: "Servers", icon: Server, subtitle: "serverSubtitle" },
  { key: "Connections", icon: Link2, subtitle: "connectionSubtitle" },
  { key: "Settings", icon: Settings2, subtitle: "settingsSubtitle" },
  { key: "About", icon: Info, subtitle: "aboutSubtitle" },
];
/** データ取得を共有し、UIライブラリと言語設定を全画面に適用する。 */
export function App() {
  const remote = useRemoteUsb();
  return (
    <AppProvider settings={remote.snapshot?.settings}>
      <Shell remote={remote} />
    </AppProvider>
  );
}
function Shell({ remote }: { remote: ReturnType<typeof useRemoteUsb> }) {
  const { t } = useTranslation();
  const {
    snapshot: data,
    request,
    error,
    clearError,
    deviceCount,
    clearMessage,
  } = remote;
  const [page, setPage] = useState("Devices"),
    [dialog, setDialog] = useState<{ server?: UsbServer }>(),
    [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, [page]);
  if (!data)
    return (
      <div className="loading" role="status">
        <Spin />
        <span>{t("Loading")}</span>
      </div>
    );
  const open = (
    target: "guide" | "github" | "licenses" | "tools" | "sources",
  ) => {
    void request({ action: "openLink", target });
  };
  const card = (device: RemoteUsbDevice) => (
    <DeviceCard
      key={device.id}
      device={device}
      connection={data.connections.find((c) => c.deviceId === device.id)}
      autoReconnect={data.reconnect.some(
        (p) => p.device.id === device.id && p.enabled,
      )}
      waiting={data.reconnect.some(
        (p) => p.device.id === device.id && p.status === "waiting",
      )}
      technical={data.settings.technicalInfo}
      onConnect={() => {
        void request({ action: "connect", id: device.id });
      }}
      onDisconnect={() => {
        void request({ action: "disconnect", id: device.id });
      }}
      onReconnect={(enabled) => {
        void request({ action: "reconnect", id: device.id, enabled });
      }}
    />
  );
  return (
    <>
      <header className="titlebar">
        <Usb size={17} />
        <span>RemoteUSB</span>
        {data.mode === "mock" && (
          <Typography.Text type="secondary">{t("Demo mode")}</Typography.Text>
        )}
      </header>
      <Layout className="app-shell">
        <Layout.Sider
          width={228}
          breakpoint="md"
          collapsedWidth={64}
          className="sidebar"
        >
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Usb size={25} />
            </div>
            <div>
              <Typography.Text strong>RemoteUSB</Typography.Text>
              <div>
                <Typography.Text type="secondary">
                  {t("tagline")}
                </Typography.Text>
              </div>
            </div>
          </div>
          {[navigation.slice(0, 3), navigation.slice(3)].map((items, index) => (
            <Menu
              key={index}
              className={index ? "secondary-menu" : ""}
              mode="inline"
              selectedKeys={[page]}
              onClick={({ key }) => setPage(key)}
              items={items.map(({ key, icon: Icon }) => ({
                key,
                icon: <Icon size={18} />,
                label: (
                  <span>
                    {t(key)}{" "}
                    {key === "Connections" && (
                      <Badge count={data.connections.length} color="#0067c0" />
                    )}
                  </span>
                ),
              }))}
            />
          ))}
          <div className="support">
            <ShieldCheck size={18} />
            <div>
              {t("USB support")}
              <div>
                <Typography.Text type="secondary">
                  {t(
                    data.mode === "mock"
                      ? "Demo mode"
                      : data.backend.ready
                        ? "Ready"
                        : "setupRequired",
                  )}
                </Typography.Text>
              </div>
            </div>
          </div>
        </Layout.Sider>
        <Layout.Content>
          <div className="content">
            <Flex
              justify="space-between"
              align="center"
              gap={16}
              wrap
              className="page-header"
            >
              <div>
                <Typography.Title level={2}>{t(page)}</Typography.Title>
                <Typography.Text type="secondary">
                  {t(
                    navigation.find((item) => item.key === page)?.subtitle ??
                      "aboutSubtitle",
                  )}
                </Typography.Text>
              </div>
              {["Devices", "Servers"].includes(page) && (
                <Space>
                  <Button
                    icon={<RefreshCw size={16} />}
                    loading={refreshing}
                    onClick={async () => {
                      setRefreshing(true);
                      await request({ action: "refresh" });
                      setRefreshing(false);
                    }}
                  >
                    {t("Refresh")}
                  </Button>
                  <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={() => setDialog({})}
                  >
                    {t("Add Server")}
                  </Button>
                </Space>
              )}
            </Flex>
            <Space orientation="vertical" className="banners">
              {data.mode === "mock" && (
                <Alert type="info" showIcon title={t("demoBanner")} />
              )}
              {error && (
                <Alert
                  type="error"
                  showIcon
                  closable
                  onClose={clearError}
                  title={t(error.code)}
                  description={
                    <Collapse
                      ghost
                      items={[
                        {
                          key: "details",
                          label: t("Details"),
                          children: (
                            <pre>
                              {error.code}
                              {"\n"}
                              {error.details}
                            </pre>
                          ),
                        },
                      ]}
                    />
                  }
                />
              )}
              {page === "Servers" && deviceCount !== undefined && (
                <Alert
                  type="success"
                  closable
                  onClose={clearMessage}
                  title={t("testSuccess", { count: deviceCount })}
                />
              )}
              {!data.backend.ready && (
                <Alert
                  type="warning"
                  showIcon
                  title={t("setupRequired")}
                  description={t("setupHint")}
                  action={
                    <Button onClick={() => open("guide")}>
                      {t("Setup Guide")}
                    </Button>
                  }
                />
              )}
            </Space>
            {page === "Devices" && (
              <Devices data={data} card={card} onAdd={() => setDialog({})} />
            )}
            {page === "Servers" && (
              <Space orientation="vertical" className="server-list">
                {data.servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    error={data.serverErrors[server.id]}
                    onEdit={() => setDialog({ server })}
                    onRemove={() => {
                      void request({ action: "removeServer", id: server.id });
                    }}
                    onTest={() => {
                      void request({ action: "testServer", server });
                    }}
                    onToggle={() => {
                      void request({
                        action: "saveServer",
                        server: { ...server, enabled: !server.enabled },
                      });
                    }}
                  />
                ))}
                {!data.servers.length && (
                  <Alert
                    title={t("No USB servers yet")}
                    description={t("addServerHint")}
                  />
                )}
              </Space>
            )}
            {page === "Connections" && (
              <Connections
                data={data}
                card={card}
                onBrowse={() => setPage("Devices")}
                onDisconnectAll={() => {
                  void request({ action: "disconnectAll" });
                }}
              />
            )}
            {page === "Settings" && (
              <Settings
                settings={data.settings}
                mode={data.mode}
                onSave={(settings) => request({ action: "settings", settings })}
                onTools={() => open("tools")}
              />
            )}
            {page === "About" && (
              <Space orientation="vertical" size="large" className="about">
                <Usb size={48} />
                <Typography.Title level={3}>RemoteUSB</Typography.Title>
                <Typography.Text>
                  {t("Version", { version: data.version })}
                </Typography.Text>
                <Typography.Paragraph>
                  {t("aboutSubtitle")}
                </Typography.Paragraph>
                <Flex gap={8} wrap>
                  {(["github", "licenses", "sources"] as const).map(
                    (target) => (
                      <Button key={target} onClick={() => open(target)}>
                        {t(
                          target === "github"
                            ? "GitHub"
                            : target === "licenses"
                              ? "licenses"
                              : "sourceCode",
                        )}
                      </Button>
                    ),
                  )}
                </Flex>
                <Alert
                  type="info"
                  title={t("Bundled USB tools")}
                  description={t("driverNotice")}
                  action={
                    <Button onClick={() => open("tools")}>
                      {t("Open tool folder")}
                    </Button>
                  }
                />
              </Space>
            )}
          </div>
        </Layout.Content>
      </Layout>
      {dialog && (
        <ServerDialog
          server={dialog.server}
          request={request}
          onClose={() => setDialog(undefined)}
        />
      )}
      {!data.settings.welcomeComplete && (
        <Welcome data={data} request={request} />
      )}
    </>
  );
}
