# Windows USB sharing

The server adapter lives in `packages/usb-server`, independently of the remote USB client adapters. It uses an installed [usbipd-win](https://github.com/dorssel/usbipd-win); the official 5.3.0 MSI is bundled with its matching source, GPL license and upstream source notices. No custom driver or protocol stack is implemented. The installer provides client/server selection and executes the official setups sequentially.

- Discovery: `Program Files/usbipd-win/usbipd.exe`, then PATH.
- Listing: `usbipd state`, validated JSON. See upstream [automation documentation](https://github.com/dorssel/usbipd-win/wiki/Automation) and [Device schema](https://github.com/dorssel/usbipd-win/blob/master/Usbipd.Automation/Device.cs). State automation requires usbipd-win 2.2.0 or newer; malformed/unsupported responses are rejected.
- Only currently connected devices (non-null BusId) are shown. PersistedGuid indicates shared state; ClientIPAddress indicates an attached client. VID/PID come from InstanceId; unknown values are shown explicitly.
- Sharing: `usbipd bind --busid BUSID`; stop sharing: `usbipd unbind --busid BUSID`. Force binding and arbitrary commands are not exposed.
- IPC validates BusId and instance identity. Before mutation, the adapter refreshes and checks the device identity. A global mutation lock prevents overlapping commands, and results are refreshed and verified.
- The fixed mutation alone requests elevation through Windows UAC. Electron stays unelevated. UAC cancellation and command failure return errors. The lock remains held until the elevated operation finishes, and explicit app exit waits for sharing operations. Devices can still be unplugged during UAC; refresh after an error.
- Shared state is persistent in usbipd-win, not RemoteUSB settings. App exit does not unshare devices. A running usbipd service and appropriate network/firewall configuration are required for remote attachment; listing a shared device does not prove network reachability.

Mock mode uses a separate in-memory server backend and never invokes UAC or usbipd. Unit tests cover JSON parsing, absence, binding, unbinding, stale identity, input rejection, cancellation and post-operation verification. Electron E2E covers sharing and stop-sharing from the centered confirmation dialog. Actual Windows UAC, driver/service behavior and remote-client connections must be tested with real hardware.
