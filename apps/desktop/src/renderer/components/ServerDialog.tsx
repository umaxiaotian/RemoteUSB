import { Alert, Button, Form, Input, InputNumber, Modal } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  serverSchema,
  type UsbServer,
} from "../../../../../packages/core/models";
import type { Request, Response } from "../../../../../packages/shared/ipc";
/** Modal/Formにフォーカス管理と入力検証を任せる。 */
export function ServerDialog({
  server,
  request,
  onClose,
}: {
  server?: UsbServer;
  request: (r: Request) => Promise<Response>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<UsbServer>();
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState<{ ok: boolean; text: string }>();
  async function submit(test: boolean) {
    const parsed = serverSchema.safeParse({
      ...form.getFieldsValue(),
      id: server?.id ?? crypto.randomUUID(),
      enabled: server?.enabled ?? true,
    });
    if (!parsed.success) {
      setStatus({ ok: false, text: t("validation") });
      return;
    }
    setBusy(true);
    const result = await request({
      action: test ? "testServer" : "saveServer",
      server: parsed.data,
    });
    setBusy(false);
    if (result.ok && !test) onClose();
    else
      setStatus({
        ok: result.ok,
        text: result.ok
          ? t("testSuccess", { count: result.deviceCount ?? 0 })
          : t(result.error.code),
      });
  }
  return (
    <Modal
      open
      title={t(server ? "Edit USB Server" : "Add USB Server")}
      onCancel={onClose}
      onOk={() => void submit(false)}
      okText={t(server ? "Save" : "Add")}
      okButtonProps={{ "aria-label": t(server ? "Save" : "Add") }}
      confirmLoading={busy}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      maskClosable={!busy}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={server ?? { name: "", hostname: "", port: 3240 }}
        onFinish={() => void submit(false)}
      >
        <Form.Item name="name" label={t("Name")} required>
          <Input autoFocus maxLength={80} placeholder="HOME-SERVER" />
        </Form.Item>
        <Form.Item name="hostname" label={t("Hostname")} required>
          <Input placeholder="192.168.1.20" />
        </Form.Item>
        <Form.Item name="port" label={t("Port")} required>
          <InputNumber min={1} max={65535} />
        </Form.Item>
        {status && (
          <Alert
            role="status"
            type={status.ok ? "success" : "error"}
            title={status.text}
          />
        )}
        <Button
          aria-label={t("Test Connection")}
          loading={busy}
          onClick={() => void submit(true)}
        >
          {t("Test Connection")}
        </Button>
      </Form>
    </Modal>
  );
}
