import { appendFileSync, existsSync, renameSync, statSync } from "node:fs";
export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";
/** サイズ制限と秘匿値マスキングを行うローカル診断ログ。 */
export class Logger {
  constructor(
    private path: string,
    private debug: () => boolean,
  ) {}
  write(level: LogLevel, message: string) {
    if (["DEBUG", "TRACE"].includes(level) && !this.debug()) return;
    const safe = message
      .replace(
        /(password|token|authorization|credential)\s*[:=]\s*\S+/gi,
        "$1=[redacted]",
      )
      .slice(0, 16000);
    try {
      if (existsSync(this.path) && statSync(this.path).size > 2_000_000)
        renameSync(this.path, `${this.path}.1`);
      appendFileSync(
        this.path,
        `${new Date().toISOString()} ${level} ${safe}\n`,
      );
    } catch {
      /* ログの書き込み失敗でUSB操作を中断しない。 */
    }
  }
}
