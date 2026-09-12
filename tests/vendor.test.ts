import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  components,
  selectAsset,
  sha256,
  stableRelease,
  versionFromTag,
} from "../scripts/vendor-lib.mjs";

describe("vendor release metadata", () => {
  const release = (overrides = {}) => ({
    tag_name: "v1.2.3",
    published_at: "2026-01-01T00:00:00Z",
    draft: false,
    prerelease: false,
    assets: [],
    ...overrides,
  });

  it("selects the newest stable release and excludes prereleases", () => {
    expect(
      stableRelease([
        release({ tag_name: "v2.0.0-beta", prerelease: true }),
        release({ tag_name: "v1.2.3", published_at: "2026-01-02T00:00:00Z" }),
        release({ tag_name: "v1.2.2" }),
      ]).tag_name,
    ).toBe("v1.2.3");
  });

  it("rejects a missing or duplicate x64 asset", () => {
    const component = components.find((item) => item.name === "usbipd-win")!;
    expect(() => selectAsset(release(), component)).toThrow(/found 0/);
    expect(() =>
      selectAsset(
        release({
          assets: [
            { name: "usbipd-win_1_x64.msi" },
            { name: "usbipd-win_2_x64.msi" },
          ],
        }),
        component,
      ),
    ).toThrow(/found 2/);
  });

  it("calculates SHA-256 and normalizes release tags", () => {
    expect(sha256(Buffer.from("RemoteUSB"))).toBe(
      "ff5aa59ec14d89e20166b9d00153288338da20b135fb817e60bcc9c7f7ee8e8a",
    );
    expect(versionFromTag("v.5.3.0")).toBe("5.3.0");
  });

  it("keeps the checked-in vendor lock parseable", () => {
    const lock = JSON.parse(readFileSync("vendor-lock.json", "utf8"));
    expect(lock["usbip-win2"]).toMatchObject({
      repository: "vadimgrn/usbip-win2",
      asset: "USBip-0.9.8.0-x64.exe",
    });
    expect(lock["usbipd-win"].sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
