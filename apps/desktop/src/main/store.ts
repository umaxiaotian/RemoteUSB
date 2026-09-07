import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  persistedSchema,
  type PersistedData,
} from "../../../../packages/core/models";
/** 検証済み設定を一時ファイル経由で保存し、不正な既存データを退避する。 */
export class Store {
  data: PersistedData;
  constructor(private filename: string) {
    this.data = persistedSchema.parse({});
    if (existsSync(filename)) {
      try {
        this.data = persistedSchema.parse(
          JSON.parse(readFileSync(filename, "utf8")),
        );
      } catch {
        copyFileSync(filename, `${filename}.invalid-${Date.now()}`);
      }
    }
  }
  save() {
    const validated = persistedSchema.parse(this.data);
    mkdirSync(dirname(this.filename), { recursive: true });
    writeFileSync(`${this.filename}.tmp`, JSON.stringify(validated, null, 2), {
      mode: 0o600,
    });
    renameSync(`${this.filename}.tmp`, this.filename);
  }
}
