import { remove } from "./vendor-lib.mjs";
await remove(".tmp/vendor-update");
await remove(".cache/win2");
await remove(".cache/usbipd");
console.log("Temporary vendor download files removed.");
