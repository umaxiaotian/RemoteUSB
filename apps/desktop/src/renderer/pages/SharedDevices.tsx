import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Flex,
  Modal,
  Space,
  Spin,
} from "antd";
import { useTranslation } from "react-i18next";
import type {
  LocalUsbDevice,
  SharingState,
} from "../../../../../packages/usb-server/models";
import type { BackendError } from "../../../../../packages/core/models";
import type { Request, Response } from "../../../../../packages/shared/ipc";

export function SharedDevices({
  request,
}: {
  request: (r: Request) => Promise<Response>;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<SharingState>();
  const [error, setError] = useState<BackendError>();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<LocalUsbDevice>();
  const lock = useRef(false);
  const load = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await request({ action: "localDevices" });
      if (result.ok) setState(result.sharing);
      else {
        setError(result.error);
        setState(undefined);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    void load();
  }, [load]);
  const change = async () => {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await request({
        action: "shareDevice",
        busId: selected.busId,
        instanceId: selected.instanceId,
        shared: !selected.shared,
      });
      if (result.ok) setState(result.sharing);
      else {
        setError(result.error);
        setState(undefined);
      }
    } finally {
      lock.current = false;
      setBusy(false);
      setSelected(undefined);
    }
  };
  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Flex justify="end">
        <Button onClick={() => void load()} loading={busy}>
          {t("Refresh")}
        </Button>
      </Flex>
      <Alert type="info" showIcon title={t("sharingNotice")} />
      {error && (
        <Alert
          type="error"
          showIcon
          title={t("sharingFailed")}
          description={
            <>
              <p>{t(error.code)}</p>
              <Collapse
                ghost
                items={[
                  {
                    key: "details",
                    label: t("Details"),
                    children: <pre>{error.details}</pre>,
                  },
                ]}
              />
            </>
          }
        />
      )}
      {busy && !state && <Spin />}
      {state && !state.installed && (
        <Alert
          type="warning"
          showIcon
          title={t("usbipdMissing")}
          description={t("usbipdSetup")}
          action={
            <Button
              onClick={() =>
                void request({ action: "openLink", target: "serverTools" })
              }
            >
              {t("Open tool folder")}
            </Button>
          }
        />
      )}
      {state?.installed && !state.devices.length && (
        <Empty description={t("noLocalDevices")} />
      )}
      {state?.devices.map((d) => (
        <Card
          key={d.instanceId}
          role="article"
          aria-label={d.name}
          title={d.name}
        >
          <Descriptions
            size="small"
            column={2}
            items={[
              { key: "bus", label: "Bus ID", children: d.busId },
              { key: "ids", label: "VID:PID", children: `${d.vid}:${d.pid}` },
              {
                key: "state",
                label: t("Status"),
                children: (
                  <span role="status">
                    <Badge
                      status={d.shared ? "success" : "default"}
                      text={t(d.shared ? "Shared" : "Not shared")}
                    />
                  </span>
                ),
              },
              ...(d.client
                ? [
                    {
                      key: "client",
                      label: t("sharingClient"),
                      children: d.client,
                    },
                  ]
                : []),
            ]}
          />
          <Flex justify="end">
            <Button
              type={d.shared ? "default" : "primary"}
              disabled={busy}
              onClick={() => setSelected(d)}
            >
              {t(d.shared ? "Stop Sharing" : "Share")}
            </Button>
          </Flex>
        </Card>
      ))}
      <Modal
        centered
        open={!!selected}
        title={t(selected?.shared ? "Stop Sharing" : "Share")}
        okText={t(selected?.shared ? "Stop Sharing" : "Share")}
        cancelText={t("Cancel")}
        confirmLoading={busy}
        cancelButtonProps={{ disabled: busy }}
        closable={!busy}
        maskClosable={!busy}
        keyboard={!busy}
        onCancel={() => setSelected(undefined)}
        onOk={() => void change()}
      >
        <p>
          {selected?.name} ({selected?.busId})
        </p>
        <p>{t(selected?.shared ? "unshareConfirm" : "shareConfirm")}</p>
      </Modal>
    </Space>
  );
}
