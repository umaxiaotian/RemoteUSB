import { useCallback, useEffect, useState } from "react";
import type {
  BackendError,
  Snapshot,
} from "../../../../../packages/core/models";
import type {
  RemoteUsbApi,
  Request,
  Response,
} from "../../../../../packages/shared/ipc";
declare global {
  interface Window {
    remoteUsb: RemoteUsbApi;
  }
}
/** mainの更新通知を購読し、アンマウント時に購読を破棄する。 */
export function useRemoteUsb() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState<BackendError>();
  const [deviceCount, setDeviceCount] = useState<number>();
  const request = useCallback(async (input: Request): Promise<Response> => {
    try {
      const result = await window.remoteUsb.request(input);
      if (result.ok) {
        setSnapshot(result.snapshot);
        if (result.deviceCount !== undefined)
          setDeviceCount(result.deviceCount);
      } else setError(result.error);
      return result;
    } catch (cause) {
      const error: BackendError = { code: "UNKNOWN", details: String(cause) };
      setError(error);
      return { ok: false, error };
    }
  }, []);
  useEffect(() => {
    void request({ action: "snapshot" });
    return window.remoteUsb.subscribe(() => {
      void request({ action: "snapshot" });
    });
  }, [request]);
  return {
    snapshot,
    request,
    error,
    clearError: () => setError(undefined),
    deviceCount,
    clearMessage: () => setDeviceCount(undefined),
  };
}
