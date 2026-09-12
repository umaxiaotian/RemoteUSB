import type { BackendError, UsbBackendErrorCode } from "./models";
/** OS・CLIのエラーを安全な通信モデルに変換する。 */
export class UsbBackendError extends Error {
  constructor(
    public code: UsbBackendErrorCode,
    message: string,
  ) {
    super(message);
  }
}
/** 診断情報はDetails専用とし、通常の通知ではコードだけを使用する。 */
export function mapError(
  error: unknown,
  fallback: UsbBackendErrorCode = "UNKNOWN",
): BackendError {
  if (error instanceof UsbBackendError)
    return { code: error.code, details: error.message };
  const details = error instanceof Error ? error.message : String(error);
  const code = /ENOENT|not recognized/i.test(details)
    ? "BACKEND_NOT_FOUND"
    : /access.*denied|EACCES|EPERM|permission/i.test(details)
      ? "PERMISSION_DENIED"
      : /timeout|timed out|ETIMEDOUT/i.test(details)
        ? "TIMEOUT"
        : /busy|already attached|already used bus/i.test(details)
          ? "DEVICE_BUSY"
          : /non-existent bus|device not found by bus id|device not available/i.test(
                details,
              )
            ? "DEVICE_NOT_FOUND"
            : /vhci|virtual.*driver/i.test(details)
              ? "DRIVER_NOT_INSTALLED"
              : /refused|unreachable|resolve|connect to|connect a remote|ECONN/i.test(
                    details,
                  )
                ? "SERVER_UNREACHABLE"
                : fallback;
  return { code, details: details.slice(0, 8000) };
}
