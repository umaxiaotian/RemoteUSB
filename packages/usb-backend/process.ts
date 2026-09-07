import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { UsbBackendError } from "../core/errors";
export type Runner = (
  executable: string,
  args: string[],
  timeout: number,
) => Promise<string>;
/** shellを介さず実行し、出力・時間を制限する。実行ファイルの隣のDLLを使用する。 */
export const runProcess: Runner = (executable, args, timeout) =>
  new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        shell: false,
        windowsHide: true,
        cwd: dirname(executable),
        timeout,
        maxBuffer: 1024 * 1024,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed)
            reject(
              new UsbBackendError(
                "TIMEOUT",
                "Backend process timed out. " + stderr,
              ),
            );
          else reject(new Error(`${error.message}\n${stderr}`));
        } else resolve(`${stdout}\n${stderr}`.trim());
      },
    );
  });
