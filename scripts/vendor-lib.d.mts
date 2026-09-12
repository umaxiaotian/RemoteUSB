export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface Release {
  tag_name: string;
  published_at?: string;
  created_at?: string;
  draft: boolean;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

export interface VendorComponent {
  name: string;
  repository: string;
  directory: string;
  matches: (asset: ReleaseAsset) => boolean;
}

export const components: VendorComponent[];
export function sha256(data: Uint8Array | string): string;
export function stableRelease(releases: Release[]): Release;
export function selectAsset(
  release: Release,
  component: VendorComponent,
): ReleaseAsset;
export function readLock(): Promise<Record<string, Record<string, string>>>;
export function requestJson(url: string): Promise<unknown>;
export function download(url: string): Promise<Buffer>;
export function versionFromTag(tag: string): string;
export function assetPath(component: VendorComponent, assetName: string): string;
export function writeJson(path: string, value: unknown): Promise<void>;
export function remove(path: string): Promise<void>;
