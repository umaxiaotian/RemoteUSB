import { Button, Empty, Flex, Table, Typography } from "antd";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  RemoteUsbDevice,
  Snapshot,
} from "../../../../../packages/core/models";
/** 接続一覧と履歴の表示を共通デバイスカードで構成する。 */
export function Connections({
  data,
  card,
  onBrowse,
  onDisconnectAll,
}: {
  data: Snapshot;
  card: (d: RemoteUsbDevice) => ReactNode;
  onBrowse: () => void;
  onDisconnectAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {data.connections.length ? (
        <>
          <Flex justify="end" className="section-actions">
            <Button onClick={onDisconnectAll}>{t("Disconnect all")}</Button>
          </Flex>
          <div className="device-grid">
            {data.devices
              .filter((d) => data.connections.some((c) => c.deviceId === d.id))
              .map(card)}
          </div>
        </>
      ) : (
        <Empty
          description={
            <>
              <h2>{t("No connected devices")}</h2>
              <p>{t("connectHint")}</p>
            </>
          }
        >
          <Button onClick={onBrowse}>{t("Browse devices")}</Button>
        </Empty>
      )}
      {data.reconnect
        .filter((p) => p.status === "waiting")
        .map((p) => (
          <Typography.Paragraph key={p.device.id}>
            {p.device.name} · {t("Waiting for server")}
          </Typography.Paragraph>
        ))}
      <Typography.Title level={5}>{t("Recently connected")}</Typography.Title>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={data.recent}
        locale={{ emptyText: t("noRecent") }}
        columns={[
          { title: t("Name"), dataIndex: "name" },
          {
            title: t("Servers"),
            render: (_, d) =>
              data.servers.find((s) => s.id === d.serverId)?.name ??
              t("Removed server"),
          },
        ]}
      />
    </>
  );
}
