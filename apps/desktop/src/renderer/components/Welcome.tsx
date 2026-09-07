import { Button, Flex, Modal, Select, Typography } from "antd";
import { Usb } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Snapshot } from "../../../../../packages/core/models";
import type { Request, Response } from "../../../../../packages/shared/ipc";
/** 初回案内もModalに統一し、言語選択とフォーカス管理を提供する。 */
export function Welcome({
  data,
  request,
}: {
  data: Snapshot;
  request: (r: Request) => Promise<Response>;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  return (
    <Modal
      open={!data.settings.welcomeComplete}
      closable={false}
      footer={null}
      centered
      keyboard={false}
      maskClosable={false}
    >
      <div className="welcome">
        <Usb size={42} />
        <Typography.Title level={2}>
          {t(step ? "USB support" : "welcome")}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {t(
            !step
              ? "welcomeHint"
              : data.mode === "mock"
                ? "demoReady"
                : data.backend.ready
                  ? "backendReady"
                  : "setupHint",
          )}
        </Typography.Paragraph>
        <Select
          aria-label={t("Language")}
          value={data.settings.language}
          options={[
            { value: "system", label: t("System") },
            { value: "en", label: "English" },
            { value: "ja", label: "日本語" },
            { value: "ko", label: "한국어" },
            { value: "zh-CN", label: "简体中文" },
          ]}
          onChange={(language) => {
            void request({
              action: "settings",
              settings: { ...data.settings, language },
            });
          }}
        />
        <Flex justify="center" gap={8} wrap>
          {!step ? (
            <Button autoFocus type="primary" onClick={() => setStep(1)}>
              {t("Get Started")}
            </Button>
          ) : (
            <>
              {!data.backend.ready && (
                <>
                  <Button
                    onClick={() => {
                      void request({ action: "openLink", target: "guide" });
                    }}
                  >
                    {t("Setup Guide")}
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      void request({ action: "demo" });
                    }}
                  >
                    {t("Try Demo Mode")}
                  </Button>
                </>
              )}
              <Button
                onClick={() => {
                  void request({
                    action: "settings",
                    settings: { ...data.settings, welcomeComplete: true },
                  });
                }}
              >
                {t("Continue")}
              </Button>
            </>
          )}
        </Flex>
      </div>
    </Modal>
  );
}
