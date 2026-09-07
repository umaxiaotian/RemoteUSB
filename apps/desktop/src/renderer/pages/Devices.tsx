import { Badge, Button, Empty, Flex, Input, Typography } from "antd";
import { Server, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  RemoteUsbDevice,
  Snapshot,
} from "../../../../../packages/core/models";
/** サーバー別の一覧・検索・空状態を表示する。 */
export function Devices({
  data,
  card,
  onAdd,
}: {
  data: Snapshot;
  card: (d: RemoteUsbDevice) => ReactNode;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const devices = data.devices.filter((d) =>
    (d.name + " " + d.manufacturer + " " + t(d.type))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Flex
        justify="space-between"
        align="center"
        gap={16}
        wrap
        className="device-filter"
      >
        <Input
          allowClear
          prefix={<Search size={16} />}
          aria-label={t("Search devices")}
          placeholder={t("Search devices")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Typography.Text type="secondary">
          {t("deviceCount", {
            count: data.devices.length,
            connected: data.connections.length,
          })}
        </Typography.Text>
      </Flex>
      {!data.servers.length && (
        <Empty
          description={
            <>
              <h2>{t("No USB servers yet")}</h2>
              <p>{t("addServerHint")}</p>
            </>
          }
        >
          <Button type="primary" onClick={onAdd}>
            {t("Add Server")}
          </Button>
        </Empty>
      )}
      {data.servers
        .filter((s) => s.enabled)
        .map((server) => (
          <section className="device-group" key={server.id}>
            <Flex align="center" gap={10} wrap className="group-title">
              <Server size={17} />
              <Typography.Title level={5}>{server.name}</Typography.Title>
              <Badge
                status={data.serverErrors[server.id] ? "error" : "success"}
                text={t(
                  data.serverErrors[server.id]
                    ? "Offline"
                    : server.lastSeenAt
                      ? "Online"
                      : "Checking",
                )}
              />
              <Typography.Text type="secondary" className="server-host">
                {server.hostname}
              </Typography.Text>
            </Flex>
            <div className="device-grid">
              {devices.filter((d) => d.serverId === server.id).map(card)}
            </div>
            {!devices.some((d) => d.serverId === server.id) && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t(
                  search
                    ? "noMatches"
                    : (data.serverErrors[server.id]?.code ??
                        "No shared USB devices"),
                )}
              />
            )}
          </section>
        ))}
      {data.servers.length > 0 && data.servers.every((s) => !s.enabled) && (
        <Empty description={t("allDisabled")} />
      )}
    </>
  );
}
