# Windows uninstall validation

Run these checks in a disposable Windows VM with the packaged installer. The scripts require Windows PowerShell 5.1, UAC, and the real USB/IP components; the JavaScript tests do not exercise them.

| Scenario | Expected result |
| --- | --- |
| Share a device and attach it from another host, then remove all components | usbipd stops before unbind; official uninstallers complete or report a bounded failure. |
| Attach a remote device with USBip, then remove all components | Client reconnect processes stop; detach precedes driver removal; restart notice appears. |
| Make detach/unbind exceed 30 seconds | The CLI is terminated and its exit confirmed; the official uninstaller still runs. |
| Make an official uninstaller exceed five minutes | Failure displays a log path; RemoteUSB, its registration, and retry scripts remain. Restart before retrying. |
| Run per-user removal and approve UAC using an administrator account; provoke an uninstall error | The original window shows the elevated error and log path. |
| Cancel UAC | Removal fails and RemoteUSB remains available for retry. |
| A non-product-code server registry entry exists before uninstall and is removed by the official MSI | Removal succeeds; pre-uninstall registration must not cause a false failure. |
| A server registry entry genuinely survives the official MSI | Removal fails with the remaining registry path/product code and retains RemoteUSB for retry. |
| Remove the server Apps entry while keeping MSI registration | Windows Installer product discovery still finds the server. |
| Damage a client UninstallString while preserving InstallLocation or the default install directory | The existing official uninstaller is found through the fallback directory. |
| Add a stale client entry pointing at a missing executable alongside a valid entry | The valid uninstaller runs; any remaining stale registration is reported as a repair requirement. |
| Remove uninstall registration and the uninstaller but leave component files/services | Removal reports that repair/reinstallation is required rather than claiming success. |
| Remove neither component, or run an application update | Existing keep-components/update behavior is preserved. |
| Retry after a partial removal | Already removed components are skipped and remaining components can be removed. |

Do not delete driver files or service registry keys manually to simulate a successful uninstall. If the official uninstall metadata is irrecoverable, repair/reinstall the corresponding official component before retrying.
