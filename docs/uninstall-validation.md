# Windows uninstall validation

Run these checks in a disposable Windows VM with the packaged installer. The scripts require Windows PowerShell 5.1, UAC, and the real USB/IP components; the JavaScript tests do not exercise them.

| Scenario | Expected result |
| --- | --- |
| Share a device and attach it from another host, then remove all components | Local USBip detach/removal finishes before usbipd stops and unbinds; official uninstallers complete or report a bounded failure. Verify Windows actually completes the subsequent restart. |
| Attach a remote device with USBip, then remove all components | Client reconnect processes stop; detach precedes driver removal; restart notice appears. |
| Make detach/unbind exceed 30 seconds | The CLI is terminated and its exit confirmed; removal fails without launching that component's official uninstaller. RemoteUSB and retry scripts remain. For client failure, the server is not stopped and the upstream shutdown task remains installed. |
| Make an official uninstaller exceed five minutes | Failure displays a log path and explains that removal may still be running; it must not instruct an immediate restart. RemoteUSB, its registration, and retry scripts remain. |
| Run per-user removal and approve UAC using an administrator account; provoke an uninstall error | The original window shows the elevated error and log path. |
| Make detach/unbind return a nonzero exit code | Removal fails before that component's official uninstaller starts; repair guidance appears. |
| Remove usbip.exe but leave usbip2_ude installed | Client removal fails before the official uninstaller starts and asks for repair. |
| Attach the local client to the local server, then remove all components | Client detach/removal precedes server shutdown; Windows completes the subsequent restart. |
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

## Restart hang investigation

The previous scripts continued into driver removal even when detach/unbind failed or timed out. Killing a CLI does not establish that its kernel I/O has completed. They also advised restarting after a five-minute installer wait, although that installer was deliberately left running. Both paths now report failure instead of treating incomplete preparation as safe for removal or recommending a restart during an active removal.

The bundled `vendor/usbip-win2/source-0.9.8.0.zip` provides relevant evidence in `drivers/ude/vhci.cpp`: `vhci_query_remove` documents that open file objects can block controller removal, and that Windows does not call this callback during ordinary reboot/shutdown. `userspace/innosetup/setup.iss` removes the shutdown detach task before removing the controller. Therefore failed preparation must not enter that uninstaller. This identifies a hazardous code path, not proof of the cause of a particular Windows hang.

If restart still hangs after a successful removal, preserve `%TEMP%/RemoteUSB-*-uninstall-*.log` (the elevated account's temp directory when applicable), `C:/Windows/INF/setupapi.dev.log`, and Windows System events. Record whether USB devices were attached/shared and whether removal reported an error. A Windows kernel dump may be needed to identify the driver blocking shutdown. Real restart validation requires a disposable Windows machine; JavaScript tests cannot validate kernel shutdown behavior.
